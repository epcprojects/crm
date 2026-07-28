import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { SqsNotificationQueueModule } from './queue/sqs-notification-queue.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationsGateway } from './gateway/notifications.gateway';
import { WsJwtGuard } from '../../../common/guards/ws-jwt.guard';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    SqsNotificationQueueModule,
    JwtModule
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway, WsJwtGuard],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
