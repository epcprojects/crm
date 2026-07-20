import { Module } from '@nestjs/common';
import { SqsNotificationQueueService } from './sqs-notification-queue.service';

@Module({
  providers: [SqsNotificationQueueService],
  exports: [SqsNotificationQueueService],
})
export class SqsNotificationQueueModule {}
