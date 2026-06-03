export function environment() {
  return {
    app: {
      hostUrl: process.env.FRONTEND_APP_URL || 'http://localhost:4200',
      environment: 'production',
    },
    postgres: {
      type: 'postgres',
      url: process.env.DATABASE_URL || '',
      autoLoadEntities: true,
      synchronize: false,
      logging: true,
      ssl: {
        rejectUnauthorized: false,
      },
      extra: {
        ssl: {
          rejectUnauthorized: false,
        },
      },
    },
    JWT_SECRET: process.env.JWT_SECRET,
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
      fromEmail: process.env.SENDGRID_FROM_EMAIL,
    },
  };
}
