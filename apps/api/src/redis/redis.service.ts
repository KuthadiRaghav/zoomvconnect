import { Injectable, OnModuleDestroy, OnApplicationBootstrap, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnApplicationBootstrap, OnModuleDestroy {
    private readonly client: Redis;
    private readonly subscriber: Redis;
    private readonly publisher: Redis;
    private readonly logger = new Logger(RedisService.name);

    constructor(private configService: ConfigService) {
        const redisUrl = this.configService.get<string>("REDIS_URL", "redis://localhost:6379");

        const isLocalhost = redisUrl.includes("localhost") || redisUrl.includes("127.0.0.1");
        const needsTls = redisUrl.startsWith("rediss://") || !isLocalhost;

        const redisOpts: Record<string, unknown> = {
            maxRetriesPerRequest: 3,
            lazyConnect: true,
            family: 4,
            ...(needsTls ? { tls: { rejectUnauthorized: false } } : {}),
        };

        const cleanUrl = redisUrl.replace(/^rediss:\/\//, "redis://");

        this.client = new Redis(cleanUrl, redisOpts);
        this.subscriber = new Redis(cleanUrl, redisOpts);
        this.publisher = new Redis(cleanUrl, redisOpts);

        const names = ["client", "subscriber", "publisher"] as const;
        [this.client, this.subscriber, this.publisher].forEach((conn, i) => {
            conn.on("error", (err) => this.logger.error(`Redis ${names[i]} error: ${err.message}`));
            conn.on("ready", () => this.logger.log(`Redis ${names[i]} ready`));
        });
    }

    async onApplicationBootstrap() {
        // Block app startup until all three connections are ready.
        // This prevents 401 / 500 errors on the very first requests after deploy.
        await Promise.all([
            this.client.connect(),
            this.subscriber.connect(),
            this.publisher.connect(),
        ]);
    }

    async onModuleDestroy() {
        await Promise.all([
            this.client.quit(),
            this.subscriber.quit(),
            this.publisher.quit(),
        ]);
    }

    // Basic operations
    async get(key: string): Promise<string | null> {
        return this.client.get(key);
    }

    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        if (ttlSeconds) {
            await this.client.setex(key, ttlSeconds, value);
        } else {
            await this.client.set(key, value);
        }
    }

    async del(key: string): Promise<void> {
        await this.client.del(key);
    }

    async exists(key: string): Promise<boolean> {
        return (await this.client.exists(key)) === 1;
    }

    // JSON operations
    async getJson<T>(key: string): Promise<T | null> {
        const value = await this.get(key);
        return value ? JSON.parse(value) : null;
    }

    async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
        await this.set(key, JSON.stringify(value), ttlSeconds);
    }

    // Set operations (for room participants, etc.)
    async sadd(key: string, ...members: string[]): Promise<void> {
        await this.client.sadd(key, ...members);
    }

    async srem(key: string, ...members: string[]): Promise<void> {
        await this.client.srem(key, ...members);
    }

    async smembers(key: string): Promise<string[]> {
        return this.client.smembers(key);
    }

    async sismember(key: string, member: string): Promise<boolean> {
        return (await this.client.sismember(key, member)) === 1;
    }

    // Pub/Sub
    async publish(channel: string, message: string): Promise<void> {
        await this.publisher.publish(channel, message);
    }

    async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
        await this.subscriber.subscribe(channel);
        this.subscriber.on("message", (ch, msg) => {
            if (ch === channel) {
                callback(msg);
            }
        });
    }

    async unsubscribe(channel: string): Promise<void> {
        await this.subscriber.unsubscribe(channel);
    }

    // Keys with pattern
    async keys(pattern: string): Promise<string[]> {
        return this.client.keys(pattern);
    }

    // Expire
    async expire(key: string, seconds: number): Promise<void> {
        await this.client.expire(key, seconds);
    }

    // Increment
    async incr(key: string): Promise<number> {
        return this.client.incr(key);
    }

    async incrby(key: string, increment: number): Promise<number> {
        return this.client.incrby(key, increment);
    }
}
