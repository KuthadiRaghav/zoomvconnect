import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { AuthService } from "./auth.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

const mockUser = {
    id: "user-1",
    email: "test@example.com",
    name: "Test User",
    avatarUrl: null,
    passwordHash: "hashed",
};

const mockPrisma = {
    user: {
        findUnique: jest.fn(),
        create: jest.fn(),
    },
};

const mockRedis = {
    exists: jest.fn(),
    set: jest.fn(),
};

const mockJwt = {
    signAsync: jest.fn().mockResolvedValue("mock-token"),
    verify: jest.fn(),
};

const mockConfig = {
    get: jest.fn((key: string, fallback?: string) => {
        const map: Record<string, string> = {
            JWT_SECRET: "secret",
            JWT_REFRESH_SECRET: "refresh-secret",
            JWT_EXPIRES_IN: "15m",
            JWT_REFRESH_EXPIRES_IN: "7d",
        };
        return map[key] ?? fallback;
    }),
};

describe("AuthService", () => {
    let service: AuthService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: PrismaService, useValue: mockPrisma },
                { provide: RedisService, useValue: mockRedis },
                { provide: JwtService, useValue: mockJwt },
                { provide: ConfigService, useValue: mockConfig },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        jest.clearAllMocks();
    });

    describe("register", () => {
        it("creates user and returns tokens when email is new", async () => {
            mockPrisma.user.findUnique.mockResolvedValue(null);
            mockPrisma.user.create.mockResolvedValue(mockUser);
            mockJwt.signAsync.mockResolvedValue("mock-token");

            const result = await service.register({
                email: "new@example.com",
                password: "Password1",
                name: "New User",
            });

            expect(result.accessToken).toBe("mock-token");
            expect(result.refreshToken).toBe("mock-token");
            expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
        });

        it("throws ConflictException when email already exists", async () => {
            mockPrisma.user.findUnique.mockResolvedValue(mockUser);

            await expect(
                service.register({ email: "test@example.com", password: "Password1", name: "X" })
            ).rejects.toThrow(ConflictException);
        });
    });

    describe("login", () => {
        it("returns tokens for valid credentials", async () => {
            const hash = await bcrypt.hash("Password1", 1);
            mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: hash });
            mockJwt.signAsync.mockResolvedValue("access");

            const result = await service.login({ email: "test@example.com", password: "Password1" });

            expect(result.accessToken).toBe("access");
        });

        it("throws UnauthorizedException for wrong password", async () => {
            const hash = await bcrypt.hash("correct", 1);
            mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: hash });

            await expect(
                service.login({ email: "test@example.com", password: "wrong" })
            ).rejects.toThrow(UnauthorizedException);
        });

        it("throws UnauthorizedException when user not found", async () => {
            mockPrisma.user.findUnique.mockResolvedValue(null);

            await expect(
                service.login({ email: "nobody@example.com", password: "Password1" })
            ).rejects.toThrow(UnauthorizedException);
        });
    });

    describe("refreshTokens", () => {
        it("issues new tokens when refresh token is valid", async () => {
            mockJwt.verify.mockReturnValue({ sub: "user-1", email: "test@example.com" });
            mockRedis.exists.mockResolvedValue(0);
            mockRedis.set.mockResolvedValue(undefined);
            mockJwt.signAsync.mockResolvedValue("new-token");

            const result = await service.refreshTokens("valid-refresh");

            expect(result.accessToken).toBe("new-token");
            expect(mockRedis.set).toHaveBeenCalledWith(
                "blacklist:valid-refresh",
                "1",
                7 * 24 * 60 * 60
            );
        });

        it("throws UnauthorizedException when token is blacklisted", async () => {
            mockJwt.verify.mockReturnValue({ sub: "user-1", email: "test@example.com" });
            mockRedis.exists.mockResolvedValue(1);

            await expect(service.refreshTokens("blacklisted")).rejects.toThrow(UnauthorizedException);
        });

        it("throws UnauthorizedException when no token provided", async () => {
            await expect(service.refreshTokens(undefined)).rejects.toThrow(UnauthorizedException);
        });
    });

    describe("logout", () => {
        it("blacklists the refresh token", async () => {
            mockRedis.set.mockResolvedValue(undefined);

            await service.logout("user-1", "some-token");

            expect(mockRedis.set).toHaveBeenCalledWith("blacklist:some-token", "1", expect.any(Number));
        });

        it("does nothing when no refresh token provided", async () => {
            await service.logout("user-1", undefined);

            expect(mockRedis.set).not.toHaveBeenCalled();
        });
    });
});
