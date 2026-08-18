import {
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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { SearchNotificationsDto } from './dto/search-notification.dto';
import { GetUser } from '../../../common/decorators/get-user.decorator';
import { FindCategorizedNotificationsDto } from './dto/find-categorized-notifications.dto';
import { NotificationCategory } from './enum/notification-category.enum';

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
  ) {
    return this.notificationsService.findForUser(req.user.id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      unreadOnly: unreadOnly === 'true',
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
  @Get('categorized')
  @ApiOperation({
    summary: 'Categorized notifications',
    description:
      'No `category` param → returns the first 5 notifications for each of the 5 categories (projects, threads, tickets, ticket_replies, other), keyed by category. ' +
      'With `category` param → returns the next page (default 5) for that category only, using `cursor` for scroll-based pagination.',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: NotificationCategory,
    description:
      'Fetch only this category, paginated. Omit to get the initial 5-per-category snapshot.',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    type: String,
    description:
      "Opaque cursor from a previous response's `nextCursor`. Only used together with `category`.",
    example:
      'MjAyNi0wOC0xOFQxMDozMDowMFpfYzQ4ZjhjZTAtMTIzNC00NTY3LTg5YWItY2RlZjAxMjM0NTY3',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (max 20). Defaults to 5.',
    example: 5,
  })
  @ApiQuery({
    name: 'unreadOnly',
    required: false,
    type: Boolean,
    description: 'Filter to unread notifications only.',
    example: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Categorized notifications retrieved successfully.',
    schema: {
      oneOf: [
        {
          title: 'Initial load (no category param)',
          example: {
            projects: {
              items: [
                {
                  id: 'c48f8ce0-1234-4567-89ab-cdef01234567',
                  entityType: 'project',
                  isRead: false,
                  createdAt: '2026-08-18T10:30:00Z',
                },
              ],
              nextCursor:
                'MjAyNi0wOC0xOFQxMDozMDowMFpfYzQ4ZjhjZTAtMTIzNC00NTY3LTg5YWItY2RlZjAxMjM0NTY3',
            },
            threads: { items: [], nextCursor: null },
            tickets: { items: [], nextCursor: null },
            ticket_replies: { items: [], nextCursor: null },
            other: { items: [], nextCursor: null },
          },
        },
        {
          title: 'Single category page (category param present)',
          example: {
            category: 'tickets',
            items: [
              {
                id: 'a1b2c3d4-1234-4567-89ab-cdef01234567',
                entityType: 'ticket',
                isRead: true,
                createdAt: '2026-08-17T09:00:00Z',
              },
            ],
            nextCursor: null,
          },
        },
      ],
    },
  })
  findCategorized(
    @GetUser() user,
    @Query() dto: FindCategorizedNotificationsDto,
  ) {
    return this.notificationsService.findCategorized(user.id, dto);
  }

  @Get('unread-count-by-category')
  @ApiOperation({
    summary: 'Unread notification counts, grouped by category',
    description:
      'Independent of pagination — a straight COUNT grouped by category. Call once on page load and again after any mark-as-read action.',
  })
  @ApiResponse({
    status: 200,
    description: 'Unread counts per category.',
    schema: {
      example: {
        projects: 2,
        threads: 0,
        tickets: 5,
        ticket_replies: 3,
        other: 0,
      },
    },
  })
  async unreadCountByCategory(@GetUser() user) {
    return this.notificationsService.getUnreadCountsByCategory(user.id);
  }
}
