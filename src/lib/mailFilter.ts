// Cheap deny-list run BEFORE any AI call. Anything matching is obvious noise
// (daily reports, notifications, OTPs, unsubscribe blasts) — skip it entirely.
// Update this list as new noise patterns show up.

const SENDER_DENY = [
  "google",
  "lineman",
  "line man",
  "wongnai",
  "speakthunjai",
  "claimthunjai",
  "noreply",
  "no-reply",
  "no_reply",
  "donotreply",
  "do-not-reply",
  "notification",
  "notifications",
  "mailer-daemon",
  "mailchimp",
  "sendgrid",
  "postmaster",
  "hello@",
  "info@",
];

const SUBJECT_DENY = [
  "รายงานยอดขาย",
  "security alert",
  "2-step verification",
  "ชำระเงินสำเร็จ",
  "ลิงก์ตรวจสภาพรถ",
  "unsubscribe",
  "verification code",
  "your verification",
  "your daily",
  "weekly report",
  "your otp",
  "one-time password",
  "welcome to",
  "you're now using",
  "youre now using",
  "บิลค่า",
  "ใบเสร็จ",
  "statement",
  "receipt",
  "invoice",
];

export type FilterResult = { skip: false } | { skip: true; reason: string };

export function preFilter(fromEmail: string | undefined | null, subject: string | undefined | null): FilterResult {
  const f = (fromEmail || "").toLowerCase();
  const s = (subject || "").toLowerCase();
  for (const kw of SENDER_DENY) if (f.includes(kw)) return { skip: true, reason: `sender:${kw}` };
  for (const kw of SUBJECT_DENY) if (s.includes(kw.toLowerCase())) return { skip: true, reason: `subject:${kw}` };
  return { skip: false };
}
