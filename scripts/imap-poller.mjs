// Gmail IMAP poller for ClaimThunJai email intake.
// Reads unseen messages under a specified label (default "claim-intake"),
// extracts the body + inline/attached images, and POSTs each mail to /api/intake
// so the app's existing AI pipeline runs (extract fields + analyze photos + price).
//
// SETUP (Gmail):
//   1. Enable 2-Step Verification on the mailbox.
//   2. Create an App Password (16 chars) at https://myaccount.google.com/apppasswords
//   3. Create a Gmail label "claim-intake" and a filter that applies it to
//      incoming emails (e.g. Subject contains [CLAIM]).
//   4. Copy .env.example → .env and fill IMAP_USER / IMAP_PASS.
//   5. Run: node scripts/imap-poller.mjs
//
// It marks each processed message as \Seen so it isn't re-ingested.

import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import AdmZip from "adm-zip";

// Duplicate of src/lib/mailFilter.ts (kept in sync manually — small enough).
const SENDER_DENY = ["google","lineman","line man","wongnai","speakthunjai","claimthunjai","noreply","no-reply","no_reply","donotreply","do-not-reply","notification","notifications","mailer-daemon","mailchimp","sendgrid","postmaster","hello@","info@"];
const SUBJECT_DENY = ["รายงานยอดขาย","security alert","2-step verification","ชำระเงินสำเร็จ","ลิงก์ตรวจสภาพรถ","unsubscribe","verification code","your verification","your daily","weekly report","your otp","one-time password","welcome to","you're now using","youre now using","บิลค่า","ใบเสร็จ","statement","receipt","invoice"];
function preFilter(from, subject) {
  const f = (from || "").toLowerCase(); const s = (subject || "").toLowerCase();
  for (const kw of SENDER_DENY) if (f.includes(kw)) return { skip: true, reason: `sender:${kw}` };
  for (const kw of SUBJECT_DENY) if (s.includes(kw.toLowerCase())) return { skip: true, reason: `subject:${kw}` };
  return { skip: false };
}

const HOST = process.env.IMAP_HOST || "imap.gmail.com";
const PORT = Number(process.env.IMAP_PORT || 993);
const USER = process.env.IMAP_USER;
const PASS = process.env.IMAP_PASS;
const LABEL = process.env.IMAP_LABEL || "claim-intake";
// Default to the local server address commonly used during development.
// If you run the app on a different port, set APP_URL in your .env.
const APP_URL = process.env.APP_URL || `http://127.0.0.1:${process.env.PORT || 3001}`;
const POLL_MS = Number(process.env.POLL_INTERVAL_MS || 60_000);
const MAX_IMAGES = 20;

if (!USER || !PASS) {
  console.error("Missing IMAP_USER / IMAP_PASS in env. See .env.example.");
  process.exit(1);
}

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

async function ingestOne(client, uid) {
  const raw = await client.download(uid, undefined, { uid: true });
  if (!raw?.content) return { ok: false, reason: "no content" };

  // Buffer stream
  const chunks = [];
  for await (const chunk of raw.content) chunks.push(chunk);
  const buf = Buffer.concat(chunks);

  const mail = await simpleParser(buf);
  const from = mail.from?.text || "";
  const subject = mail.subject || "";
  const body = mail.text || mail.html || "";

  // Pre-filter locally to skip obvious noise before the network hop.
  const f = preFilter(from, subject);
  if (f.skip) return { ok: true, skipped: true, reason: f.reason };

  // Collect images from attachments (inline + regular + zip archives)
  const images = [];
  for (const att of mail.attachments || []) {
    if (!att.contentType || !att.content?.length) continue;
    
    const isZip = att.contentType === "application/zip" || 
                  att.contentType === "application/x-zip-compressed" || 
                  (att.filename && att.filename.toLowerCase().endsWith(".zip"));

    if (isZip) {
      try {
        console.log(`Unzipping attachment: ${att.filename || "archive.zip"} (${att.content.length} bytes)…`);
        const zip = new AdmZip(att.content);
        const zipEntries = zip.getEntries();
        for (const entry of zipEntries) {
          if (entry.isDirectory) continue;
          const entryName = entry.entryName.toLowerCase();
          let mimeType = null;
          if (entryName.endsWith(".jpg") || entryName.endsWith(".jpeg")) mimeType = "image/jpeg";
          else if (entryName.endsWith(".png")) mimeType = "image/png";
          else if (entryName.endsWith(".webp")) mimeType = "image/webp";
          else if (entryName.endsWith(".gif")) mimeType = "image/gif";
          
          if (mimeType) {
            const entryData = entry.getData();
            if (entryData && entryData.length > 0) {
              if (images.length >= MAX_IMAGES) break;
              images.push({
                data: entryData.toString("base64"),
                mediaType: mimeType,
              });
              console.log(`  extracted image from zip: ${entry.entryName}`);
            }
          }
        }
      } catch (err) {
        console.error(`Failed to unzip attachment ${att.filename || "archive"}:`, err?.message);
      }
    } else if (ALLOWED_MIME.has(att.contentType)) {
      if (images.length >= MAX_IMAGES) break;
      images.push({
        data: Buffer.from(att.content).toString("base64"),
        mediaType: att.contentType,
      });
    }
  }

  const res = await fetch(`${APP_URL}/api/intake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fromEmail: from, subject, emailBody: body, images }),
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    console.warn("Failed to parse /api/intake response as JSON:", e?.message);
  }
  console.log(`POST ${APP_URL}/api/intake -> ${res.status} ${res.statusText}`, data ? (data.intake ? `intake:${data.intake.intakeNo}` : data) : "(no-json)");
  return { ok: res.ok, intakeNo: data?.intake?.intakeNo, status: data?.intake?.status };
}

async function pollMailbox(client, mailboxName) {
  let box = null;
  try {
    box = await client.getMailboxLock(mailboxName);
  } catch (e) {
    return false;
  }
  try {
    const unseen = await client.search({ seen: false }, { uid: true });
    if (unseen.length === 0) {
      return false;
    }
    console.log(`[${new Date().toISOString()}] processing ${unseen.length} new email(s) in "${mailboxName}"`);
    for (const uid of unseen) {
      try {
        const r = await ingestOne(client, uid);
        if (r.skipped) {
          console.log(`  ⊘ uid ${uid} filtered out (${r.reason})`);
        } else if (r.ok) {
          console.log(`  ✓ uid ${uid} → ${r.intakeNo} (${r.status})`);
        } else {
          console.warn(`  ✗ uid ${uid} failed:`, r.reason || r);
        }
        await client.messageFlagsAdd({ uid }, ["\\Seen"], { uid: true });
      } catch (e) {
        console.error(`  ✗ uid ${uid} error:`, e?.message);
      }
    }
    return true;
  } finally {
    box.release();
  }
}

async function poll(client) {
  const processed = await pollMailbox(client, LABEL);
  if (!processed && LABEL !== "INBOX") {
    await pollMailbox(client, "INBOX");
  }
}

async function main() {
  console.log(`Connecting to ${HOST}:${PORT} as ${USER} (label=${LABEL})…`);
  const client = new ImapFlow({ host: HOST, port: PORT, secure: true, auth: { user: USER, pass: PASS }, logger: false });
  await client.connect();
  console.log("Connected. Polling every", POLL_MS / 1000, "s. (Ctrl+C to stop)");

  const tick = async () => {
    try { await poll(client); } catch (e) { console.error("poll error:", e?.message); }
    setTimeout(tick, POLL_MS);
  };
  await tick();
}

main().catch((e) => { console.error("fatal:", e); process.exit(1); });
