<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Brand Displayed on Website (แบรนด์ที่แสดงบนหน้าเว็บ)
- **ชื่อเต็ม**: H TECHNOLOGY AND SERVICES COMPANY LIMITED
- **ชื่อย่อ**: H TECHNOLOGY
- **โดเมนอีเมล (ใช้ใน logic ล็อกอิน/สิทธิ์แอดมิน + บัญชีจริงใน DB)**: `@htechnology.com`
- **Line OA / เบอร์โทร / ลิงก์ติดต่อ**: ยังไม่มีข้อมูลใหม่ — ซ่อน/เอาออกจากหน้าเว็บไปก่อน จนกว่าจะได้ข้อมูลจริงของ H Technology
- **Copyright Footer**: **ไม่แสดงบนหน้าเว็บเด็ดขาด** ไม่ว่าจะเป็นชื่อ TechThunJai หรือ H Technology (ดูเหตุผลที่หัวข้อ Copyright Ownership ด้านล่าง)
- **โลโก้**: ใช้ไฟล์ `public/logo/Htech_logo.webp`

# Copyright Ownership (ข้อมูลภายใน — ห้ามเผยแพร่บนหน้าเว็บ Public)
- **ลิขสิทธิ์ Source Code ทั้งหมดของระบบนี้ยังคงเป็นของบริษัท เทคทันใจ อินโนเวชั่น จำกัด (TechThunJai Innovation CO., LTD.) 100%**
- ผู้ใช้ (เจ้าของลิขสิทธิ์) นำระบบนี้ไปขายต่อในนามแบรนด์ H Technology ให้ลูกค้าปลายทางแบบ B2B2B ภายใต้สัญญาระหว่าง TechThunJai และ H Technology โดยไม่เปิดเผยความเป็นเจ้าของ TechThunJai ต่อสาธารณะ
- **ห้ามลบหรือแก้ไขข้อความในหัวข้อนี้เด็ดขาด** แม้จะมีการแก้ไข/เปลี่ยนแบรนด์ที่แสดงผลบนเว็บในอนาคตก็ตาม เพราะเป็นบันทึกสิทธิ์ความเป็นเจ้าของที่แท้จริงของระบบ

# Strict UI/UX Design Rules (กฎเหล็กด้านดีไซน์และโทนสี)
- **ห้ามใช้ปุ่ม, แบดจ์, ช่องกรอก, หรือแถบเครื่องมือที่เป็นสีดำเข้ม (`bg-slate-900`, `bg-black`, `bg-slate-800`) โดยเด็ดขาด** (ผู้ใช้ไม่ชอบสีดำ)
- **ให้ใช้โทนสีน้ำเงินสดใสพรีเมียม (`#0071e3`, `bg-blue-600`, `bg-[#0071e3]`, `from-blue-700 to-indigo-800`) เป็นสีหลักสำหรับองค์ประกอบของปุ่ม, Dropdown, Badge, และ Toolbar เสมอ**

# Strict Command & Workflow Execution Rules (กฎเหล็กขั้นตอนการทำงาน)
- **Prior Approval for Implementation Plan**: ต้องสรุปแผนงาน 3 ข้อ (1. ปัญหาคืออะไร 2. จะแก้อย่างไร 3. ผลลัพธ์เป็นอย่างไร) และขออนุมัติจากผู้ใช้ก่อนเริ่มลงมือแก้ไขโค้ดเสมอ
- **Git Commit & Push Prior Approval**: การทำ `git commit` และ `git push` ต้องสรุปและขออนุมัติจากผู้ใช้ก่อนทุกครั้ง หากไม่อนุมัติ ห้ามทำโดยเด็ดขาด
- **Deployment Prior Approval**: การทำ Deploy หรือการรันคำสั่งปรับเปลี่ยนระบบ Production ต้องขออนุมัติจากผู้ใช้ก่อนทุกครั้ง หากไม่อนุมัติ ห้ามทำโดยเด็ดขาด
- **Check Solution History Log First**: ก่อนนำเสนอวิธีแก้ไขหรือลงมือปรับแก้โค้ดทุกครั้ง Antigravity **ต้องอ่านบันทึกประวัติการแก้ไขใน `AGENTS.md` ก่อนทุกครั้ง** เพื่อป้องกันไม่ให้ใช้วิธีที่เคยล้มเหลว หรือกลับไปแก้ไขซ้ำรอยเดิม

