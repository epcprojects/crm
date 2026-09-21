import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { GetUser } from '../../../../common/decorators/get-user.decorator';
import { PushService } from './push.service';
import {
  SubscribePushDto,
  UnsubscribePushDto,
} from './dto/push-subscription.dto';

@Controller('push')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Get('public-key')
  getPublicKey() {
    return this.pushService.getPublicKey();
  }

  @Post('subscribe')
  @HttpCode(204)
  async subscribe(@GetUser('id') userId: string, @Body() dto: SubscribePushDto) {
    await this.pushService.subscribe(userId, dto);
  }

  @Post('unsubscribe')
  @HttpCode(204)
  async unsubscribe(
    @GetUser('id') userId: string,
    @Body() dto: UnsubscribePushDto,
  ) {
    await this.pushService.unsubscribe(userId, dto.endpoint);
  }
}
