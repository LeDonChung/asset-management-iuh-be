import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

export interface EmailOptions {
  to: string;
  subject: string;
  template?: string;
  context?: any;
  html?: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.createTransporter();
  }

  private createTransporter() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const secure = this.configService.get<boolean>('SMTP_SECURE', false);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !user || !pass) {
      this.logger.warn('SMTP configuration is missing, email service will be disabled');
      return;
    }

    // Special configuration for Gmail
    const isGmail = host.includes('gmail.com');
    
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
        // For Gmail with port 587, we need STARTTLS
        ...(isGmail && port === 587 && {
          ciphers: 'SSLv3',
        }),
      },
      // Gmail specific settings
      ...(isGmail && {
        service: 'gmail',
      }),
    });

    // Verify SMTP connection
    this.transporter.verify((error, success) => {
      if (error) {
        this.logger.error('SMTP configuration error:', error);
      } else {
        this.logger.log('SMTP server is ready to send emails');
      }
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('Email service is not configured, skipping email sending');
      return false;
    }

    try {
      let html = options.html;
      
      // If template is provided, compile it with context
      if (options.template) {
        html = await this.compileTemplate(options.template, options.context || {});
      }

      const mailOptions = {
        from: {
          name: this.configService.get<string>('SMTP_FROM_NAME', 'Asset Management System'),
          address: this.configService.get<string>('SMTP_FROM_EMAIL', this.configService.get<string>('SMTP_USER')),
        },
        to: options.to,
        subject: options.subject,
        html,
        text: options.text,
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully to ${options.to}, messageId: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  private async compileTemplate(templateName: string, context: any): Promise<string> {
    try {
      const templatePath = path.join(process.cwd(), 'templates', `${templateName}.hbs`);
      
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template ${templateName} not found`);
      }

      const templateSource = fs.readFileSync(templatePath, 'utf8');
      const template = handlebars.compile(templateSource);
      return template(context);
    } catch (error) {
      this.logger.error(`Failed to compile template ${templateName}:`, error);
      throw error;
    }
  }

  async sendResetPasswordEmail(email: string, resetToken: string, userName: string): Promise<boolean> {
    const resetUrl = `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3001')}/reset-password?token=${resetToken}`;
    
    return this.sendEmail({
      to: email,
      subject: 'Đặt lại mật khẩu - Asset Management System',
      template: 'reset-password',
      context: {
        userName,
        resetUrl,
        expiryTime: '5 phút',
        supportEmail: this.configService.get<string>('SUPPORT_EMAIL', 'support@assetmanagement.com'),
        companyName: 'Industrial University of Ho Chi Minh City',
        year: new Date().getFullYear(),
      },
    });
  }

  async sendWelcomeEmail(email: string, userName: string, temporaryPassword: string): Promise<boolean> {
    const loginUrl = `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3001')}/login`;
    
    return this.sendEmail({
      to: email,
      subject: 'Chào mừng đến với Asset Management System',
      template: 'welcome',
      context: {
        userName,
        temporaryPassword,
        loginUrl,
        supportEmail: this.configService.get<string>('SUPPORT_EMAIL', 'support@assetmanagement.com'),
        companyName: 'Industrial University of Ho Chi Minh City',
        year: new Date().getFullYear(),
      },
    });
  }
}
