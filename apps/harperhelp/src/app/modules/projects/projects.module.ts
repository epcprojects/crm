import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { Project } from './entities/project.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThreadController } from './thread.controller';
import { ThreadService } from './services/thread.service';
import { ThreadMessage } from './entities/thread-messages.entity';
import { FilesService } from '../files/files.service';
import { UtilityService } from '../utility/utility.service';
import { UtilityModule } from '../utility/utility.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ThreadMessage]),
    UtilityModule,
    FilesModule,
  ],
  controllers: [ProjectsController, ThreadController],
  providers: [ProjectsService, ThreadService],
})
export class ProjectsModule {}
