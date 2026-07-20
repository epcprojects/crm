import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { SqsNotificationQueueModule } from './queue/sqs-notification-queue.module';

@Module({
  imports: [SqsNotificationQueueModule],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
