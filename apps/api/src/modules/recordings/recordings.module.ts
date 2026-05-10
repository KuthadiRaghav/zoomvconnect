import { Module } from "@nestjs/common";
import { RecordingsController } from "./recordings.controller";
import { RecordingsService } from "./recordings.service";
import { AiSummaryService } from "./ai-summary.service";
import { StorageModule } from "../../storage/storage.module";

@Module({
    imports: [StorageModule],
    controllers: [RecordingsController],
    providers: [RecordingsService, AiSummaryService],
    exports: [RecordingsService],
})
export class RecordingsModule { }
