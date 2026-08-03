# Gmail IMAP Poller — Setup Guide

Reads unseen emails from a Gmail label and feeds them into ClaimThunJai's
existing intake pipeline (AI extract + damage analysis + pricing).

## 1. Gmail — enable 2-Step Verification
https://myaccount.google.com/security → turn on 2-Step Verification.

## 2. Create an App Password
https://myaccount.google.com/apppasswords → App name `ClaimThunJai` → **Create**.
Google shows a 16-char password ONCE. Save it.

## 3. Create the label + filter (Gmail web)
- Left sidebar → **Create new label** → name it `claim-intake`.
- Settings → **Filters and Blocked Addresses** → **Create a new filter**.
- Filter by e.g. `Subject contains [CLAIM]` → **Create filter** →
  ✅ Apply the label `claim-intake`.
  ✅ Never send to Spam.

Any email with `[CLAIM]` in the subject sent to your Gmail will land in that
label and the poller will pick it up.

## 4. Configure `.env`
Copy `.env.example` → `.env` and fill:
```
IMAP_USER="thongiam.noodle@gmail.com"
IMAP_PASS="abcdefghijklmnop"     # the 16-char App Password, no spaces
IMAP_LABEL="claim-intake"
APP_URL="http://localhost:3015"
```

## 5. Run the poller (in a separate terminal from `npm run dev`)
```
npm run poll:gmail
```

You'll see: `Connected. Polling every 60 s.` — send a test email to the
mailbox with subject `[CLAIM] test` and any body + photos; within a minute
the console logs `✓ ingested uid … → INT-… (completed|needs_info)` and the
new case appears at `/intake`.

## Security notes
- The `.env` file is git-ignored — never commit real App Passwords.
- Rotate App Passwords every ~90 days from the same Google page.
- The Gmail filter is the ONLY thing that keeps personal email out of the
  pipeline. Tighten the filter (add sender allowlist, require subject prefix)
  before pointing production centers at this mailbox.
