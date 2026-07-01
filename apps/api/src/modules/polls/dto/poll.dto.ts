import { IsString, IsArray, IsInt, Min, Max, ArrayMinSize, ArrayMaxSize, IsNotEmpty } from "class-validator";

export class CreatePollDto {
    @IsString()
    @IsNotEmpty()
    question: string;

    @IsArray()
    @ArrayMinSize(2)
    @ArrayMaxSize(10)
    @IsString({ each: true })
    options: string[];
}

export class VotePollDto {
    @IsInt()
    @Min(0)
    @Max(9)
    optionIndex: number;
}
