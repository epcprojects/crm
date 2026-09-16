import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class GetRoleQueryDTO {
    @ApiPropertyOptional({
        description:'Search Role by RoleName or Description',
        example: 'epc-crm',
    })
    @IsOptional()
    @IsString()
    search?: string
}