import {
    IsString,
    IsOptional,
    IsInt,
    IsArray,
    ArrayMinSize,
    MinLength,
    MaxLength,
    Min,
    Max,
    IsDateString,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateBreakoutRoomsDto {
    @ApiProperty({ example: ["Room A", "Room B", "Room C"] })
    @IsArray()
    @ArrayMinSize(1)
    @IsString({ each: true })
    names!: string[];

    @ApiPropertyOptional({ example: 15, description: "Duration in minutes before auto-close" })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(120)
    durationMinutes?: number;

    @ApiPropertyOptional({
        description: "Auto-assign participants evenly across rooms",
        default: false,
    })
    @IsOptional()
    autoAssign?: boolean;
}

export class UpdateBreakoutRoomDto {
    @ApiPropertyOptional({ example: "Group A" })
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    name?: string;

    @ApiPropertyOptional({ description: "ISO timestamp when room ends" })
    @IsOptional()
    @IsDateString()
    endsAt?: string;
}

export class AssignParticipantsDto {
    @ApiProperty({ example: ["participantId1", "participantId2"] })
    @IsArray()
    @ArrayMinSize(1)
    @IsString({ each: true })
    participantIds!: string[];
}
