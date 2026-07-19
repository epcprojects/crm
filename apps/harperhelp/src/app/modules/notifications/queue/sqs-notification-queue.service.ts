import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { EmailNotificationEvent } from '../notifications.types';

@Injectable()
export class SqsNotificationQueueService {
  private readonly logger = new Logger(SqsNotificationQueueService.name);
  private readonly client: SQSClient;

  constructor(private readonly configService: ConfigService) {
    this.client = new SQSClient({
      region: this.configService.get<string>('aws.region') || 'us-east-1',
    });
  }

  async publish(event: EmailNotificationEvent): Promise<void> {
    const queueUrl = this.configService.get<string>(
      'aws.sqs.notificationQueueUrl',
    );

    if (!queueUrl) {
      this.logger.warn(
        'Notification queue URL is not configured; skipping SQS publish',
      );
      return;
    }

    await this.client.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(event),
      }),
    );

    this.logger.log(`Queued notification event ${event.type}`);
  }
}