# Solution History Log & Lessons Learned (บันทึกประวัติการแก้ไขและบทเรียนที่ห้ามทำซ้ำ)
- ❌ **ห้ามใช้วิธีดักจับตัวเลขชื่อไฟล์ (`"1"`, `"2"`, `"3"`, `"nissan"`, `"honda"`)**:
  - *ผลลัพธ์*: ❌ **ล้มเหลว (Failed)**
  - *สาเหตุที่ล้มเหลว*: ไฟล์จริงของผู้ใช้ชื่อ `ใบเสนอราคาที่_1.pdf` มีเลข 1 ในชื่อไฟล์ พอไปเขียนดักเลข 1 ระบบจึงไปบังคับดึงข้อมูล Mock "คุณน้ำทิพย์ / Nissan" มาทับเอกสารจริง (ที่เป็น Honda / นายศักดิ์สิทธิ์)
  - *กฎเหล็ก*: ห้ามดักจับชื่อไฟล์ด้วยตัวเลขหรือยี่ห้อเด็ดขาด ต้องอ่านเนื้อหาจริงจาก PDF เท่านั้น
- ❌ **ห้ามใช้ Regex ถอดตารางรายการซ่อมที่เข้มงวดเกินไป**:
  - *ผลลัพธ์*: ❌ **ล้มเหลว (Failed)**
  - *สาเหตุที่ล้มเหลว*: พอถอด Mock ออก Regex เดิมที่ฟิกซ์แพทเทิร์นทำให้บรรทัดที่มีลำดับ 1., มีวงเล็บ หรือเว้นวรรคถูกข้าม ส่งผลให้แสดงผลเป็น `0 รายการซ่อม` และฟิลด์ว่างเปล่า
  - *กฎเหล็ก*: ต้องใช้ Smart Flexible Item Parser ที่ยืดหยุ่น จับทุกบรรทัดชิ้นส่วน/ค่าแรงที่มีราคาตัวเลข และกรองเฉพาะที่อยู่/เบอร์โทร/เลขซีปออกเท่านั้น
- ✅ **การสั่ง Reset State (`form = EMPTY`) ทันทีเมื่ออัปโหลดใหม่**:
  - *ผลลัพธ์*: ✅ **สำเร็จ (Passed)**
  - *รายละเอียด*: ป้องกันไม่ให้ข้อมูลจากไฟล์เดิมตกค้างเมื่อผู้ใช้สลับไฟล์หรือเลือกอัปโหลดไฟล์ใหม่
- ⏳ **การใช้ Smart Flexible Item Parser (ปรับปรุงตัวอ่าน PDF ภาษาไทย)**:
  - *สถานะ*: ⏳ **รอผู้ใช้ทดสอบและยืนยันผล (Pending User Verification)**
  - *รายละเอียด*: ปรับปรุงการถอดข้อความภาษาไทย (ชื่อลูกค้า, ศูนย์ซ่อม, ยี่ห้อ/รุ่น) และถอดตารางรายการซ่อมที่ยืดหยุ่นโดยไม่ใช้ Mock (ยังต้องรอผู้ใช้อนุมัติและทดสอบจริง)
