import "dotenv/config";
import { SignalingServer } from "./server";
import { createLogger } from "./logger";

const logger = createLogger("Bootstrap");

const PORT = parseInt(process.env.PORT || process.env.SIGNALING_PORT || "4001", 10);

const server = new SignalingServer({
    port: PORT,
    jwtSecret: process.env.JWT_SECRET || "your-jwt-secret",
    redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
});

server.start();

logger.info(`Signaling server running on ws://localhost:${PORT}`);

// Graceful shutdown
process.on("SIGTERM", async () => {
    logger.info("Shutting down (SIGTERM)");
    await server.stop();
    process.exit(0);
});

process.on("SIGINT", async () => {
    logger.info("Shutting down (SIGINT)");
    await server.stop();
    process.exit(0);
});
