import {
    Controller,
    Post,
    Body,
    HttpCode,
    HttpStatus,
    UseGuards,
    Req,
    Res,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { RegisterDto, LoginDto } from "./dto/auth.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import { ConfigService } from "@nestjs/config";

@ApiTags("auth")
@Controller({ path: "auth", version: "1" })
export class AuthController {
    constructor(
        private authService: AuthService,
        private configService: ConfigService,
    ) { }

    private setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
        const isProduction = this.configService.get("NODE_ENV") === "production";
        const cookieBase = {
            httpOnly: true,
            secure: isProduction,
            sameSite: "strict" as const,
            path: "/",
        };
        res.cookie("accessToken", accessToken, { ...cookieBase, maxAge: 15 * 60 * 1000 });
        res.cookie("refreshToken", refreshToken, { ...cookieBase, maxAge: 7 * 24 * 60 * 60 * 1000 });
    }

    private clearTokenCookies(res: Response) {
        res.clearCookie("accessToken", { path: "/" });
        res.clearCookie("refreshToken", { path: "/" });
    }

    @Post("register")
    @Throttle({ short: { ttl: 60000, limit: 5 } })
    @ApiOperation({ summary: "Register a new user" })
    @ApiResponse({ status: 201, description: "User registered successfully" })
    @ApiResponse({ status: 409, description: "Email already registered" })
    async register(
        @Body() dto: RegisterDto,
        @Res({ passthrough: true }) res: Response,
    ): Promise<{ message: string }> {
        const tokens = await this.authService.register(dto);
        this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
        return { message: "Registered successfully" };
    }

    @Post("login")
    @HttpCode(HttpStatus.OK)
    @Throttle({ short: { ttl: 60000, limit: 5 } })
    @ApiOperation({ summary: "Login with email and password" })
    @ApiResponse({ status: 200, description: "Login successful" })
    @ApiResponse({ status: 401, description: "Invalid credentials" })
    async login(
        @Body() dto: LoginDto,
        @Res({ passthrough: true }) res: Response,
    ): Promise<{ message: string }> {
        const tokens = await this.authService.login(dto);
        this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
        return { message: "Logged in successfully" };
    }

    @Post("refresh")
    @HttpCode(HttpStatus.OK)
    @Throttle({ short: { ttl: 60000, limit: 10 } })
    @ApiOperation({ summary: "Refresh access token using cookie" })
    @ApiResponse({ status: 200, description: "Token refreshed" })
    @ApiResponse({ status: 401, description: "Invalid or missing refresh token" })
    async refresh(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ): Promise<{ message: string }> {
        const refreshToken = req.cookies?.["refreshToken"];
        const tokens = await this.authService.refreshTokens(refreshToken);
        this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
        return { message: "Token refreshed" };
    }

    @Post("logout")
    @HttpCode(HttpStatus.NO_CONTENT)
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Logout user" })
    @ApiResponse({ status: 204, description: "Logged out successfully" })
    async logout(
        @CurrentUser("id") userId: string,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ): Promise<void> {
        const refreshToken = req.cookies?.["refreshToken"];
        await this.authService.logout(userId, refreshToken);
        this.clearTokenCookies(res);
    }
}
