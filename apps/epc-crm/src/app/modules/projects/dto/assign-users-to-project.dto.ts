import { ArrayNotEmpty, IsArray, IsUUID } from "class-validator";

   export class AssignUsersToProjectDto {
     @IsArray()
     @IsUUID('4', { each: true })
     @ArrayNotEmpty()
     userIds: string[];
   }