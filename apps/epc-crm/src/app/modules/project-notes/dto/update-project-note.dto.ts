import { PartialType } from '@nestjs/mapped-types';
import { CreateProjectNoteDto } from './create-project-note.dto';

export class UpdateProjectNoteDto extends PartialType(CreateProjectNoteDto) {}