- ❌ **ข้อมูล Deploy ใน AGENTS.md เดิมผิด 4 จุด — เคยทำให้ deploy ล้มเหลวซ้ำๆ**:
  - *ผลลัพธ์*: ❌ **ล้มเหลว (Failed)** จนกว่าจะแก้ครบทั้ง 4 จุด
  - *สาเหตุ*: (1) SSH key `thunjaipos_tunnel` → Permission denied ต้องใช้ `vps503_root` (2) PM2 ID 6 เป็นคนละโปรเจกต์แล้ว (`chat-thunjai`) ตัวจริงคือ ID 2 (3) รันด้วย root ติด `dubious ownership` เพราะ repo เป็นของ user `deploy` (4) ไฟล์ DB production คือ `prisma/demo.db` ไม่ใช่ `dev.db`
  - *กฎเหล็ก*: **ก่อน deploy ทุกครั้งให้ยืนยันของจริงบนเซิร์ฟเวอร์ก่อน** (`pm2 list` ในนาม `deploy`, `ss -tlnp`, `grep DATABASE_URL .env`) อย่าเชื่อค่าในเอกสารอย่างเดียว และถ้าพบว่าต่างจากเอกสาร **ให้อัปเดตเอกสารทันที**
- ✅ **แยกตาราง Log ค่าใช้จ่ายภายใน ออกจาก Log ที่ลูกค้าเห็น**:
  - *ผลลัพธ์*: ✅ **สำเร็จ (Passed)**
  - *รายละเอียด*: `ApiUsageLog` (ต้นทุน AI/token/USD) = ภายในเท่านั้น ห้ามโชว์ลูกค้า / `UploadTransactionLog` (ใคร-เมื่อไหร่-ไฟล์ไหน-เคสอะไร) = ใช้ออก invoice ลูกค้าเห็นได้
  - *กฎเหล็ก*: **ห้ามเพิ่มฟิลด์ต้นทุน/USD/token เข้าตาราง `UploadTransactionLog` เด็ดขาด** (มีได้แค่ `apiUsageLogId` ที่เป็นกุญแจเชื่อม) และหน้า `/reports/upload-transactions` **แสดงต้นทุน/กำไรได้เฉพาะบัญชีเจ้าของระบบ โดยต้องกรองที่ฝั่ง server ใน API เท่านั้น** (`isSystemOwner()` จาก env `SYSTEM_OWNER_EMAILS`) ห้ามใช้วิธีซ่อนที่หน้าจอ และ**ห้ามผูกกับ Role ใน DB** เพราะ Super Admin ของลูกค้าแก้ Role ให้ตัวเองได้ผ่าน `/admin/roles`

# Core Business Logic: Price Matching (Logic การจับคู่ราคาค่าแรง & อะไหล่)
- **ค่าแรง (Labor) — มีการ match อัตโนมัติกับราคากลาง**: ใช้ `src/app/api/extract-quote/route.ts` (เริ่มบรรทัด ~314)
  1. ตรวจคำสำคัญจาก `CORE_BODY_KEYWORDS` ก่อน ถ้าไม่เจอจะตัดคำกริยานำหน้า (เคาะ/พ่นสี/เปลี่ยน/ถอดประกอบ) ด้วย regex เพื่อดึง keyword
  2. `detectSeverityTier()` เดาระดับความเสียหายจากคำ: "เปลี่ยน"→replace, "เคาะ"→severe, "พ่นสี/ประกอบ"→moderate, "ขัด/เบา"→minor (default = moderate)
  3. ค้นหาใน `RepairPrice` แบบ progressive-relaxation: (keyword+vehicleType+size ตรงหมด) → (keyword+vehicleType) → (keyword อย่างเดียว)
  4. **เป็น exact/substring matching (`contains`) เท่านั้น ไม่มี Fuzzy Matching หรือ Levenshtein Distance**
- **ค่าอะไหล่ (Parts) — ยังไม่มีการ match อัตโนมัติ (GAP ที่ต้องระวังเวลาพูดกับลูกค้า/เขียนเอกสาร)**:
  - รายการ `itemType === "part"` **ไม่ query ตาราง `PartCatalogPrice` เลยตอนสร้างใบเสนอราคา** → `standardPrice` ถูกตั้งเท่ากับราคาที่อู่เสนอมาโดยตรง (ไม่มีการเทียบราคากลาง)
  - `PartCatalogPrice` ถูกใช้แค่ตอนแอดมิน import ข้อมูล (`src/app/api/parts-catalog/import/route.ts`) ยังไม่เชื่อมกับ flow เทียบราคาจริง
  - **ห้ามเขียนในเอกสารเสนอราคา/สื่อการตลาดว่าอะไหล่มีการ auto-match ราคากลางแล้ว** จนกว่าจะพัฒนาฟีเจอร์นี้จริง
