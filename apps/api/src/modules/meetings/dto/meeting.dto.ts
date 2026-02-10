import {
    IsString,
    IsOptional,
    IsBoolean,
    IsDateString,
    IsEnum,
    MinLength,
    MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";

export class CreateMeetingDto {
    @ApiProperty({ example: "Weekly Team Sync" })
    @IsString()
    @MinLength(1)
    @MaxLength(200)
    title!: string;

    @ApiPropertyOptional({ example: "Discuss project progress..." })
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    description?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    scheduledStart?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    scheduledEnd?: string;

    @ApiPropertyOptional({ enum: ["INSTANT", "SCHEDULED", "RECURRING", "PERSONAL_ROOM"] })
    @IsOptional()
    @IsEnum(["INSTANT", "SCHEDULED", "RECURRING", "PERSONAL_ROOM"])
    type?: "INSTANT" | "SCHEDULED" | "RECURRING" | "PERSONAL_ROOM";

    @ApiPropertyOptional({ example: "123456" })
    @IsOptional()
    @IsString()
    @MinLength(4)
    @MaxLength(20)
    passcode?: string;

    @ApiPropertyOptional({ default: false })
    @IsOptional()
    @IsBoolean()
    waitingRoom?: boolean;
}

export class UpdateMeetingDto extends PartialType(CreateMeetingDto) { }

export class JoinMeetingDto {
    @ApiPropertyOptional({ example: "123456" })
    @IsOptional()
    @IsString()
    passcode?: string;

    @ApiPropertyOptional({ example: "John Doe" })
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    guestName?: string;

    @ApiPropertyOptional({ example: "john@example.com" })
    @IsOptional()
    @IsString()
    guestEmail?: string;
}
