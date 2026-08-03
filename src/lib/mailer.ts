// Thin Resend wrapper. If RESEND_API_KEY isn't set, we log the email to the
// server console and return { sent:false, mocked:true } so the admin UI can
// still show the customer link (copy-paste flow) instead of hard-erroring.

import { Resend } from "resend";

const KEY = process.env.RESEND_API_KEY;
const FROM = process.env.MAIL_FROM || "ClaimThunJai <onboarding@resend.dev>";

type SendResult = { sent: boolean; mocked?: boolean; id?: string; error?: string };

export async function sendMail(args: { to: string; subject: string; html: string; text?: string }): Promise<SendResult> {
  if (!KEY) {
    console.log("[mailer:mock] to=%s subject=%s", args.to, args.subject);
    return { sent: false, mocked: true };
  }
  try {
    const resend = new Resend(KEY);
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
    });
    if (error) return { sent: false, error: error.message || String(error) };
    return { sent: true, id: data?.id };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : "Unknown" };
  }
}

// Build the inspection-link email (Thai-first).
export function inspectionInviteEmail(args: { customer: string; link: string; licensePlate?: string }) {
  const subject = `[ClaimThunJai] ลิงก์ตรวจสภาพรถ ${args.licensePlate ? `ทะเบียน ${args.licensePlate}` : ""}`.trim();
  const html = `
<div style="font-family: 'Sarabun', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
  <div style="border-bottom: 3px solid #0a1f44; padding-bottom: 12px; margin-bottom: 20px;">
    <div style="font-size: 20px; font-weight: 700; color: #0a1f44;">ClaimThunJai</div>
    <div style="font-size: 12px; color: #64748b;">ระบบตรวจสภาพรถยนต์ · ต่อกรมธรรม์</div>
  </div>
  <p style="font-size: 15px; color: #1e293b;">สวัสดีครับ คุณ ${escapeHtml(args.customer)}</p>
  <p style="font-size: 14px; color: #334155; line-height: 1.7;">
    บริษัทประกันได้เริ่มขั้นตอน <b>ต่อกรมธรรม์</b> สำหรับรถของท่านแล้ว
    กรุณาถ่ายรูปรอบคัน 8 มุม + เลขไมล์ / เลขตัวถัง / สมุดจดทะเบียน
    ผ่านลิงก์ด้านล่างบนโทรศัพท์มือถือ (ระบบจะเปิดกล้องให้อัตโนมัติ)
  </p>
  <p style="text-align: center; margin: 28px 0;">
    <a href="${args.link}" style="background: #ff7a1a; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block;">เริ่มถ่ายรูปตรวจสภาพ →</a>
  </p>
  <p style="font-size: 12px; color: #64748b; word-break: break-all;">
    หรือคัดลอกลิงก์นี้ไปเปิดในเบราว์เซอร์:<br>${escapeHtml(args.link)}
  </p>
  <p style="font-size: 11px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
    ลิงก์นี้เป็นลิงก์เฉพาะสำหรับท่าน กรุณาอย่าเผยแพร่ต่อ · ClaimThunJai
  </p>
</div>`;
  const text = `สวัสดีครับ คุณ ${args.customer}\n\nกรุณาถ่ายรูปตรวจสภาพรถผ่านลิงก์นี้บนโทรศัพท์มือถือ:\n${args.link}\n\nClaimThunJai`;
  return { subject, html, text };
}

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
