import {
    Controller,
    Get,
    Patch,
    Body,
    UseGuards,
} from "@nestjs/common";
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { UpdateUserDto, UpdateSettingsDto } from "./dto/user.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@ApiTags("users")
@Controller({ path: "users", version: "1" })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
    constructor(private usersService: UsersService) { }

    @Get("me")
    @ApiOperation({ summary: "Get current user profile" })
    @ApiResponse({ status: 200, description: "User profile" })
    async getProfile(@CurrentUser("id") userId: string) {
        return this.usersService.getProfile(userId);
    }

    @Patch("me")
    @ApiOperation({ summary: "Update current user profile" })
    @ApiResponse({ status: 200, description: "Profile updated" })
    async updateProfile(
        @CurrentUser("id") userId: string,
        @Body() dto: UpdateUserDto
    ) {
        return this.usersService.updateProfile(userId, dto);
    }

    @Get("me/settings")
    @ApiOperation({ summary: "Get user settings" })
    @ApiResponse({ status: 200, description: "User settings" })
    async getSettings(@CurrentUser("id") userId: string) {
        return this.usersService.getSettings(userId);
    }

    @Patch("me/settings")
    @ApiOperation({ summary: "Update user settings" })
    @ApiResponse({ status: 200, description: "Settings updated" })
    async updateSettings(
        @CurrentUser("id") userId: string,
        @Body() dto: UpdateSettingsDto
    ) {
        return this.usersService.updateSettings(userId, dto);
    }
}
