import { NestFactory } from "@nestjs/core";
import { ValidationPipe, VersioningType, Logger } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import helmet from "helmet";
import * as cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
    const logger = new Logger("Bootstrap");
    const app = await NestFactory.create(AppModule);

    app.use(cookieParser());

    // Security - configure helmet for cross-origin API access
    app.use(helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
        crossOriginOpenerPolicy: { policy: "unsafe-none" },
    }));
    // CORS - support multiple origins (comma-separated) & strip trailing slashes
    const defaultOrigins = [
        "http://localhost:3000",
        "https://zoomvconnect-web-4hoa-hy2cwisez-techochannel-6309s-projects.vercel.app"
    ];
    const corsOrigin = process.env.CORS_ORIGIN;
    const allowedOrigins = corsOrigin
        ? corsOrigin.split(",").map(o => o.trim().replace(/\/+$/, ""))
        : defaultOrigins;
    app.enableCors({
        origin: allowedOrigins,
        credentials: true,
    });
    logger.log(`CORS allowed origins: ${allowedOrigins.join(", ")}`);

    // API versioning
    app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: "1",
        prefix: "api/v",
    });

    // Validation
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        })
    );

    // Swagger documentation
    const config = new DocumentBuilder()
        .setTitle("ZoomVconnect API")
        .setDescription("Video Conferencing Platform API")
        .setVersion("1.0")
        .addBearerAuth()
        .addTag("auth", "Authentication endpoints")
        .addTag("meetings", "Meeting management")
        .addTag("recordings", "Recording management")
        .addTag("users", "User management")
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document);

    const port = process.env.PORT || 4000;
    await app.listen(port, "0.0.0.0");

    logger.log(`API running on http://localhost:${port}`);
    logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
