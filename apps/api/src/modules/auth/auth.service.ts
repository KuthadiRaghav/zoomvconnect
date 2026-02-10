import {
    Injectable,
    UnauthorizedException,
    ConflictException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { RegisterDto, LoginDto, TokenResponseDto } from "./dto/auth.dto";

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private configService: ConfigService,
        private redis: RedisService
    ) { }

    async register(dto: RegisterDto): Promise<TokenResponseDto> {
        // Check if user exists
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (existingUser) {
            throw new ConflictException("Email already registered");
        }

        // Hash password
        const passwordHash = await bcrypt.hash(dto.password, 12);

        // Create user
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                name: dto.name,
                passwordHash,
                settings: {
                    create: {},
                },
            },
        });

        // Generate tokens
        return this.generateTokens(user.id, user.email);
    }

    async login(dto: LoginDto): Promise<TokenResponseDto> {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (!user || !user.passwordHash) {
            throw new UnauthorizedException("Invalid credentials");
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

        if (!isPasswordValid) {
            throw new UnauthorizedException("Invalid credentials");
        }

        return this.generateTokens(user.id, user.email);
    }

    async refreshTokens(refreshToken: string): Promise<TokenResponseDto> {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get<string>("JWT_REFRESH_SECRET"),
            });

            // Check if token is blacklisted
            const isBlacklisted = await this.redis.exists(`blacklist:${refreshToken}`);
            if (isBlacklisted) {
                throw new UnauthorizedException("Token has been revoked");
            }

            // Blacklist old token
            await this.redis.set(
                `blacklist:${refreshToken}`,
                "1",
                7 * 24 * 60 * 60 // 7 days
            );

            return this.generateTokens(payload.sub, payload.email);
        } catch (error) {
            throw new UnauthorizedException("Invalid refresh token");
        }
    }

    async logout(userId: string, refreshToken: string): Promise<void> {
        // Blacklist the refresh token
        await this.redis.set(
            `blacklist:${refreshToken}`,
            "1",
            7 * 24 * 60 * 60 // 7 days
        );
    }

    async validateUser(userId: string): Promise<any> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
            },
        });

        return user;
    }

    private async generateTokens(
        userId: string,
        email: string
    ): Promise<TokenResponseDto> {
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(
                { sub: userId, email },
                {
                    secret: this.configService.get<string>("JWT_SECRET"),
                    expiresIn: this.configService.get<string>("JWT_EXPIRES_IN", "15m"),
                }
            ),
            this.jwtService.signAsync(
                { sub: userId, email },
                {
                    secret: this.configService.get<string>("JWT_REFRESH_SECRET"),
                    expiresIn: this.configService.get<string>("JWT_REFRESH_EXPIRES_IN", "7d"),
                }
            ),
        ]);

        return {
            accessToken,
            refreshToken,
            expiresIn: 15 * 60, // 15 minutes in seconds
        };
    }
}
