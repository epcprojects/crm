# Notification queue + Lambda integration

This module now supports two delivery paths:

1. Direct SendGrid delivery when no SQS queue URL is configured.
2. Queue-based delivery through SQS for an AWS Lambda worker that sends the email using SendGrid.

## Required environment variables

- SENDGRID_API_KEY
- SENDGRID_FROM_EMAIL
- FRONTEND_APP_URL
- APP_NAME
- AWS_REGION (defaults to us-east-1)
- NOTIFICATION_QUEUE_URL

## Lambda handler

The Lambda entry point is located at:

- apps/epc-crm/src/app/modules/notifications/queue/lambda/email-notification-handler.ts

It expects SQS records whose body contains the serialized notification event payload.
