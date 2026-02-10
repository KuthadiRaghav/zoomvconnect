import { IsEmail, IsString, MinLength, MaxLength, Matches } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RegisterDto {
    @ApiProperty({ example: "john@example.com" })
    @IsEmail()
    email!: string;

    @ApiProperty({ example: "Password123" })
    @IsString()
    @MinLength(8)
    @Matches(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
    @Matches(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
    @Matches(/[0-9]/, { message: "Password must contain at least one number" })
    password!: string;

    @ApiProperty({ example: "John Doe" })
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    name!: string;
}

export class LoginDto {
    @ApiProperty({ example: "john@example.com" })
    @IsEmail()
    email!: string;

    @ApiProperty({ example: "Password123" })
    @IsString()
    @MinLength(8)
    password!: string;
}

export class RefreshTokenDto {
    @ApiProperty()
    @IsString()
    refreshToken!: string;
}

export class TokenResponseDto {
    @ApiProperty()
    accessToken!: string;

    @ApiProperty()
    refreshToken!: string;

    @ApiProperty({ description: "Token expiry in seconds" })
    expiresIn!: number;
}
