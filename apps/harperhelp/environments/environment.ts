export function environment() {
  return {
    app: {
      hostUrl: process.env.FRONTEND_APP_URL || 'http://localhost:4200',
      environment: 'development',
    },
    file_size: {
      max_attachment_size: parseInt(
        process.env.MAX_ATTACHMENT_SIZE || '10',
        10,
      ),
    },
    postgres: {
      type: 'postgres',
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      password: process.env.DB_PASSWORD,
      username: process.env.DB_USERNAME,
      autoLoadEntities: true,
      database: process.env.DB_DATABASE,
      synchronize: true,
      logging: true,
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
      fromEmail: process.env.SENDGRID_FROM_EMAIL,
    },
    aws: {
      region: process.env.AWS_REGION || 'us-east-1',
      sqs: {
        notificationQueueUrl: process.env.NOTIFICATION_QUEUE_URL,
      },
    },
  };
}
