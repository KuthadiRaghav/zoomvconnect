import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreatePollDto, VotePollDto } from "./dto/poll.dto";

@Injectable()
export class PollsService {
    constructor(private prisma: PrismaService) {}

    async create(meetingId: string, userId: string, dto: CreatePollDto) {
        const participant = await this.prisma.participant.findFirst({
            where: { meetingId, userId },
        });

        if (!participant || (participant.role !== "HOST" && participant.role !== "COHOST")) {
            throw new ForbiddenException("Only host or co-host can create polls");
        }

        return this.prisma.poll.create({
            data: {
                meetingId,
                createdById: userId,
                question: dto.question,
                options: dto.options,
            },
            include: { votes: true },
        });
    }

    async findAll(meetingId: string) {
        const polls = await this.prisma.poll.findMany({
            where: { meetingId },
            include: { votes: true },
            orderBy: { createdAt: "asc" },
        });

        return polls.map((p) => this.formatPoll(p));
    }

    async vote(meetingId: string, pollId: string, participantId: string, dto: VotePollDto) {
        const poll = await this.prisma.poll.findFirst({
            where: { id: pollId, meetingId },
        });

        if (!poll) throw new NotFoundException("Poll not found");
        if (!poll.isOpen) throw new BadRequestException("Poll is closed");

        const options = poll.options as string[];
        if (dto.optionIndex < 0 || dto.optionIndex >= options.length) {
            throw new BadRequestException("Invalid option index");
        }

        const existing = await this.prisma.pollVote.findUnique({
            where: { pollId_participantId: { pollId, participantId } },
        });

        if (existing) throw new ConflictException("Already voted on this poll");

        await this.prisma.pollVote.create({
            data: { pollId, participantId, optionIndex: dto.optionIndex },
        });

        const updated = await this.prisma.poll.findUnique({
            where: { id: pollId },
            include: { votes: true },
        });

        return this.formatPoll(updated!);
    }

    async close(meetingId: string, pollId: string, userId: string) {
        const participant = await this.prisma.participant.findFirst({
            where: { meetingId, userId },
        });

        if (!participant || (participant.role !== "HOST" && participant.role !== "COHOST")) {
            throw new ForbiddenException("Only host or co-host can close polls");
        }

        const poll = await this.prisma.poll.findFirst({
            where: { id: pollId, meetingId },
        });

        if (!poll) throw new NotFoundException("Poll not found");

        const updated = await this.prisma.poll.update({
            where: { id: pollId },
            data: { isOpen: false, closedAt: new Date() },
            include: { votes: true },
        });

        return this.formatPoll(updated);
    }

    private formatPoll(poll: {
        id: string;
        question: string;
        options: unknown;
        isOpen: boolean;
        closedAt: Date | null;
        createdAt: Date;
        votes: { optionIndex: number; participantId: string }[];
    }) {
        const options = poll.options as string[];
        const tallies = options.map((label, i) => ({
            label,
            count: poll.votes.filter((v) => v.optionIndex === i).length,
        }));
        const total = poll.votes.length;

        return {
            id: poll.id,
            question: poll.question,
            options,
            isOpen: poll.isOpen,
            closedAt: poll.closedAt,
            createdAt: poll.createdAt,
            totalVotes: total,
            results: tallies.map((t) => ({
                ...t,
                percentage: total > 0 ? Math.round((t.count / total) * 100) : 0,
            })),
        };
    }
}
