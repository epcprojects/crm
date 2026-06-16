import {
  Controller,
  Get,
  Param,
  Post,
  UseInterceptors,
  Body,
  UploadedFiles,
  UseGuards,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CreateThreadMessageDto } from './dto/create-thread-message.dto';
import { ThreadService } from './services/thread.service';
import { GetUser } from 'apps/harperhelp/src/common/decorators/get-user.decorator';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'apps/harperhelp/src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'apps/harperhelp/src/common/guards/roles.guard';

@Controller('projects/:pid/thread')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ThreadController {
  constructor(private readonly service: ThreadService) {}

  @Get()
  @ApiOperation({
    description: 'Find all thread messages related to a project.',
  })
  findAll(@Param('pid') pid: string) {
    return this.service.findAll(pid);
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
        },
        attachments: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
      required: ['message'],
    },
  })
  @UseInterceptors(FilesInterceptor('attachments', 10))
  @ApiOperation({
    description: 'Create a thread message for a project.',
  })
  create(
    @Param('pid') pid: string,
    @Body() dto: CreateThreadMessageDto,
    @UploadedFiles() files: Express.Multer.File[],
    @GetUser() user,
  ) {
    return this.service.create(pid, dto, user.id, files);
  }
}
