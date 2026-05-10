import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { StorageService } from "../../storage/storage.service";
import { AiSummaryService } from "./ai-summary.service";

@Injectable()
export class RecordingsService {
    constructor(
        private prisma: PrismaService,
        private storage: StorageService,
        private aiSummary: AiSummaryService,
    ) { }

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

        // Delete files from object storage before removing the DB record
        await Promise.all([
            recording.videoUrl ? this.storage.deleteObject(recording.videoUrl) : Promise.resolve(),
            recording.audioUrl ? this.storage.deleteObject(recording.audioUrl) : Promise.resolve(),
        ]);

        await this.prisma.recording.delete({ where: { id } });
    }

    async getTranscript(id: string, userId: string) {
        const recording = await this.findOne(id, userId);

        if (!recording.transcript) {
            throw new NotFoundException("Transcript not available");
        }

        return recording.transcript;
    }

    async summarize(id: string, userId: string) {
        const recording = await this.findOne(id, userId);

        if (!recording.transcript) {
            throw new NotFoundException("No transcript found for this recording");
        }

        const segments = recording.transcript.segments as {
            start: number;
            end: number;
            speaker?: string;
            text: string;
        }[];

        const result = await this.aiSummary.generateSummary(segments, recording.meeting.title);

        const updated = await this.prisma.transcript.update({
            where: { id: recording.transcript.id },
            data: {
                summary: result.summary,
                actionItems: result.actionItems,
                keywords: result.keywords,
            },
        });

        return updated;
    }
}
