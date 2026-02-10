import {
    Controller,
    Get,
    Delete,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from "@nestjs/common";
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery,
} from "@nestjs/swagger";
import { RecordingsService } from "./recordings.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@ApiTags("recordings")
@Controller({ path: "recordings", version: "1" })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RecordingsController {
    constructor(private recordingsService: RecordingsService) { }

    @Get()
    @ApiOperation({ summary: "List recordings" })
    @ApiQuery({ name: "page", required: false })
    @ApiQuery({ name: "limit", required: false })
    async findAll(
        @CurrentUser("id") userId: string,
        @Query("page") page?: number,
        @Query("limit") limit?: number
    ) {
        return this.recordingsService.findAll(userId, { page, limit });
    }

    @Get(":id")
    @ApiOperation({ summary: "Get recording details" })
    @ApiResponse({ status: 200, description: "Recording details" })
    @ApiResponse({ status: 404, description: "Recording not found" })
    async findOne(
        @Param("id") id: string,
        @CurrentUser("id") userId: string
    ) {
        return this.recordingsService.findOne(id, userId);
    }

    @Get(":id/transcript")
    @ApiOperation({ summary: "Get recording transcript" })
    @ApiResponse({ status: 200, description: "Transcript" })
    @ApiResponse({ status: 404, description: "Transcript not available" })
    async getTranscript(
        @Param("id") id: string,
        @CurrentUser("id") userId: string
    ) {
        return this.recordingsService.getTranscript(id, userId);
    }

    @Delete(":id")
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: "Delete recording" })
    @ApiResponse({ status: 204, description: "Recording deleted" })
    async delete(
        @Param("id") id: string,
        @CurrentUser("id") userId: string
    ) {
        return this.recordingsService.delete(id, userId);
    }
}