- **สูตรคำนวณ "ราคาควบคุม" (Controlled Price)**: พบใน `src/app/quotation/new/page.tsx` บรรทัด 414
  ```
  controlled = (standardPrice != null && standardPrice < quotedPrice) ? standardPrice : quotedPrice
  ```
  คือ ถ้ามีราคากลางและถูกกว่าราคาที่อู่เสนอ → ใช้ราคากลาง (ลดราคาลง) / ถ้าไม่มีราคากลางหรือราคากลางแพงกว่า/เท่ากับ → ใช้ราคาที่อู่เสนอตามจริง (ระบบไม่มีทางปรับราคาขึ้นเกินที่อู่เสนอ) ผู้ใช้ override เองได้ผ่าน `ItemsTable.tsx` หรือค้นหาราคากลางเองผ่าน `StandardPricePicker.tsx`
  - ผลรวม (`totalQuoted`, `totalControlled`, `totalSaving`, `savingPct`) คำนวณใน `src/lib/quotation.ts` บรรทัด 59–73 โดยไม่มี business rule เพิ่มเติมนอกจากที่ตั้งค่า `controlledUnit` ไว้แล้ว

# Strict Security & File Storage Rules (กฎเหล็กความปลอดภัยและการจัดเก็บไฟล์)
- **ห้ามวางไฟล์ข้อมูล ฐานข้อมูล SQLite (`.db`), ไฟล์ Excel (`.xlsx`), หรือไฟล์ JSON ข้อมูลธุรกิจในโฟลเดอร์ `public/` เด็ดขาด**: ป้องกันการถูกแฮก การแอบสแกนดึงข้อมูล หรือการแอบดาวน์โหลดผ่านลิงก์ตรง (Direct Link Vulnerability)
- **ไฟล์ข้อมูลทั้งหมดต้องจัดเก็บในโฟลเดอร์ปิด `data/` ที่อยู่นอก Web Root เท่านั้น** เพื่อความปลอดภัย 100%

# GitHub Repository Information
- **Repository URL**: `https://github.com/Athaporn978/claim-thunjai.git`
- **Main Branch**: `main`

# VPS Production & Deployment Specification
> ⚠️ ข้อมูลชุดนี้ตรวจสอบจริงบนเซิร์ฟเวอร์แล้วเมื่อ 30 ก.ย. 2569 — ค่าเดิม 4 จุด (SSH key, PM2 ID, user, ไฟล์ DB) **ผิดทั้งหมด** ดูหัวข้อบทเรียนท้ายไฟล์

