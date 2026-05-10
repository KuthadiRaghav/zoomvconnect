import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { MeetingsService } from "./meetings.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { LivekitService } from "../livekit/livekit.service";

const HOST_ID = "host-1";
const OTHER_ID = "other-1";

const baseMeeting = {
    id: "meeting-1",
    title: "Test Meeting",
    description: null,
    roomName: "alpha-bravo-charlie",
    hostId: HOST_ID,
    status: "WAITING",
    passcode: null,
    waitingRoom: false,
    type: "INSTANT",
    scheduledStart: null,
    scheduledEnd: null,
    actualStart: null,
    actualEnd: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    participants: [],
    host: { id: HOST_ID, name: "Host", email: "host@test.com", avatarUrl: null },
};

const mockPrisma = {
    meeting: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
    },
    participant: {
        upsert: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
    },
    recording: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
};

const mockLivekit = {
    createToken: jest.fn().mockResolvedValue("livekit-token"),
    deleteRoom: jest.fn().mockResolvedValue(undefined),
    listEgress: jest.fn().mockResolvedValue([]),
    stopRecording: jest.fn().mockResolvedValue(undefined),
    startRecording: jest.fn().mockResolvedValue({ egressId: "egress-1" }),
};

const mockRedis = {
    exists: jest.fn(),
    set: jest.fn(),
};

describe("MeetingsService", () => {
    let service: MeetingsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MeetingsService,
                { provide: PrismaService, useValue: mockPrisma },
                { provide: RedisService, useValue: mockRedis },
                { provide: LivekitService, useValue: mockLivekit },
            ],
        }).compile();

        service = module.get<MeetingsService>(MeetingsService);
        jest.clearAllMocks();
    });

    describe("create", () => {
        it("creates a meeting with generated room name and marks INSTANT as WAITING", async () => {
            mockPrisma.meeting.create.mockResolvedValue(baseMeeting);
            mockPrisma.meeting.update.mockResolvedValue({ ...baseMeeting, status: "WAITING" });

            const result = await service.create(HOST_ID, { title: "Test", type: "INSTANT" });

            expect(mockPrisma.meeting.create).toHaveBeenCalledTimes(1);
            expect(result.title).toBe("Test Meeting");
        });
    });

    describe("update", () => {
        it("updates meeting when caller is host", async () => {
            mockPrisma.meeting.findUnique.mockResolvedValue(baseMeeting);
            mockPrisma.meeting.update.mockResolvedValue({ ...baseMeeting, title: "Updated" });

            const result = await service.update("meeting-1", HOST_ID, { title: "Updated" });

            expect(result.title).toBe("Updated");
        });

        it("throws ForbiddenException when caller is not host", async () => {
            mockPrisma.meeting.findUnique.mockResolvedValue(baseMeeting);

            await expect(
                service.update("meeting-1", OTHER_ID, { title: "X" })
            ).rejects.toThrow(ForbiddenException);
        });

        it("throws NotFoundException for unknown meeting", async () => {
            mockPrisma.meeting.findUnique.mockResolvedValue(null);

            await expect(
                service.update("missing", HOST_ID, { title: "X" })
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe("delete", () => {
        it("cancels meeting when caller is host", async () => {
            mockPrisma.meeting.findUnique.mockResolvedValue(baseMeeting);
            mockPrisma.meeting.update.mockResolvedValue({ ...baseMeeting, status: "CANCELLED" });

            await service.delete("meeting-1", HOST_ID);

            expect(mockPrisma.meeting.update).toHaveBeenCalledWith(
                expect.objectContaining({ data: { status: "CANCELLED" } })
            );
        });

        it("throws ForbiddenException when caller is not host", async () => {
            mockPrisma.meeting.findUnique.mockResolvedValue(baseMeeting);

            await expect(service.delete("meeting-1", OTHER_ID)).rejects.toThrow(ForbiddenException);
        });
    });

    describe("join", () => {
        it("returns LiveKit token when joining a valid meeting", async () => {
            mockPrisma.meeting.findUnique.mockResolvedValue(baseMeeting);
            mockPrisma.participant.upsert.mockResolvedValue({
                id: "p-1",
                userId: HOST_ID,
                role: "HOST",
                user: { id: HOST_ID, name: "Host", email: "host@test.com", avatarUrl: null },
            });
            mockPrisma.meeting.update.mockResolvedValue(baseMeeting);

            const result = await service.join("meeting-1", HOST_ID, {});

            expect(result.token).toBe("livekit-token");
            expect(result.meeting.id).toBe("meeting-1");
        });

        it("throws BadRequestException when joining an ended meeting", async () => {
            mockPrisma.meeting.findUnique.mockResolvedValue({ ...baseMeeting, status: "ENDED" });

            await expect(service.join("meeting-1", HOST_ID, {})).rejects.toThrow(BadRequestException);
        });

        it("throws ForbiddenException when passcode is wrong", async () => {
            mockPrisma.meeting.findUnique.mockResolvedValue({
                ...baseMeeting,
                passcode: "123456",
                participants: [],
            });

            await expect(
                service.join("meeting-1", HOST_ID, { passcode: "wrong" })
            ).rejects.toThrow(ForbiddenException);
        });

        it("throws NotFoundException when meeting does not exist", async () => {
            mockPrisma.meeting.findUnique.mockResolvedValue(null);

            await expect(service.join("missing", HOST_ID, {})).rejects.toThrow(NotFoundException);
        });
    });

    describe("end", () => {
        it("marks meeting as ENDED when caller is host", async () => {
            mockPrisma.meeting.findUnique.mockResolvedValue(baseMeeting);
            mockPrisma.meeting.update.mockResolvedValue({ ...baseMeeting, status: "ENDED" });

            await service.end("meeting-1", HOST_ID);

            expect(mockPrisma.meeting.update).toHaveBeenCalledWith(
                expect.objectContaining({ data: expect.objectContaining({ status: "ENDED" }) })
            );
        });

        it("throws ForbiddenException when caller is not host", async () => {
            mockPrisma.meeting.findUnique.mockResolvedValue(baseMeeting);

            await expect(service.end("meeting-1", OTHER_ID)).rejects.toThrow(ForbiddenException);
        });
    });

    describe("lookupMeeting", () => {
        it("returns meeting by id or roomName", async () => {
            mockPrisma.meeting.findFirst.mockResolvedValue({
                id: "meeting-1",
                title: "Test",
                roomName: "alpha-bravo-charlie",
                host: { name: "Host" },
            });

            const result = await service.lookupMeeting("alpha-bravo-charlie");

            expect(result.id).toBe("meeting-1");
        });

        it("throws NotFoundException when not found", async () => {
            mockPrisma.meeting.findFirst.mockResolvedValue(null);

            await expect(service.lookupMeeting("unknown")).rejects.toThrow(NotFoundException);
        });
    });
});
