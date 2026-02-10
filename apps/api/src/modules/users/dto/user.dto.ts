import { IsString, IsBoolean, IsOptional, MaxLength, IsUrl } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateUserDto {
    @ApiPropertyOptional({ example: "John Doe" })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    name?: string;

    @ApiPropertyOptional({ example: "https://example.com/avatar.jpg" })
    @IsOptional()
    @IsUrl()
    avatarUrl?: string;
}

export class UpdateSettingsDto {
    @ApiPropertyOptional({ default: false })
    @IsOptional()
    @IsBoolean()
    defaultMicOn?: boolean;

    @ApiPropertyOptional({ default: false })
    @IsOptional()
    @IsBoolean()
    defaultCameraOn?: boolean;

    @ApiPropertyOptional({ default: "system" })
    @IsOptional()
    @IsString()
    theme?: string;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    emailNotifications?: boolean;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    pushNotifications?: boolean;
}
