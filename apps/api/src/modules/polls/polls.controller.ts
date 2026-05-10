import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
    HttpCode,
    HttpStatus,
    Request,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PollsService } from "./polls.service";
import { CreatePollDto, VotePollDto } from "./dto/poll.dto";

@ApiTags("polls")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("meetings/:meetingId/polls")
export class PollsController {
    constructor(private readonly pollsService: PollsService) {}

    @Post()
    @ApiOperation({ summary: "Create a poll (host/co-host only)" })
    create(
        @Param("meetingId") meetingId: string,
        @Body() dto: CreatePollDto,
        @Request() req: { user: { id: string } }
    ) {
        return this.pollsService.create(meetingId, req.user.id, dto);
    }

    @Get()
    @ApiOperation({ summary: "List all polls for a meeting" })
    findAll(@Param("meetingId") meetingId: string) {
        return this.pollsService.findAll(meetingId);
    }

    @Post(":pollId/vote")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Vote on a poll" })
    vote(
        @Param("meetingId") meetingId: string,
        @Param("pollId") pollId: string,
        @Body() dto: VotePollDto,
        @Request() req: { user: { id: string } }
    ) {
        // Use userId as participantId for registered users
        return this.pollsService.vote(meetingId, pollId, req.user.id, dto);
    }

    @Post(":pollId/close")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Close a poll (host/co-host only)" })
    close(
        @Param("meetingId") meetingId: string,
        @Param("pollId") pollId: string,
        @Request() req: { user: { id: string } }
    ) {
        return this.pollsService.close(meetingId, pollId, req.user.id);
    }
}
