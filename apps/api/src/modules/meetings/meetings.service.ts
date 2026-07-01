import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { LivekitService } from "../livekit/livekit.service";
import { CreateMeetingDto, UpdateMeetingDto, JoinMeetingDto } from "./dto/meeting.dto";
import { EmailService } from "../email/email.service";

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
    private readonly logger = new Logger(MeetingsService.name);

    constructor(
        private prisma: PrismaService,
        private redis: RedisService,
        private livekit: LivekitService,
        private email: EmailService,
    ) { }

    async create(userId: string, dto: CreateMeetingDto) {
        const roomName = generateRoomName();
        const passcode = dto.passcode || (dto.waitingRoom ? generatePasscode() : null);
        const isRecurring = dto.type === "RECURRING" && dto.recurrenceRule && dto.scheduledStart;

        const meeting = await this.prisma.meeting.create({
            data: {
                title: dto.title,
                description: dto.description,
                scheduledStart: dto.scheduledStart,
                scheduledEnd: dto.scheduledEnd,
                type: dto.type || "INSTANT",
                passcode,
                waitingRoom: dto.waitingRoom || false,
                recurrenceRule: isRecurring ? (dto.recurrenceRule as object) : undefined,
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
                childMeetings: true,
            },
        });

        // If instant meeting, set status to waiting
        if (dto.type === "INSTANT" || !dto.scheduledStart) {
            await this.prisma.meeting.update({
                where: { id: meeting.id },
                data: { status: "WAITING" },
            });
        }

        // Generate child occurrences for recurring meetings
        if (isRecurring && dto.recurrenceRule && dto.scheduledStart) {
            await this.createRecurringInstances(meeting.id, userId, dto);
        }

        // Send confirmation email to host if they have email notifications enabled
        this.sendMeetingConfirmationEmail(meeting, meeting.host).catch((err) =>
            this.logger.error("Failed to send meeting confirmation email", err),
        );

        return meeting;
    }

    private async sendMeetingConfirmationEmail(
        meeting: { id: string; title: string; scheduledStart: Date | null; passcode: string | null },
        host: { id: string; email: string; name: string | null },
    ): Promise<void> {
        const settings = await this.prisma.userSettings.findUnique({ where: { userId: host.id } });
        if (!settings?.emailNotifications) return;

        await this.email.sendMeetingConfirmation({
            to: host.email,
            recipientName: host.name,
            meetingTitle: meeting.title,
            meetingId: meeting.id,
            scheduledStart: meeting.scheduledStart ?? undefined,
            passcode: meeting.passcode ?? undefined,
            isHost: true,
        });
    }

    private async createRecurringInstances(
        parentId: string,
        userId: string,
        dto: CreateMeetingDto,
    ) {
        const rule = dto.recurrenceRule!;
        const frequency = rule.frequency;
        const interval = rule.interval ?? 1;
        const count = rule.count ?? 4;

        const baseStart = new Date(dto.scheduledStart!);
        const duration =
            dto.scheduledEnd
                ? new Date(dto.scheduledEnd).getTime() - baseStart.getTime()
                : 60 * 60 * 1000; // default 1 hour

        const instances = [];
        for (let i = 1; i < count; i++) {
            const start = new Date(baseStart);
            if (frequency === "daily") start.setDate(start.getDate() + i * interval);
            else if (frequency === "weekly") start.setDate(start.getDate() + i * interval * 7);
            else if (frequency === "monthly") start.setMonth(start.getMonth() + i * interval);

            const end = new Date(start.getTime() + duration);

            instances.push({
                title: dto.title,
                description: dto.description,
                scheduledStart: start,
                scheduledEnd: end,
                type: "RECURRING" as const,
                passcode: dto.passcode,
                waitingRoom: dto.waitingRoom || false,
                hostId: userId,
                roomName: generateRoomName(),
                parentMeetingId: parentId,
                participants: {
                    create: { userId, role: "HOST" as const },
                },
            });
        }

        await Promise.all(instances.map((data) => this.prisma.meeting.create({ data })));
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
            ...(status && { status: status as "SCHEDULED" | "WAITING" | "IN_PROGRESS" | "ENDED" | "CANCELLED" }),
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
                passcode: true,
                host: {
                    select: { name: true },
                },
            },
        });

        if (!meeting) {
            throw new NotFoundException("Meeting not found");
        }

        return {
            id: meeting.id,
            title: meeting.title,
            roomName: meeting.roomName,
            host: meeting.host,
            requiresPasscode: !!meeting.passcode,
        };
    }

    async getOccurrences(id: string, userId: string) {
        const meeting = await this.prisma.meeting.findUnique({
            where: { id },
            select: { id: true, parentMeetingId: true, type: true, hostId: true },
        });

        if (!meeting) throw new NotFoundException("Meeting not found");

        // Resolve series root
        const rootId = meeting.parentMeetingId ?? meeting.id;

        const occurrences = await this.prisma.meeting.findMany({
            where: {
                OR: [{ id: rootId }, { parentMeetingId: rootId }],
            },
            select: {
                id: true,
                title: true,
                scheduledStart: true,
                scheduledEnd: true,
                status: true,
                roomName: true,
            },
            orderBy: { scheduledStart: "asc" },
        });

        return occurrences;
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

        // Get or create participant — resolve name/identity in each branch to keep types clean
        let participantId: string;
        let participantName: string;
        let participantIdentity: string;
        let participantRole: string;
        const isHostJoining = userId && meeting.hostId === userId;
        // Participants go to waiting room unless they are the host or waiting room is disabled
        const sendToWaiting = meeting.waitingRoom && !isHostJoining;

        if (userId) {
            const p = await this.prisma.participant.upsert({
                where: { meetingId_userId: { meetingId: id, userId } },
                create: {
                    meetingId: id,
                    userId,
                    role: isHostJoining ? "HOST" : "ATTENDEE",
                    isWaiting: sendToWaiting,
                    joinedAt: sendToWaiting ? undefined : new Date(),
                },
                update: {
                    isWaiting: sendToWaiting,
                    joinedAt: sendToWaiting ? undefined : new Date(),
                    leftAt: null,
                },
                include: {
                    user: { select: { id: true, name: true, email: true, avatarUrl: true } },
                },
            });
            participantId = p.id;
            participantName = p.user?.name ?? "User";
            participantIdentity = p.userId ?? p.id;
            participantRole = p.role;
        } else {
            if (!dto.guestName) {
                throw new BadRequestException("Guest name is required");
            }
            const p = await this.prisma.participant.create({
                data: {
                    meetingId: id,
                    guestName: dto.guestName,
                    guestEmail: dto.guestEmail,
                    role: "ATTENDEE",
                    isWaiting: sendToWaiting,
                    joinedAt: sendToWaiting ? undefined : new Date(),
                    inviteToken: crypto.randomUUID(),
                },
            });
            participantId = p.id;
            participantName = p.guestName ?? "Guest";
            participantIdentity = p.id;
            participantRole = p.role;
        }

        // If participant is in waiting room, return early — no LiveKit token yet
        if (sendToWaiting) {
            return {
                status: "waiting" as const,
                meeting: { id: meeting.id, title: meeting.title, roomName: meeting.roomName },
                participant: { id: participantId, name: participantName, role: participantRole },
            };
        }

        // Update meeting status if first admitted participant
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
        const isHost = participantRole === "HOST" || participantRole === "COHOST";

        const token = await this.livekit.createToken(
            meeting.roomName,
            participantIdentity,
            participantName,
            {
                isHost,
                canPublish: true,
                canSubscribe: true,
                metadata: JSON.stringify({
                    participantId,
                    role: participantRole,
                }),
            }
        );

        return {
            status: "admitted" as const,
            meeting: {
                id: meeting.id,
                title: meeting.title,
                roomName: meeting.roomName,
            },
            participant: {
                id: participantId,
                name: participantName,
                role: participantRole,
            },
            token,
            livekitUrl: process.env.LIVEKIT_URL || "ws://localhost:7880",
        };
    }

    async listWaiting(meetingId: string, hostUserId: string) {
        const meeting = await this.prisma.meeting.findUnique({
            where: { id: meetingId },
            select: { hostId: true },
        });
        if (!meeting) throw new NotFoundException("Meeting not found");
        if (meeting.hostId !== hostUserId) throw new ForbiddenException("Only the host can view the waiting room");

        return this.prisma.participant.findMany({
            where: { meetingId, isWaiting: true },
            include: {
                user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            },
            orderBy: { createdAt: "asc" },
        });
    }

    async admitParticipant(meetingId: string, participantId: string, hostUserId: string) {
        const meeting = await this.prisma.meeting.findUnique({
            where: { id: meetingId },
        });
        if (!meeting) throw new NotFoundException("Meeting not found");
        if (meeting.hostId !== hostUserId) throw new ForbiddenException("Only the host can admit participants");

        const participant = await this.prisma.participant.findUnique({
            where: { id: participantId },
            include: { user: { select: { id: true, name: true } } },
        });
        if (!participant || participant.meetingId !== meetingId) {
            throw new NotFoundException("Participant not found");
        }

        await this.prisma.participant.update({
            where: { id: participantId },
            data: { isWaiting: false, joinedAt: new Date() },
        });

        // Update meeting status
        if (meeting.status === "SCHEDULED" || meeting.status === "WAITING") {
            await this.prisma.meeting.update({
                where: { id: meetingId },
                data: { status: "IN_PROGRESS", actualStart: meeting.actualStart || new Date() },
            });
        }

        const identity = participant.userId ?? participant.id;
        const name = participant.user?.name ?? participant.guestName ?? "Guest";
        const isHost = participant.role === "HOST" || participant.role === "COHOST";

        const token = await this.livekit.createToken(meeting.roomName, identity, name, {
            isHost,
            canPublish: true,
            canSubscribe: true,
            metadata: JSON.stringify({ participantId, role: participant.role }),
        });

        return {
            participantId,
            token,
            livekitUrl: process.env.LIVEKIT_URL || "ws://localhost:7880",
        };
    }

    async denyParticipant(meetingId: string, participantId: string, hostUserId: string) {
        const meeting = await this.prisma.meeting.findUnique({
            where: { id: meetingId },
            select: { id: true, hostId: true },
        });
        if (!meeting) throw new NotFoundException("Meeting not found");
        if (meeting.hostId !== hostUserId) throw new ForbiddenException("Only the host can deny participants");

        const participant = await this.prisma.participant.findUnique({ where: { id: participantId } });
        if (!participant || participant.meetingId !== meetingId) {
            throw new NotFoundException("Participant not found");
        }

        await this.prisma.participant.delete({ where: { id: participantId } });
        return { denied: participantId };
    }

    async admitAll(meetingId: string, hostUserId: string) {
        const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
        if (!meeting) throw new NotFoundException("Meeting not found");
        if (meeting.hostId !== hostUserId) throw new ForbiddenException("Only the host can admit participants");

        const waiting = await this.prisma.participant.findMany({
            where: { meetingId, isWaiting: true },
            include: { user: { select: { id: true, name: true } } },
        });

        await this.prisma.participant.updateMany({
            where: { meetingId, isWaiting: true },
            data: { isWaiting: false, joinedAt: new Date() },
        });

        if (waiting.length > 0 && (meeting.status === "SCHEDULED" || meeting.status === "WAITING")) {
            await this.prisma.meeting.update({
                where: { id: meetingId },
                data: { status: "IN_PROGRESS", actualStart: meeting.actualStart || new Date() },
            });
        }

        const tokens = await Promise.all(
            waiting.map(async (p) => {
                const identity = p.userId ?? p.id;
                const name = p.user?.name ?? p.guestName ?? "Guest";
                const token = await this.livekit.createToken(meeting.roomName, identity, name, {
                    isHost: false,
                    canPublish: true,
                    canSubscribe: true,
                    metadata: JSON.stringify({ participantId: p.id, role: p.role }),
                });
                return { participantId: p.id, token };
            })
        );

        return { admitted: waiting.length, tokens, livekitUrl: process.env.LIVEKIT_URL || "ws://localhost:7880" };
    }

    async checkAdmissionStatus(meetingId: string, participantId: string) {
        const participant = await this.prisma.participant.findUnique({
            where: { id: participantId },
            select: { isWaiting: true, meetingId: true },
        });
        if (!participant || participant.meetingId !== meetingId) {
            throw new NotFoundException("Participant not found");
        }
        return { isWaiting: participant.isWaiting };
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
                await this.livekit.stopRecording(egress.egressId);
            } catch (error) {
                this.logger.warn(`Failed to stop egress: ${(error as Error).message}`);
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
                egressId: egress.egressId,
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
