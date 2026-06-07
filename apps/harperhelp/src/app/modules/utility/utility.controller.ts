import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UtilityService } from './utility.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ApiOperation, ApiQuery } from '@nestjs/swagger';
import { RolesGuard } from '../../../common/guards/roles.guard';

@Controller('utility')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UtilityController {
  constructor(private utilityService: UtilityService) {}

  // TODO: Permissions guard to be added here.
  @Get('presigned-url')
  @ApiQuery({
    name: 'key',
    type: String,
    required: true,
    example: 'projects/{pid}/tickets/{tid}/screenshot01.png',
  })
  @ApiQuery({
    name: 'action',
    type: String,
    required: true,
    example: 'upload',
  })
  @ApiOperation({
    summary:
      'Get validated presigned url. Pass upload or download as action query param',
  })
  async getPresignedUrl(
    @Query('key') key: string,
    @Query('action') action: 'upload' | 'download',
    @Query('contentType') contentType?: string,
  ) {
    const url = await this.utilityService.generatePresignedUrl({
      key,
      action,
      contentType,
    });

    return { url };
  }
}
