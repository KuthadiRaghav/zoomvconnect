import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UpdateUserDto, UpdateSettingsDto } from "./dto/user.dto";

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async getProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
                createdAt: true,
                settings: true,
            },
        });

        if (!user) {
            throw new NotFoundException("User not found");
        }

        return user;
    }

    async updateProfile(userId: string, dto: UpdateUserDto) {
        return this.prisma.user.update({
            where: { id: userId },
            data: dto,
            select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
            },
        });
    }

    async getSettings(userId: string) {
        const settings = await this.prisma.userSettings.findUnique({
            where: { userId },
        });

        if (!settings) {
            // Create default settings
            return this.prisma.userSettings.create({
                data: { userId },
            });
        }

        return settings;
    }

    async updateSettings(userId: string, dto: UpdateSettingsDto) {
        return this.prisma.userSettings.upsert({
            where: { userId },
            create: { userId, ...dto },
            update: dto,
        });
    }
}
