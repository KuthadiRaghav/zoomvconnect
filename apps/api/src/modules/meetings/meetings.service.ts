import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { LivekitService } from "../livekit/livekit.service";
import { CreateMeetingDto, UpdateMeetingDto, JoinMeetingDto } from "./dto/meeting.dto";

// Inline utility functions
function generatePasscode(length: number = 6): string {
    const chars = "0123456789";
    let passcode = "";
    for (let i = 0; i < length; i++) {
        passcode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return passcode;
}

const words = [
    "alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel",
    "india", "juliet", "kilo", "lima", "mike", "november", "oscar", "papa",
];

function generateRoomName(): string {
    const segments = [
        words[Math.floor(Math.random() * words.length)],
        words[Math.floor(Math.random() * words.length)],
        words[Math.floor(Math.random() * words.length)],
    ];
    return segments.join("-").toLowerCase();
}

@Injectable()
export class MeetingsService {
    constructor(
        private prisma: PrismaService,
        private redis: RedisService,
        private livekit: LivekitService
    ) { }

    async create(userId: string, dto: CreateMeetingDto) {
        const roomName = generateRoomName();
        const passcode = dto.passcode || (dto.waitingRoom ? generatePasscode() : null);

        const meeting = await this.prisma.meeting.create({
            data: {
                title: dto.title,
                description: dto.description,
                scheduledStart: dto.scheduledStart,
                scheduledEnd: dto.scheduledEnd,
                type: dto.type || "INSTANT",
                passcode,
                waitingRoom: dto.waitingRoom || false,
                hostId: userId,
                roomName,
                participants: {
                    create: {
                        userId,
                        role: "HOST",
                    },
                },
            },
            include: {
                host: {
                    select: { id: true, name: true, email: true, avatarUrl: true },
                },
            },
        });

        // If instant meeting, set status to waiting
        if (dto.type === "INSTANT" || !dto.scheduledStart) {
            await this.prisma.meeting.update({
                where: { id: meeting.id },
                data: { status: "WAITING" },
            });
        }

        return meeting;
    }

    async findAll(userId: string, options: { status?: string; page?: number; limit?: number } = {}) {
        const { status } = options;
        const page = Number(options.page) || 1;
        const limit = Number(options.limit) || 20;

        const where = {
            OR: [
                { hostId: userId },
                { participants: { some: { userId } } },
            ],
            ...(status && { status: status as any }),
        };

        const [meetings, total] = await Promise.all([
            this.prisma.meeting.findMany({
                where,
                include: {
                    host: {
                        select: { id: true, name: true, email: true, avatarUrl: true },
                    },
                    _count: { select: { participants: true } },
                },
                orderBy: { scheduledStart: "asc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.meeting.count({ where }),
        ]);

        return {
            items: meetings,
            total,
            page,
            pageSize: limit,
            hasMore: page * limit < total,
        };
    }

    async lookupMeeting(alias: string) {
        const meeting = await this.prisma.meeting.findFirst({
            where: {
                OR: [
                    { id: alias },
                    { roomName: alias },
                ],
            },
            select: {
                id: true,
                title: true,
                roomName: true,
                host: {
                    select: { name: true }
                }
            }
        });

        if (!meeting) {
            throw new NotFoundException("Meeting not found");
        }

        return meeting;
    }

    async getRecordings(userId: string) {
        return this.prisma.recording.findMany({
            where: {
                meeting: {
                    OR: [
                        { hostId: userId },
                        { participants: { some: { userId } } }
                    ]
                }
            },
            include: {
                meeting: {
                    select: {
                        id: true,
                        title: true,
                        scheduledStart: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async findOne(id: string, userId: string) {
        const meeting = await this.prisma.meeting.findUnique({
            where: { id },
            include: {
                host: {
                    select: { id: true, name: true, email: true, avatarUrl: true },
                },
                participants: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true, avatarUrl: true },
                        },
                    },
                },
                breakoutRooms: true,
            },
        });

        if (!meeting) {
            throw new NotFoundException("Meeting not found");
        }

        return meeting;
    }

    async update(id: string, userId: string, dto: UpdateMeetingDto) {
        const meeting = await this.prisma.meeting.findUnique({
            where: { id },
        });

        if (!meeting) {
            throw new NotFoundException("Meeting not found");
        }

        if (meeting.hostId !== userId) {
            throw new ForbiddenException("Only the host can update the meeting");
        }

        return this.prisma.meeting.update({
            where: { id },
            data: dto,
        });
    }

    async delete(id: string, userId: string) {
        const meeting = await this.prisma.meeting.findUnique({
            where: { id },
        });

        if (!meeting) {
            throw new NotFoundException("Meeting not found");
        }

        if (meeting.hostId !== userId) {
            throw new ForbiddenException("Only the host can delete the meeting");
        }

        // End the LiveKit room if active
        try {
            await this.livekit.deleteRoom(meeting.roomName);
        } catch (error) {
            // Room may not exist
        }

        await this.prisma.meeting.update({
            where: { id },
            data: { status: "CANCELLED" },
        });
    }

    async join(id: string, userId: string, dto: JoinMeetingDto) {
        const meeting = await this.prisma.meeting.findUnique({
            where: { id },
            include: {
                participants: true,
            },
        });

        if (!meeting) {
            throw new NotFoundException("Meeting not found");
        }

        if (meeting.status === "ENDED" || meeting.status === "CANCELLED") {
            throw new BadRequestException("Meeting has ended");
        }

        // Check passcode
        if (meeting.passcode && meeting.passcode !== dto.passcode) {
            throw new ForbiddenException("Invalid passcode");
        }

        // Get or create participant
        let participant;
        if (userId) {
            participant = await this.prisma.participant.upsert({
                where: {
                    meetingId_userId: { meetingId: id, userId },
                },
                create: {
                    meetingId: id,
                    userId,
                    role: meeting.hostId === userId ? "HOST" : "ATTENDEE",
                    joinedAt: new Date(),
                },
                update: {
                    joinedAt: new Date(),
                    leftAt: null,
                },
                include: {
                    user: {
                        select: { id: true, name: true, email: true, avatarUrl: true },
                    },
                },
            });
        } else {
            // Guest participant
            if (!dto.guestName) {
                throw new BadRequestException("Guest name is required");
            }

            participant = await this.prisma.participant.create({
                data: {
                    meetingId: id,
                    guestName: dto.guestName,
                    guestEmail: dto.guestEmail,
                    role: "ATTENDEE",
                    joinedAt: new Date(),
                    inviteToken: crypto.randomUUID(),
                },
            }) as any;
        }

        // Update meeting status if first participant
        if (meeting.status === "SCHEDULED" || meeting.status === "WAITING") {
            await this.prisma.meeting.update({
                where: { id },
                data: {
                    status: "IN_PROGRESS",
                    actualStart: meeting.actualStart || new Date(),
                },
            });
        }

        // Generate LiveKit token
        const participantName =
            (participant as any).user?.name || participant.guestName || "Guest";
        const participantIdentity = participant.userId || participant.id;
        const isHost = participant.role === "HOST" || participant.role === "COHOST";

        const token = await this.livekit.createToken(
            meeting.roomName,
            participantIdentity,
            participantName,
            {
                isHost,
                canPublish: true,
                canSubscribe: true,
                metadata: JSON.stringify({
                    participantId: participant.id,
                    role: participant.role,
                }),
            }
        );

        return {
            meeting: {
                id: meeting.id,
                title: meeting.title,
                roomName: meeting.roomName,
            },
            participant: {
                id: participant.id,
                name: participantName,
                role: participant.role,
            },
            token,
            livekitUrl: process.env.LIVEKIT_URL || "ws://localhost:7880",
        };
    }

    async leave(id: string, participantId: string) {
        await this.prisma.participant.update({
            where: { id: participantId },
            data: { leftAt: new Date() },
        });
    }

    async end(id: string, userId: string) {
        const meeting = await this.prisma.meeting.findUnique({
            where: { id },
        });

        if (!meeting) {
            throw new NotFoundException("Meeting not found");
        }

        if (meeting.hostId !== userId) {
            throw new ForbiddenException("Only the host can end the meeting");
        }

        // Stop all egress (recordings)
        const egresses = await this.livekit.listEgress(meeting.roomName);
        for (const egress of egresses) {
            try {
                await this.livekit.stopRecording((egress as any).egressId);
            } catch (error) {
                console.error("Failed to stop egress:", error);
            }
        }

        // Delete LiveKit room
        try {
            await this.livekit.deleteRoom(meeting.roomName);
        } catch (error) {
            // Room may already be deleted
        }

        // Update meeting
        return this.prisma.meeting.update({
            where: { id },
            data: {
                status: "ENDED",
                actualEnd: new Date(),
            },
        });
    }

    async startRecording(id: string, userId: string) {
        const meeting = await this.prisma.meeting.findUnique({
            where: { id },
        });

        if (!meeting) {
            throw new NotFoundException("Meeting not found");
        }

        const participant = await this.prisma.participant.findFirst({
            where: { meetingId: id, userId },
        });

        if (!participant || (participant.role !== "HOST" && participant.role !== "COHOST")) {
            throw new ForbiddenException("Only host or co-host can start recording");
        }

        const egress = await this.livekit.startRecording(meeting.roomName);

        if (!egress) {
            throw new BadRequestException("Failed to start recording");
        }

        // Create recording record
        const recording = await this.prisma.recording.create({
            data: {
                meetingId: id,
                status: "PROCESSING",
                egressId: (egress as any).egressId,
            },
        });

        return recording;
    }

    async stopRecording(id: string, recordingId: string, userId: string) {
        const meeting = await this.prisma.meeting.findUnique({
            where: { id },
        });

        if (!meeting) {
            throw new NotFoundException("Meeting not found");
        }

        const participant = await this.prisma.participant.findFirst({
            where: { meetingId: id, userId },
        });

        if (!participant || (participant.role !== "HOST" && participant.role !== "COHOST")) {
            throw new ForbiddenException("Only host or co-host can stop recording");
        }

        const recording = await this.prisma.recording.findUnique({
            where: { id: recordingId },
        });

        if (!recording || !recording.egressId) {
            throw new NotFoundException("Recording not found");
        }

        await this.livekit.stopRecording(recording.egressId);

        return this.prisma.recording.update({
            where: { id: recordingId },
            data: { status: "PENDING" },
        });
    }
}
