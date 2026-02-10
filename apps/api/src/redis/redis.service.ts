import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
    private readonly client: Redis;
    private readonly subscriber: Redis;
    private readonly publisher: Redis;

    constructor(private configService: ConfigService) {
        const redisUrl = this.configService.get<string>("REDIS_URL", "redis://localhost:6379");

        this.client = new Redis(redisUrl);
        this.subscriber = new Redis(redisUrl);
        this.publisher = new Redis(redisUrl);
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
