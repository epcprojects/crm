import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileRecord } from './entities/file.entity';
import { UtilityModule } from '../utility/utility.module';

@Module({
  imports: [TypeOrmModule.forFeature([FileRecord]), UtilityModule],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
