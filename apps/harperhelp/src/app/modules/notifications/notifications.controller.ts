import {
  BadRequestException,
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SearchNotificationsDto } from './dto/search-notification.dto';
import { GetUser } from '../../../common/decorators/get-user.decorator';

@Controller('notifications')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /** Full paginated list -- backs the Notifications page. */
  @Get()
  async findAll(
    @Req() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('grouped') grouped?: string,
    @Query('category') category?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const parsedUnreadOnly = unreadOnly === 'true';

    if (category) {
      if (!this.notificationsService.isSupportedCategory(category)) {
        throw new BadRequestException('Unsupported notification category.');
      }

      return this.notificationsService.findCategoryForUser(req.user.id, {
        category,
        limit: parsedLimit,
        offset: offset ? parseInt(offset, 10) : 0,
        unreadOnly: parsedUnreadOnly,
      });
    }

    if (grouped === 'true') {
      return this.notificationsService.findGroupedForUser(req.user.id, {
        limitPerGroup: parsedLimit,
        unreadOnly: parsedUnreadOnly,
      });
    }

    return this.notificationsService.findForUser(req.user.id, {
      page: page ? parseInt(page, 10) : 1,
      limit: parsedLimit,
      unreadOnly: parsedUnreadOnly,
    });
  }

  @Get('search')
  @ApiOperation({ summary: 'Search notifications' })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully.',
  })
  search(@Query() dto: SearchNotificationsDto, @GetUser() user) {
    return this.notificationsService.search(dto, user);
  }

  /** Top 5 -- the bell dropdown. */
  @Get('recent')
  async findRecent(@Req() req) {
    return this.notificationsService.findTopForUser(req.user.id, 5);
  }

  @Get('unread-count')
  async unreadCount(@Req() req) {
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    return { unreadCount: count };
  }

  @Patch(':id/read')
  async markAsRead(@Req() req, @Param('id') id: string) {
    await this.notificationsService.markAsRead(req.user.id, id);
    return { success: true };
  }

  @Patch('read-all')
  async markAllAsRead(@Req() req) {
    await this.notificationsService.markAllAsRead(req.user.id);
    return { success: true };
  }
}
