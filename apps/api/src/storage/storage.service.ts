import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

@Injectable()
export class StorageService {
    private readonly s3: S3Client;
    private readonly bucket: string;
    private readonly logger = new Logger(StorageService.name);

    constructor(private config: ConfigService) {
        this.bucket = config.get<string>("S3_BUCKET", "zoomvconnect-recordings");
        this.s3 = new S3Client({
            endpoint: config.get<string>("S3_ENDPOINT"),
            region: "us-east-1",
            credentials: {
                accessKeyId: config.get<string>("S3_ACCESS_KEY", ""),
                secretAccessKey: config.get<string>("S3_SECRET_KEY", ""),
            },
            forcePathStyle: true, // required for MinIO
        });
    }

    async deleteObject(url: string): Promise<void> {
        const key = this.keyFromUrl(url);
        if (!key) return;

        try {
            await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
        } catch (err) {
            this.logger.warn(`Failed to delete object ${key}: ${(err as Error).message}`);
        }
    }

    private keyFromUrl(url: string): string | null {
        try {
            const parsed = new URL(url);
            // Path format: /<bucket>/<key...> (MinIO path-style) or /<key...> (virtual-hosted)
            const parts = parsed.pathname.replace(/^\//, "").split("/");
            if (parts[0] === this.bucket) {
                return parts.slice(1).join("/");
            }
            return parts.join("/");
        } catch {
            return null;
        }
    }
}
