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

// Route: /projects/:projectId/tickets/:ticketId/chat/:channel
// channel param is 'internal' or 'external'

@Controller('projects/:projectId/tickets/:ticketId/chat/:channel')
@UseGuards(JwtAuthGuard)
export class ChatMessagesController {
  constructor(
    private readonly service: ChatMessagesService,
    private readonly gateway: ChatMessagesGateway,
  ) {}

  // Fetch paginated message history for a channel on a ticket

  @Get('messages')
  async getMessages(
    @Param('projectId') projectId: string,
    @Param('ticketId') ticketId: string,
    @Param('channel') channel: ChatChannel,
    @Query() query: GetMessagesQueryDto,
    @GetUser() user: any,
  ) {
    // this.service.assertAccess(user.role, channel);

    // if (user.userType === UserType.EXTERNAL) {
    //   await this.service.assertExternalTicketAccess(user.id, ticketId);
    // }

    return this.service.getMessages(channel, ticketId, query);
  }

  // Send a message — persists to DB then broadcasts via socket

  @Post('messages')
  async sendMessage(
    @Param('projectId') projectId: string,
    @Param('ticketId') ticketId: string,
    @Param('channel') channel: ChatChannel,
    @Body() dto: SendMessageDto,
    @GetUser() user: any,
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
    @Param('projectId') projectId: string,
    @Param('ticketId') ticketId: string,
    @Param('channel') channel: ChatChannel,
    @Body() dto: MarkReadDto,
    @GetUser() user: any,
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
    @GetUser() user: any,
  ) {
    // this.service.assertAccess(user.role, channel);
    await this.service.softDelete(channel, messageId, user.id);
    return { success: true };
  }

  // Unread badge counts for both channels on a ticket

  @Get('unread')
  async getUnreadCounts(
    @Param('ticketId') ticketId: string,
    @GetUser() user: any,
  ): Promise<UnreadCountDto> {
    return this.service.getUnreadCounts(ticketId, user.id, user.userType);
  }
}
