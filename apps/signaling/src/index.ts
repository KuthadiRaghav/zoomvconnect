import "dotenv/config";
import { SignalingServer } from "./server";

const PORT = parseInt(process.env.SIGNALING_PORT || "4001", 10);

const server = new SignalingServer({
    port: PORT,
    jwtSecret: process.env.JWT_SECRET || "your-jwt-secret",
    redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
});

server.start();

console.log(`🔌 Signaling server running on ws://localhost:${PORT}`);

// Graceful shutdown
process.on("SIGTERM", async () => {
    console.log("Shutting down...");
    await server.stop();
    process.exit(0);
});

process.on("SIGINT", async () => {
    console.log("Shutting down...");
    await server.stop();
    process.exit(0);
});
