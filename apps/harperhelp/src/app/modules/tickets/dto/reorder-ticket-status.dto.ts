import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

export class ReorderTicketStatusDto {
    @ApiProperty({
        example: 'b2f76fd9-f17f-40ab-b6fd-1b4724e5db3a',
    })
    @IsUUID()
    statusId: string;

    @ApiProperty({
        example: 2,
    })
    @IsInt()
    @Min(0)
    newIndex: number;
}