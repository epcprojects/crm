import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';
import { adminInviteTemplate } from './templates/invite.email.template';
import { forgotPasswordTemplate } from './templates/forgot-password.email.template';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly configService: ConfigService) {
    sgMail.setApiKey(this.configService.get<string>('sendgrid.apiKey'));
  }

  private async sendEmail(msg: sgMail.MailDataRequired) {
    try {
      this.logger.log('Email data ===>', msg);
      await sgMail.send(msg);

      this.logger.log(`Email sent to ${msg.to}`);
    } catch (error) {
      const errorMessage =
        error.response?.body?.errors?.[0]?.message || error.message;

      this.logger.error(`Failed sending email to ${msg.to}: ${errorMessage}`);
    }
  }

  async sendAdminInviteEmail(params: {
    to: string;
    fullName: string;
    role: string;
    organizationName: string;
    inviteToken: string;
  }) {
    const { to, fullName, role, organizationName, inviteToken } = params;

    const APP_URL = this.configService.get<string>('app.hostUrl');

    const inviteLink = `${APP_URL}/auth/accept-invite?token=${inviteToken}`;

    const html = adminInviteTemplate({
      fullName,
      role,
      organizationName,
      inviteLink,
    });

    const msg: sgMail.MailDataRequired = {
      to,

      from: {
        email: this.configService.get<string>('sendgrid.fromEmail'),
        name: 'HarperHelp',
      },

      subject: `You're invited to join '${organizationName}'`,

      html,
    };

    return this.sendEmail(msg);
  }

  async sendForgotPasswordEmail(params: {
    to: string;
    fullName: string;
    resetToken: string;
  }) {
    const { to, fullName, resetToken } = params;
    const APP_URL = this.configService.get<string>('app.hostUrl');

    const resetLink = `${APP_URL}/auth/set-password?token=${resetToken}`;

    const html = forgotPasswordTemplate({
      fullName,
      resetLink,
    });

    const msg: sgMail.MailDataRequired = {
      to,
      from: {
        email: this.configService.get<string>('sendgrid.fromEmail'),
        name: 'HarperHelp',
      },
      subject: 'Reset your password',
      html,
    };

    return this.sendEmail(msg);
  }
}
