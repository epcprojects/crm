import { ProjectRoles, UserType } from '@harperhelp/types';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class InviteUserDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  fullName: string;

  @ApiProperty({
    enum: UserType,
    example: UserType.INTERNAL,
  })
  @IsEnum(UserType)
  userType: UserType;

  @ApiProperty()
  @IsString()
  roleKey: string;

  @ApiProperty()
  @IsArray()
  @IsOptional()
  projectIds?: string[];
}
