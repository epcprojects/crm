import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';

import { ChatMessagesService, ChatChannel } from './chat.service';
import { ChatMessagesGateway } from './gateway/chat-messages.gateway';
import {
  SendMessageDto,
  MarkReadDto,
  GetMessagesQueryDto,
  UnreadCountDto,
} from './dto/chat-message.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { GetUser } from '../../../common/decorators/get-user.decorator';
import { UserType } from '@harperhelp/types';
import { ApiBearerAuth, ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UpdateChatDto } from './dto/update-chat.dto';
import { pid } from 'process';

// Route: /projects/:projectId/tickets/:ticketId/chat/:channel
// channel param is 'internal' or 'external'
@ApiTags('Chat Messages')
@Controller('projects/:projectId/tickets/:ticketId/chat/:channel')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
export class ChatMessagesController {
  constructor(
    private readonly service: ChatMessagesService,
    private readonly gateway: ChatMessagesGateway,
  ) {}

  // Fetch paginated message history for a channel on a ticket

  @Get('messages')
  @ApiQuery({ name: 'limit', required: false, type: String })
  @ApiQuery({ name: 'cursorCreatedAt', required: false, type: String })
  @ApiQuery({ name: 'cursorId', required: false, type: String })
  async getMessages(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('channel') channel: ChatChannel,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Query() query: GetMessagesQueryDto,
    @GetUser() user,
  ) {
  
    return this.service.getMessages(projectId, channel, ticketId, query);
  }

  // Send a message — persists to DB then broadcasts via socket

  @Post('messages')
  async sendMessage(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Param('channel') channel: ChatChannel,
    @Body() dto: SendMessageDto,
    @GetUser() user,
  ) {
    // this.service.assertAccess(user.role, channel);

    // if (user.userType === UserType.EXTERNAL) {
    //   await this.service.assertExternalTicketAccess(user.id, ticketId);
    // }

    const message = await this.service.send(
      channel,
      projectId,
      ticketId,
      user.id,
      dto,
    );

    // Real-time broadcast to all clients in this room
    this.gateway.broadcastMessage(projectId, ticketId, channel, message);

    return message;
  }

  // Mark a batch of messages as read

  @Patch('messages/read')
  async markRead(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Param('channel') channel: ChatChannel,
    @Body() dto: MarkReadDto,
    @GetUser() user,
  ) {
    // this.service.assertAccess(user.role, channel);

    await this.service.markRead(channel, ticketId, user.id, dto.messageIds);

    // Notify sender(s) their messages were read
    this.gateway.broadcastReadReceipt(
      projectId,
      ticketId,
      channel,
      dto.messageIds,
      user.id,
    );

    return { success: true };
  }

  // Soft delete — only sender can delete their own message

  @Delete('messages/:messageId')
  async deleteMessage(
    @Param('channel') channel: ChatChannel,
    @Param('messageId') messageId: string,
    @GetUser() user,
  ) {
    // this.service.assertAccess(user.role, channel);
    const { pid, tid } = await this.service.softDelete(
      channel,
      messageId,
      user.id,
    );

    console.debug('deleting message for ticket: ', tid, ' in project: ', pid);

    // broadcast deleted message
    this.gateway.broadcastMessageDeleted(pid, tid, channel, messageId);

    return { success: true };
  }

  @Put('messages/:messageId')
  async update(
    @Param('channel') channel: ChatChannel,
    @Param('messageId') messageId: string,
    @Body() dto: UpdateChatDto,
    @GetUser() user,
  ) {
    const { projectId, ticketId, ...msg } = await this.service.update(
      channel,
      messageId,
      user.id,
      dto,
    );

    // broadcast updated message
    this.gateway.broadcastMessageUpdated(projectId, ticketId, channel, {
      messageId,
      ...msg,
    });

    return { success: true };
  }

  // Unread badge counts for both channels on a ticket

  @Get('unread')
  async getUnreadCounts(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @GetUser() user,
  ): Promise<UnreadCountDto> {
    return this.service.getUnreadCounts(ticketId, user.id, user.userType);
  }

  @Post('messages/:messageId/reactions')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        emoji: {
          type: 'string',
          example: '❤️',
        },
      },
      required: ['emoji'],
    },
  })
  async addReaction(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Param('channel') channel: ChatChannel,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() { emoji }: { emoji: string },
    @GetUser() user,
  ) {
    const {
      projectId: pid,
      ticketId: tid,
      ...msg
    } = await this.service.addReaction(
      projectId,
      ticketId,
      channel,
      messageId,
      user,
      emoji,
    );

    this.gateway.broadcastMessageReacted(pid, tid, channel, {
      messageId,
      ...msg,
    });
    return { success: true };
  }

  @Delete('messages/:messageId/reactions')
  async removeReaction(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Param('channel') channel: ChatChannel,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @GetUser() user,
  ) {
    const {
      projectId: pid,
      ticketId: tid,
      ...msg
    } = await this.service.removeReaction(
      projectId,
      ticketId,
      channel,
      messageId,
      user.id,
    );

    this.gateway.broadcastMessageReacted(pid, tid, channel, {
      messageId,
      ...msg,
    });
    return { success: true };
  }
}
