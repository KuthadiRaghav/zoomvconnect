import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./modules/auth/auth.module";
import { MeetingsModule } from "./modules/meetings/meetings.module";
import { RecordingsModule } from "./modules/recordings/recordings.module";
import { UsersModule } from "./modules/users/users.module";
import { LivekitModule } from "./modules/livekit/livekit.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";

@Module({
    imports: [
        // Configuration
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: [".env.local", ".env"],
        }),

        // Rate limiting
        ThrottlerModule.forRoot([
            {
                name: "short",
                ttl: 1000,
                limit: 10,
            },
            {
                name: "medium",
                ttl: 10000,
                limit: 50,
            },
            {
                name: "long",
                ttl: 60000,
                limit: 100,
            },
        ]),

        // Core modules
        PrismaModule,
        RedisModule,
        LivekitModule,

        // Feature modules
        AuthModule,
        MeetingsModule,
        RecordingsModule,
        UsersModule,
    ],
})
export class AppModule { }
