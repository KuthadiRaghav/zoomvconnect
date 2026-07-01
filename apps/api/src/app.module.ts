import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import * as Joi from "joi";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { AuthModule } from "./modules/auth/auth.module";
import { MeetingsModule } from "./modules/meetings/meetings.module";
import { BreakoutRoomsModule } from "./modules/breakout-rooms/breakout-rooms.module";
import { RecordingsModule } from "./modules/recordings/recordings.module";
import { UsersModule } from "./modules/users/users.module";
import { LivekitModule } from "./modules/livekit/livekit.module";
import { PollsModule } from "./modules/polls/polls.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";

@Module({
    imports: [
        // Configuration with startup validation
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: [".env.local", ".env"],
            validationSchema: Joi.object({
                NODE_ENV: Joi.string().valid("development", "production", "test").default("development"),
                PORT: Joi.number().default(4000),
                DATABASE_URL: Joi.string().required(),
                REDIS_URL: Joi.string().required(),
                JWT_SECRET: Joi.string().min(32).required(),
                JWT_REFRESH_SECRET: Joi.string().min(32).required(),
                JWT_EXPIRES_IN: Joi.string().default("15m"),
                JWT_REFRESH_EXPIRES_IN: Joi.string().default("7d"),
                LIVEKIT_API_KEY: Joi.string().required(),
                LIVEKIT_API_SECRET: Joi.string().required(),
                LIVEKIT_URL: Joi.string().required(),
                S3_ENDPOINT: Joi.string().required(),
                S3_ACCESS_KEY: Joi.string().required(),
                S3_SECRET_KEY: Joi.string().required(),
                S3_BUCKET: Joi.string().default("zoomvconnect-recordings"),
                CORS_ORIGIN: Joi.string().optional(),
                ANTHROPIC_API_KEY: Joi.string().optional(),
                SMTP_HOST: Joi.string().optional(),
                SMTP_PORT: Joi.number().optional(),
                SMTP_USER: Joi.string().optional(),
                SMTP_PASS: Joi.string().optional(),
                EMAIL_FROM_NAME: Joi.string().optional(),
                EMAIL_FROM_ADDRESS: Joi.string().optional(),
                NEXT_PUBLIC_APP_URL: Joi.string().optional(),
            }),
            validationOptions: { abortEarly: false },
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
        BreakoutRoomsModule,
        RecordingsModule,
        UsersModule,
        PollsModule,
    ],
    providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
    ],
})
export class AppModule { }
