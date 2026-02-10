import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
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
import { MeetingsService } from "./meetings.service";
import { CreateMeetingDto, UpdateMeetingDto, JoinMeetingDto } from "./dto/meeting.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@ApiTags("meetings")
@Controller({ path: "meetings", version: "1" })
export class MeetingsController {
    constructor(private meetingsService: MeetingsService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Create a new meeting" })
    @ApiResponse({ status: 201, description: "Meeting created successfully" })
    async create(
        @CurrentUser("id") userId: string,
        @Body() dto: CreateMeetingDto
    ) {
        return this.meetingsService.create(userId, dto);
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "List user meetings" })
    @ApiQuery({ name: "status", required: false })
    @ApiQuery({ name: "page", required: false })
    @ApiQuery({ name: "limit", required: false })
    async findAll(
        @CurrentUser("id") userId: string,
        @Query("status") status?: string,
        @Query("page") page?: number,
        @Query("limit") limit?: number
    ) {
        return this.meetingsService.findAll(userId, { status, page, limit });
    }

    @Get("recordings/list")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "List user recordings" })
    @ApiResponse({ status: 200, description: "List of recordings" })
    async getRecordings(@CurrentUser("id") userId: string) {
        return this.meetingsService.getRecordings(userId);
    }

    @Get("lookup")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Lookup meeting by ID or room name" })
    @ApiQuery({ name: "alias", required: true })
    @ApiResponse({ status: 200, description: "Meeting details" })
    @ApiResponse({ status: 404, description: "Meeting not found" })
    async lookup(@Query("alias") alias: string) {
        return this.meetingsService.lookupMeeting(alias);
    }

    @Get(":id")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Get meeting details" })
    @ApiResponse({ status: 200, description: "Meeting details" })
    @ApiResponse({ status: 404, description: "Meeting not found" })
    async findOne(
        @Param("id") id: string,
        @CurrentUser("id") userId: string
    ) {
        return this.meetingsService.findOne(id, userId);
    }

    @Patch(":id")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Update meeting" })
    @ApiResponse({ status: 200, description: "Meeting updated" })
    async update(
        @Param("id") id: string,
        @CurrentUser("id") userId: string,
        @Body() dto: UpdateMeetingDto
    ) {
        return this.meetingsService.update(id, userId, dto);
    }

    @Delete(":id")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: "Cancel meeting" })
    @ApiResponse({ status: 204, description: "Meeting cancelled" })
    async delete(
        @Param("id") id: string,
        @CurrentUser("id") userId: string
    ) {
        return this.meetingsService.delete(id, userId);
    }

    @Post(":id/join")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Join a meeting" })
    @ApiResponse({ status: 200, description: "Join credentials returned" })
    async join(
        @Param("id") id: string,
        @Body() dto: JoinMeetingDto,
        @CurrentUser("id") userId: string
    ) {
        return this.meetingsService.join(id, userId, dto);
    }

    @Post(":id/end")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "End meeting" })
    @ApiResponse({ status: 200, description: "Meeting ended" })
    async end(
        @Param("id") id: string,
        @CurrentUser("id") userId: string
    ) {
        return this.meetingsService.end(id, userId);
    }

    @Post(":id/recording/start")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Start recording" })
    @ApiResponse({ status: 201, description: "Recording started" })
    async startRecording(
        @Param("id") id: string,
        @CurrentUser("id") userId: string
    ) {
        return this.meetingsService.startRecording(id, userId);
    }

    @Post(":id/recording/:recordingId/stop")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Stop recording" })
    @ApiResponse({ status: 200, description: "Recording stopped" })
    async stopRecording(
        @Param("id") id: string,
        @Param("recordingId") recordingId: string,
        @CurrentUser("id") userId: string
    ) {
        return this.meetingsService.stopRecording(id, recordingId, userId);
    }
}
