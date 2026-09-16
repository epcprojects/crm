import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProjectNotesController } from './project-notes.controller';
import { ProjectNotesService } from './project-notes.service';
import { ProjectNote } from './entities/project-note.entity';
import { Project } from '../projects/entities/project.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectNote, Project])],
  controllers: [ProjectNotesController],
  providers: [ProjectNotesService],
})
export class ProjectNotesModule {}