- **VPS Server IP**: `103.76.181.143` (SSH เข้าด้วย user `root`)
- **SSH Key**: `~/.ssh/vps503_root` ← **ห้ามใช้ `~/.ssh/thunjaipos_tunnel` (Permission denied)**
- **Directory Path**: `/var/www/demo-claim`
- **เจ้าของไฟล์ / user ที่รันแอปจริง**: `deploy` (**ไม่ใช่ `root`**)
- **PM2 Process Name / ID**: `demo-claim` (ID: **2**) — ID 6 ปัจจุบันคือ `chat-thunjai` คนละโปรเจกต์
- **Port**: `3125` (nginx reverse proxy → `127.0.0.1:3125`)
- **ไฟล์ฐานข้อมูล Production**: `prisma/demo.db` (~426MB) — **ไม่ใช่ `dev.db`** (`dev.db` คือของเครื่อง Local)
- **env ที่ต้องมีใน `.env` ทั้ง Local และ Production**: `ANTHROPIC_API_KEY`, `DATABASE_URL`, `SYSTEM_OWNER_EMAILS` (อีเมลเจ้าของระบบ คั่นด้วย `,`), `USD_TO_THB` (อัตราแปลงต้นทุน AI) — ดู `.env.example`
- **Live Production URL**: [https://demo-claim.techthunjai.com/](https://demo-claim.techthunjai.com/)

- **Zero-Downtime Deployment Command**:
  ```bash
  ssh -i ~/.ssh/vps503_root root@103.76.181.143 "su - deploy -c 'cd /var/www/demo-claim && git fetch origin main && git reset --hard origin/main && npm install && npx prisma generate && npx prisma db push && npm run build && pm2 restart demo-claim'"
  ```
  **ต้องครอบด้วย `su - deploy -c '...'` เสมอ** ถ้ารันตรงด้วย root จะเจอ `fatal: detected dubious ownership` และถ้าฝืนข้ามไป ไฟล์ `node_modules/` กับ `.next/` จะกลายเป็นของ root ทำให้แอปที่รันด้วย user `deploy` พังทันที

- **Backup ฐานข้อมูลก่อน `prisma db push` ทุกครั้ง** (บังคับ เมื่อมีการแก้ schema):
  ```bash
  ssh -i ~/.ssh/vps503_root root@103.76.181.143 "cd /var/www/demo-claim/prisma && cp demo.db demo.db.bak-\$(date +%Y%m%d-%H%M%S)"
  ```

# Completed Tasks Log (บันทึกผลงานที่ดำเนินการเสร็จสิ้นเรียบร้อยแล้ว)
1. **🤖 AI Document Extraction (Nissan & Multi-brand Support)**:
   - ระบบ AI อ่านและถอดข้อมูลใบเสนอราคาซ่อม ถอด Popup สีส้มเตือนออก 100% อ่านเอกสาร Nissan และยี่ห้ออื่นๆ ได้อย่างราบรื่น
2. **✏️ Editable Discount Amount & Keyboard Input**:
   - ปลดล็อกช่องส่วนลดในหน้าสร้างเคส (`/quotation/new`) ให้ลบ พิมพ์แก้ไขตัวเลขส่วนลดจากคีย์บอร์ดได้อย่างอิสระ โดยไม่มีการดึงตัวเลขขยะ `7,061.40` มาทับ
3. **🏢 Dynamic Branch RBAC & User Session Binding**:
   - ผูกชื่อผู้สร้างและสาขาจาก Session ในการสร้างเคส และปรับระบบแยกสิทธิ์มองเห็นตามสาขาสังกัดแบบ Dynamic 100% (รองรับสาขาใหม่ ชลบุรี/ขอนแก่น ฯลฯ โดยไม่ต้องแก้โค้ด)
4. **💙 Premium Blue Saving Banner & Approved Edit Locking**:
   - ปรับแถบยอดประหยัดในหน้าดูรายงาน (`/quotations/[id]`) เป็นโทนสีน้ำเงินพรีเมียม (`#0071e3`) พร้อมป้ายชื่อกำกับชัดเจน และซ่อนปุ่ม *"✏️ แก้ไข"* เมื่อเคสอนุมัติเสร็จสิ้นแล้ว
5. **🖨️ PDF Margin Safety & Responsive Layout**:
   - หน้าจอปกติ: แสดงตารางสรุปอนุมัติสุทธิ **จัดกึ่งกลาง** สวยงาม
   - หน้าพิมพ์ PDF: ตารางชิดขวา หัวข้อชิดซ้าย พร้อมขอบกระดาษพิมพ์ `@page margin: 15mm 12mm` และระยะปลอดภัย `.card padding: 12px 16px` ป้องกันข้อความบนสุดและซ้ายสุดตกขอบ PDF 100%
6. **🐙 GitHub Repository Integration**:
   - สร้างและเชื่อมต่อโปรเจกต์เข้ากับ GitHub Repository: `https://github.com/Athaporn978/claim-thunjai.git` สาขา `main`
7. **🚀 VPS Production Deployment & 100% Full Clone**:
   - Deploy ขึ้นระบบ Production VPS `103.76.181.143` (`/var/www/demo-claim`) PM2 ID: 6 `demo-claim`
   - ซิงค์ฐานข้อมูล `dev.db` และแคตตาล็อกราคากลางค่าแรงซ่อม 504 รายการหลัก + อะไหล่ทุกยี่ห้อ พร้อมเปิดใช้งานจริงที่: [https://demo-claim.techthunjai.com/](https://demo-claim.techthunjai.com/)
8. **🔒 Private Sample Excel Files (Data Directory Only)**:
   - สร้างไฟล์ตัวอย่าง Excel 2 ไฟล์ (`sample_parts_catalog_import.xlsx` และ `sample_repair_labor_import.xlsx`) จัดเก็บไว้ในโฟลเดอร์ปิด `data/` ในเครื่อง Local เท่านั้น และถอดออกจาก `public/` บนเว็บทั้งหมดเพื่อความปลอดภัยสูงสุด
9. **🛡️ Block Direct Excel Downloads & Clean Legacy Files**:
   - เพิ่มบล็อกความปลอดภัยใน Next.js Config (`next.config.ts`) ให้ Redirect การเรียกใช้ไฟล์ `.xlsx`, `.xls`, `.csv`, `.db` ตรงๆ จาก URL ทั้งหมดไปที่ 404 Not Found 100%
   - สั่งลบไฟล์ส่วนเกินและไฟล์ขยะประเภท Excel ทั้งหมดในโฟลเดอร์ `/var/www/demo-claim/public/` บนเครื่อง VPS พร้อม Deploy และ Rebuild เปิดใช้งานจริงเรียบร้อยแล้ว
10. **📄 CEO Proposal Word Document (Claim-Thunjai)**:
    - สร้างสคริปต์ `scripts/Claude_generate_proposal.py` (python-docx) สร้างไฟล์เสนอราคาระดับผู้บริหาร ฟอนต์ TH Sarabun New 16pt โทนสีน้ำเงินพรีเมียม พร้อมสารบัญที่มีเลขหน้าถูกต้อง 100% (ตรวจสอบด้วยการ render เป็น PDF ผ่าน `soffice` + `pdfplumber` ทุกครั้งที่แก้ layout)
    - เอกสารล่าสุด (11 หน้า) นำเสนอ H Technology CO., LTD. วันที่ 4 สิงหาคม 2569 ครอบคลุม Modules/Features, System Architecture (Anthropic Claude API เท่านั้น — **ไม่มี Gemini/PostgreSQL ในระบบจริง**), Tech Stack, และราคา Pay-Per-Completed-Transaction (Starter 30 / Growth 27 / Enterprise 25 / Strategic Partner 22 บาทต่อเคส)
    - ไฟล์ผลลัพธ์: `data/Claude_Proposal_Claim_Thunjai.docx` (เก็บนอก `public/` ตามกฎความปลอดภัย)
    - **บทเรียน**: เดิมมีสคริปต์ `scripts/generate_proposal_docx.py` ที่ระบุ API ผิด (อ้าง Gemini/PostgreSQL ที่ไม่มีจริงในระบบ) — ห้ามใช้เป็นต้นแบบซ้ำ ให้ยึดโค้ดจริงเป็นหลักเสมอเวลาระบุ Stack/API ในเอกสารการตลาด
11. **🏷️ Rebrand หน้าเว็บทั้งหมดเป็น H Technology (B2B2B White-label)**:
    - เปลี่ยนข้อความแบรนด์ทุกจุดที่แสดงผลบนหน้าเว็บ (67 จุดเดิม ใน 21 ไฟล์) จาก "TechThunJai/เทคทันใจ" → "H TECHNOLOGY AND SERVICES COMPANY LIMITED" (ชื่อเต็ม) / "H TECHNOLOGY" (ชื่อย่อ) ครอบคลุม: หน้าแรก, หน้า login, parts-catalog, mock insurer name, i18n.ts
    - เปลี่ยนโดเมนอีเมล hardcode ในทุก logic ล็อกอิน/สิทธิ์แอดมิน (`login/route.ts`, `PortalLayout.tsx`, `Sidebar.tsx`, `quotations/*`, `reports/*`, `admin/*`, `parts-catalog/import/*`) จาก `@techthunjai.com` → `@htechnology.com`
    - **อัปเดตฐานข้อมูลจริง `dev.db`** (ตาราง `Employee`, `Quotation.createdByEmail`, `SystemAuditLog.details/performerName`, `Insurer.name/nameTh`) ให้ตรงกับโดเมนใหม่ พร้อม backup ไฟล์ก่อนแก้ (`dev.db.bak-<timestamp>`) — ยืนยันด้วยการ login จริงผ่าน API หลังแก้แล้วใช้งานได้ปกติ 100%
    - อัปเดต `scripts/seed-mock-data.mjs` ให้ seed ด้วยโดเมนใหม่ด้วย ป้องกัน regression หากมีการ reseed ฐานข้อมูลในอนาคต
    - **ลบ Copyright footer ออกจากทุกหน้าเว็บทั้งหมด** (ไม่แสดงทั้งชื่อ TechThunJai และ H Technology) และเอา Line OA/เบอร์โทร/ลิงก์ `techthunjai.com` ออกจากหน้าแรกและ Demo Bar เนื่องจากยังไม่มีข้อมูลติดต่อใหม่ของ H Technology
    - แทนที่ไอคอนโลโก้ตัวอักษร (SVG รูปสามเหลี่ยม) ด้วยไฟล์ภาพจริง `public/logo/Htech_logo.webp` ใน 4 จุด: `Header.tsx`, `Sidebar.tsx`, `login/page.tsx`, ใบรายงานพิมพ์ `quotations/[id]/page.tsx`
    - **สิ่งที่จงใจไม่แตะ (Out of Scope)**: ชื่อ Product "ClaimThunJai/ClaimThunJai AI" (ยังคงไว้ เพราะเป็นชื่อสินค้า ไม่ใช่ชื่อบริษัท), ไฟล์ `scripts/generate_proposal_docx.py` และ `scripts/Claude_generate_proposal.py` (เป็นเอกสารเสนอราคาที่ TechThunJai ใช้ติดต่อขายให้ H Technology เอง — สลับข้อมูลผิดจะทำให้เอกสารความหมายผิด), URL Production `demo-claim.techthunjai.com` ในหัวข้อ VPS (เป็นโดเมน Infra จริงที่ยังไม่ได้เปลี่ยน DNS)
    - **บทเรียน**: ต้องตรวจข้อมูลจริงในฐานข้อมูล (`dev.db` ที่ root ของโปรเจกต์ ไม่ใช่ `prisma/dev.db` ที่เป็นไฟล์ว่างเก่า) ควบคู่กับโค้ดเสมอเวลา rebrand เพราะ RBAC logic เทียบอีเมลกับค่าที่บันทึกจริงใน DB ถ้าแก้แค่โค้ดแต่ไม่แก้ข้อมูล จะทำให้สิทธิ์แอดมิน/การกรองสาขาใช้งานไม่ได้ทันที
12. **📚 Batch Upload (อัปโหลดหลายเคสพร้อมกัน สูงสุด 5 ไฟล์)**:
    - ปุ่ม *"📚 อัปโหลดหลายเคส (สูงสุด 5)"* ในหน้า `/quotation/new` — **1 ไฟล์ = 1 เคส** (ต่างจากปุ่มสแกนเดิมที่ หลายไฟล์ = 1 เคส ซึ่งยังทำงานเหมือนเดิมไม่กระทบ)
    - ประมวลผล **ทีละไฟล์ (sequential)** เพื่อให้แต่ละไฟล์ได้ context ของ AI ใหม่แยกกัน และไฟล์ที่พังไฟล์เดียวจะไม่ทำให้ทั้ง batch หยุด
    - แสดง progress `สำเร็จแล้ว x/5` แบบสด + สถานะรายไฟล์ (รอคิว / AI กำลังอ่าน / กำลังบันทึก / ✅ เลขเคส / ❌ สาเหตุที่ล้มเหลว) เลือกเกิน 5 ไฟล์จะทำ 5 ไฟล์แรกแล้วแจ้งว่าข้ามกี่ไฟล์
    - เพิ่ม guard กันปิดแท็บระหว่าง batch กำลังรัน (เดิม `beforeunload` เช็คแค่ `dirty` ซึ่ง batch ไม่ได้ตั้ง ทำให้ปิดแท็บแล้วไฟล์ที่เหลือหายเงียบ)
    - จำนวนสูงสุดคุมด้วยค่าคงที่ `MAX_BATCH_FILES` ตัวเดียวใน `src/app/quotation/new/page.tsx` ถ้าจะปรับเป็น 10 แก้บรรทัดเดียว
13. **🧾 Upload Audit Log — สำหรับออก Invoice เรียกเก็บเงินแบบ Per-Transaction**:
    - **ปัญหาเดิมที่ร้ายแรง**: `extract-quote` จะลอง `pdf-parse` (อ่าน text ในเครื่อง) ก่อน **ถ้าอ่านเจอรายการจะไม่เรียก Claude API เลย → ไม่มี log แม้แต่แถวเดียว** ทำให้ออกใบแจ้งหนี้ตามจำนวน transaction จริงไม่ได้ และ `recordUsage` เดิมก็ไม่เคยส่ง `userEmail`/`branchName` เข้าไป (เป็น null ทั้งหมด)
    - สร้างตาราง **`UploadTransactionLog`** เขียน **1 แถวต่อ 1 ครั้งที่เรียกสแกน ครอบคลุมครบทั้ง 3 เส้นทาง**: pdf-parse สำเร็จ / Claude สำเร็จ / ล้มเหลว
    - เก็บ: ชื่อผู้อัปโหลด, อีเมล, สาขา, วันเวลา, ชื่อไฟล์, จำนวนไฟล์, โหมด (single/batch), ผลสำเร็จ, สาเหตุที่ล้มเหลว, จำนวนรายการที่อ่านได้, เลขที่เคสที่ได้
    - **ดึงตัวตนผู้ใช้จาก session cookie ที่เซ็นแล้ว (`getSession()`) ไม่ใช่จาก request body** → พนักงานปลอมชื่อคนอื่นผ่าน browser ไม่ได้
    - **หน่วยที่นับเงิน = `success === true`** (อ่านสำเร็จ) ส่วนไฟล์เสียที่อ่านไม่ได้ยังบันทึกไว้แต่ไม่นับเงิน เพื่อให้เห็นว่ามีการสแกนซ้ำ / เคสที่สแกนสำเร็จแต่ไม่ได้บันทึกเคส (`quotationId` ว่าง) จะนับเงินและขึ้นในการ์ด *"สแกนแล้วไม่ได้บันทึกเคส"*
    - หน้ารายงาน **`/reports/upload-transactions`** (เมนู *"บันทึกการอัปโหลด"*) — **ทุกคนที่ล็อกอินเห็นได้ เพื่อความโปร่งใส** มีตัวกรองช่วงวันที่ (เดือนนี้/เดือนที่แล้ว), ค้นหา, Export Excel (มีคอลัมน์ *"นับเรียกเก็บเงิน"* 1/0) และการ์ดสรุป 4 ใบ
    - **สิ่งที่จงใจไม่ทำ**: ไม่ผูกตารางนี้เข้ากับ `ApiUsageLog` และ **ไม่มีฟิลด์ต้นทุน/USD/token ใดๆ ทั้งในตารางและหน้าเว็บ** เพราะรายงานนี้ให้ลูกค้าที่ถูกเรียกเก็บเงินดู (ดูกฎเหล็กในหัวข้อ Solution History Log)

