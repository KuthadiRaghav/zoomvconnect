import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
    HttpCode,
    HttpStatus,
} from "@nestjs/common";
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from "@nestjs/swagger";
import { BreakoutRoomsService } from "./breakout-rooms.service";
import {
    CreateBreakoutRoomsDto,
    UpdateBreakoutRoomDto,
    AssignParticipantsDto,
} from "./dto/breakout-room.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@ApiTags("breakout-rooms")
@Controller({ path: "meetings/:meetingId/breakout-rooms", version: "1" })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BreakoutRoomsController {
    constructor(private service: BreakoutRoomsService) { }

    @Get()
    @ApiOperation({ summary: "List breakout rooms for a meeting" })
    async list(@Param("meetingId") meetingId: string) {
        return this.service.listRooms(meetingId);
    }

    @Post()
    @ApiOperation({ summary: "Create breakout rooms (host only)" })
    @ApiResponse({ status: 201, description: "Rooms created" })
    async create(
        @Param("meetingId") meetingId: string,
        @CurrentUser("id") userId: string,
        @Body() dto: CreateBreakoutRoomsDto,
    ) {
        return this.service.createRooms(meetingId, userId, dto);
    }

    @Patch(":roomId")
    @ApiOperation({ summary: "Update a breakout room (host only)" })
    async update(
        @Param("meetingId") meetingId: string,
        @Param("roomId") roomId: string,
        @CurrentUser("id") userId: string,
        @Body() dto: UpdateBreakoutRoomDto,
    ) {
        return this.service.updateRoom(meetingId, roomId, userId, dto);
    }

    @Delete(":roomId")
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: "Delete a breakout room (host only)" })
    async delete(
        @Param("meetingId") meetingId: string,
        @Param("roomId") roomId: string,
        @CurrentUser("id") userId: string,
    ) {
        return this.service.deleteRoom(meetingId, roomId, userId);
    }

    @Post(":roomId/assign")
    @ApiOperation({ summary: "Assign participants to a breakout room (host only)" })
    async assign(
        @Param("meetingId") meetingId: string,
        @Param("roomId") roomId: string,
        @CurrentUser("id") userId: string,
        @Body() dto: AssignParticipantsDto,
    ) {
        return this.service.assignParticipants(meetingId, roomId, userId, dto);
    }

    @Post("start")
    @ApiOperation({ summary: "Start all breakout rooms and issue participant tokens (host only)" })
    async startAll(
        @Param("meetingId") meetingId: string,
        @CurrentUser("id") userId: string,
    ) {
        return this.service.startAll(meetingId, userId);
    }

    @Post("end")
    @ApiOperation({ summary: "End all breakout rooms and return participants to main room (host only)" })
    async endAll(
        @Param("meetingId") meetingId: string,
        @CurrentUser("id") userId: string,
    ) {
        return this.service.endAll(meetingId, userId);
    }
}
