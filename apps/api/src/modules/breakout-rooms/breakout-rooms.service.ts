import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { LivekitService } from "../livekit/livekit.service";
import {
    CreateBreakoutRoomsDto,
    UpdateBreakoutRoomDto,
    AssignParticipantsDto,
} from "./dto/breakout-room.dto";

const WORDS = [
    "alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel",
    "india", "juliet", "kilo", "lima", "mike", "november", "oscar", "papa",
];

function genRoomName() {
    return [0, 1, 2]
        .map(() => WORDS[Math.floor(Math.random() * WORDS.length)])
        .join("-");
}

@Injectable()
export class BreakoutRoomsService {
    private readonly logger = new Logger(BreakoutRoomsService.name);

    constructor(
        private prisma: PrismaService,
        private livekit: LivekitService,
    ) { }

    private async assertHost(meetingId: string, userId: string) {
        const meeting = await this.prisma.meeting.findUnique({
            where: { id: meetingId },
            select: { id: true, hostId: true },
        });
        if (!meeting) throw new NotFoundException("Meeting not found");
        if (meeting.hostId !== userId) throw new ForbiddenException("Only the host can manage breakout rooms");
        return meeting;
    }

    async listRooms(meetingId: string) {
        return this.prisma.breakoutRoom.findMany({
            where: { meetingId },
            include: {
                participants: {
                    include: {
                        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
                    },
                },
            },
            orderBy: { createdAt: "asc" },
        });
    }

    async createRooms(meetingId: string, userId: string, dto: CreateBreakoutRoomsDto) {
        await this.assertHost(meetingId, userId);

        const existing = await this.prisma.breakoutRoom.count({ where: { meetingId } });
        if (existing + dto.names.length > 50) {
            throw new BadRequestException("Maximum 50 breakout rooms per meeting");
        }

        const endsAt = dto.durationMinutes
            ? new Date(Date.now() + dto.durationMinutes * 60_000)
            : undefined;

        const rooms = await Promise.all(
            dto.names.map((name) =>
                this.prisma.breakoutRoom.create({
                    data: { meetingId, name, roomName: genRoomName(), endsAt },
                })
            )
        );

        if (dto.autoAssign) {
            await this.autoAssignParticipants(meetingId, rooms.map((r) => r.id));
        }

        return this.listRooms(meetingId);
    }

    async updateRoom(
        meetingId: string,
        roomId: string,
        userId: string,
        dto: UpdateBreakoutRoomDto,
    ) {
        await this.assertHost(meetingId, userId);

        const room = await this.prisma.breakoutRoom.findUnique({ where: { id: roomId } });
        if (!room || room.meetingId !== meetingId) throw new NotFoundException("Breakout room not found");

        return this.prisma.breakoutRoom.update({
            where: { id: roomId },
            data: {
                ...(dto.name && { name: dto.name }),
                ...(dto.endsAt && { endsAt: new Date(dto.endsAt) }),
            },
        });
    }

    async deleteRoom(meetingId: string, roomId: string, userId: string) {
        await this.assertHost(meetingId, userId);

        const room = await this.prisma.breakoutRoom.findUnique({ where: { id: roomId } });
        if (!room || room.meetingId !== meetingId) throw new NotFoundException("Breakout room not found");

        // Unassign participants first
        await this.prisma.participant.updateMany({
            where: { breakoutRoomId: roomId },
            data: { breakoutRoomId: null },
        });

        try {
            await this.livekit.deleteRoom(room.roomName);
        } catch {
            // Room may not be active
        }

        await this.prisma.breakoutRoom.delete({ where: { id: roomId } });
    }

    async assignParticipants(
        meetingId: string,
        roomId: string,
        userId: string,
        dto: AssignParticipantsDto,
    ) {
        await this.assertHost(meetingId, userId);

        const room = await this.prisma.breakoutRoom.findUnique({ where: { id: roomId } });
        if (!room || room.meetingId !== meetingId) throw new NotFoundException("Breakout room not found");

        await this.prisma.participant.updateMany({
            where: { id: { in: dto.participantIds }, meetingId },
            data: { breakoutRoomId: roomId },
        });

        return this.listRooms(meetingId);
    }

    async startAll(meetingId: string, userId: string) {
        await this.assertHost(meetingId, userId);

        const rooms = await this.prisma.breakoutRoom.findMany({ where: { meetingId } });
        if (rooms.length === 0) throw new BadRequestException("No breakout rooms to start");

        const meeting = await this.prisma.meeting.findUnique({
            where: { id: meetingId },
            select: { hostId: true },
        });

        // Retrieve assigned participants for each room and generate tokens
        const results = await Promise.all(
            rooms.map(async (room) => {
                const participants = await this.prisma.participant.findMany({
                    where: { breakoutRoomId: room.id },
                    include: { user: { select: { id: true, name: true } } },
                });

                const tokens = await Promise.all(
                    participants.map(async (p) => {
                        const identity = p.userId ?? p.id;
                        const name = p.user?.name ?? p.guestName ?? "Guest";
                        const isHost = p.userId === meeting?.hostId;
                        const token = await this.livekit.createToken(
                            room.roomName,
                            identity,
                            name,
                            { isHost, canPublish: true, canSubscribe: true },
                        );
                        return { participantId: p.id, token };
                    })
                );

                return { roomId: room.id, roomName: room.roomName, tokens };
            })
        );

        return results;
    }

    async endAll(meetingId: string, userId: string) {
        await this.assertHost(meetingId, userId);

        const rooms = await this.prisma.breakoutRoom.findMany({ where: { meetingId } });

        await Promise.all(
            rooms.map(async (room) => {
                try {
                    await this.livekit.deleteRoom(room.roomName);
                } catch {
                    // Room may not be active
                }
            })
        );

        // Unassign all participants
        await this.prisma.participant.updateMany({
            where: { meeting: { id: meetingId }, breakoutRoomId: { not: null } },
            data: { breakoutRoomId: null },
        });

        await this.prisma.breakoutRoom.deleteMany({ where: { meetingId } });

        return { ended: rooms.length };
    }

    private async autoAssignParticipants(meetingId: string, roomIds: string[]) {
        const participants = await this.prisma.participant.findMany({
            where: { meetingId, role: { not: "HOST" } },
            select: { id: true },
        });

        await Promise.all(
            participants.map((p, i) =>
                this.prisma.participant.update({
                    where: { id: p.id },
                    data: { breakoutRoomId: roomIds[i % roomIds.length] },
                })
            )
        );
    }
}
