import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class RecordingsService {
    constructor(private prisma: PrismaService) { }

    async findAll(userId: string, options: { page?: number; limit?: number } = {}) {
        const { page = 1, limit = 20 } = options;

        const where = {
            meeting: {
                OR: [
                    { hostId: userId },
                    { participants: { some: { userId } } },
                ],
            },
            status: "READY" as const,
        };

        const [recordings, total] = await Promise.all([
            this.prisma.recording.findMany({
                where,
                include: {
                    meeting: {
                        select: { id: true, title: true, scheduledStart: true },
                    },
                    transcript: {
                        select: { summary: true, keywords: true },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.recording.count({ where }),
        ]);

        return {
            items: recordings,
            total,
            page,
            pageSize: limit,
            hasMore: page * limit < total,
        };
    }

    async findOne(id: string, userId: string) {
        const recording = await this.prisma.recording.findUnique({
            where: { id },
            include: {
                meeting: {
                    include: {
                        host: {
                            select: { id: true, name: true, email: true },
                        },
                    },
                },
                transcript: true,
            },
        });

        if (!recording) {
            throw new NotFoundException("Recording not found");
        }

        // Check access
        const hasAccess =
            recording.meeting.hostId === userId ||
            (await this.prisma.participant.findFirst({
                where: { meetingId: recording.meetingId, userId },
            }));

        if (!hasAccess) {
            throw new ForbiddenException("No access to this recording");
        }

        return recording;
    }

    async delete(id: string, userId: string) {
        const recording = await this.prisma.recording.findUnique({
            where: { id },
            include: { meeting: true },
        });

        if (!recording) {
            throw new NotFoundException("Recording not found");
        }

        if (recording.meeting.hostId !== userId) {
            throw new ForbiddenException("Only the host can delete recordings");
        }

        await this.prisma.recording.delete({ where: { id } });

        // TODO: Delete from object storage
    }

    async getTranscript(id: string, userId: string) {
        const recording = await this.findOne(id, userId);

        if (!recording.transcript) {
            throw new NotFoundException("Transcript not available");
        }

        return recording.transcript;
    }
}
