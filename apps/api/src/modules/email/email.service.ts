import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { ConfigService } from "@nestjs/config";

export interface MeetingConfirmationData {
    to: string;
    recipientName: string | null;
    meetingTitle: string;
    meetingId: string;
    scheduledStart?: Date | string;
    passcode?: string;
    isHost: boolean;
}

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private transporter: nodemailer.Transporter | null = null;

    constructor(private readonly config: ConfigService) {
        const host = this.config.get<string>("SMTP_HOST");
        const port = this.config.get<number>("SMTP_PORT") ?? 587;
        const user = this.config.get<string>("SMTP_USER");
        const pass = this.config.get<string>("SMTP_PASS");

        if (host && user && pass) {
            this.transporter = nodemailer.createTransport({
                host,
                port,
                secure: port === 465,
                auth: { user, pass },
            });
        } else {
            this.logger.warn("SMTP not configured — email sending disabled");
        }
    }

    async sendMeetingConfirmation(data: MeetingConfirmationData): Promise<void> {
        if (!this.transporter) return;

        const fromName = this.config.get<string>("EMAIL_FROM_NAME") ?? "VConnect";
        const fromAddr = this.config.get<string>("EMAIL_FROM_ADDRESS") ?? "noreply@vconnect.app";
        const appUrl = this.config.get<string>("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000";

        const joinUrl = `${appUrl}/meeting/${data.meetingId}`;
        const startTime = data.scheduledStart
            ? new Date(data.scheduledStart).toLocaleString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZoneName: "short",
              })
            : "Now";

        const subject = data.isHost
            ? `Meeting created: ${data.meetingTitle}`
            : `You're invited: ${data.meetingTitle}`;

        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e7eb;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="560" style="max-width:560px;background:#18181f;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 40px;">
          <table role="presentation" width="100%">
            <tr>
              <td>
                <div style="display:inline-flex;align-items:center;gap:10px;">
                  <div style="width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:10px;display:inline-block;text-align:center;line-height:36px;font-size:20px;">📹</div>
                  <span style="font-size:22px;font-weight:700;color:#fff;">VConnect</span>
                </div>
              </td>
            </tr>
          </table>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:36px 40px;">
          <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#fff;">
            ${data.isHost ? "Your meeting is ready" : "You have a meeting invitation"}
          </h1>
          <p style="margin:0 0 28px;color:#9ca3af;font-size:15px;">
            Hi ${data.recipientName ?? "there"},
          </p>
          <!-- Meeting card -->
          <div style="background:#0f0f14;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:24px;margin-bottom:28px;">
            <div style="font-size:18px;font-weight:600;color:#fff;margin-bottom:16px;">${data.meetingTitle}</div>
            <table role="presentation" width="100%" style="font-size:14px;color:#9ca3af;">
              <tr><td style="padding:4px 0;width:110px;">📅 When</td><td style="color:#e5e7eb;">${startTime}</td></tr>
              ${data.passcode ? `<tr><td style="padding:4px 0;">🔑 Passcode</td><td style="color:#e5e7eb;font-family:monospace;">${data.passcode}</td></tr>` : ""}
              <tr><td style="padding:4px 0;">🆔 Meeting ID</td><td style="color:#e5e7eb;font-family:monospace;">${data.meetingId}</td></tr>
            </table>
          </div>
          <!-- CTA button -->
          <div style="text-align:center;margin-bottom:24px;">
            <a href="${joinUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;font-weight:600;font-size:15px;text-decoration:none;border-radius:12px;">
              ${data.isHost ? "Open Meeting" : "Join Meeting"}
            </a>
          </div>
          <p style="margin:0;font-size:13px;color:#6b7280;text-align:center;">
            Or copy this link: <a href="${joinUrl}" style="color:#818cf8;">${joinUrl}</a>
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="border-top:1px solid rgba(255,255,255,0.06);padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#4b5563;">
            You received this because your account has email notifications enabled.<br>
            Manage preferences in <a href="${appUrl}/profile" style="color:#818cf8;">Profile & Settings</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

        try {
            await this.transporter.sendMail({
                from: `"${fromName}" <${fromAddr}>`,
                to: data.to,
                subject,
                html,
                text: `${subject}\n\nMeeting: ${data.meetingTitle}\nWhen: ${startTime}\nJoin: ${joinUrl}${data.passcode ? `\nPasscode: ${data.passcode}` : ""}`,
            });
            this.logger.log(`Email sent to ${data.to}: ${subject}`);
        } catch (err) {
            this.logger.error(`Failed to send email to ${data.to}: ${(err as Error).message}`);
        }
    }
}
