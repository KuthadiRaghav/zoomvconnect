import {
    Controller,
    Post,
    Body,
    HttpCode,
    HttpStatus,
    UseGuards,
    Req,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { RegisterDto, LoginDto, RefreshTokenDto, TokenResponseDto } from "./dto/auth.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";

@ApiTags("auth")
@Controller({ path: "auth", version: "1" })
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post("register")
    @ApiOperation({ summary: "Register a new user" })
    @ApiResponse({ status: 201, description: "User registered successfully", type: TokenResponseDto })
    @ApiResponse({ status: 409, description: "Email already registered" })
    async register(@Body() dto: RegisterDto): Promise<TokenResponseDto> {
        return this.authService.register(dto);
    }

    @Post("login")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Login with email and password" })
    @ApiResponse({ status: 200, description: "Login successful", type: TokenResponseDto })
    @ApiResponse({ status: 401, description: "Invalid credentials" })
    async login(@Body() dto: LoginDto): Promise<TokenResponseDto> {
        return this.authService.login(dto);
    }

    @Post("refresh")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Refresh access token" })
    @ApiResponse({ status: 200, description: "Token refreshed", type: TokenResponseDto })
    @ApiResponse({ status: 401, description: "Invalid refresh token" })
    async refresh(@Body() dto: RefreshTokenDto): Promise<TokenResponseDto> {
        return this.authService.refreshTokens(dto.refreshToken);
    }

    @Post("logout")
    @HttpCode(HttpStatus.NO_CONTENT)
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Logout user" })
    @ApiResponse({ status: 204, description: "Logged out successfully" })
    async logout(
        @CurrentUser("id") userId: string,
        @Body() dto: RefreshTokenDto
    ): Promise<void> {
        return this.authService.logout(userId, dto.refreshToken);
    }
}
