<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Company Information (บริษัท เทคทันใจ อินโนเวชั่น จำกัด)
- **ชื่อภาษาไทย**: บริษัท เทคทันใจ อินโนเวชั่น จำกัด
- **ชื่อภาษาอังกฤษ**: TECHTHUNJAI INNOVATION CO., LTD.
- **Line Official (Line OA)**: `@techthunjai`
- **เบอร์โทรศัพท์**: `065-882-8333`
- **Email**: `athaporn@techthunjai.com`
- **Copyright Footer**: `© 2026 บริษัท เทคทันใจ อินโนเวชั่น จำกัด (TECHTHUNJAI INNOVATION CO., LTD.). All rights reserved.`

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

# Strict Security & File Storage Rules (กฎเหล็กความปลอดภัยและการจัดเก็บไฟล์)
- **ห้ามวางไฟล์ข้อมูล ฐานข้อมูล SQLite (`.db`), ไฟล์ Excel (`.xlsx`), หรือไฟล์ JSON ข้อมูลธุรกิจในโฟลเดอร์ `public/` เด็ดขาด**: ป้องกันการถูกแฮก การแอบสแกนดึงข้อมูล หรือการแอบดาวน์โหลดผ่านลิงก์ตรง (Direct Link Vulnerability)
- **ไฟล์ข้อมูลทั้งหมดต้องจัดเก็บในโฟลเดอร์ปิด `data/` ที่อยู่นอก Web Root เท่านั้น** เพื่อความปลอดภัย 100%

# GitHub Repository Information
- **Repository URL**: `https://github.com/Athaporn978/claim-thunjai.git`
- **Main Branch**: `main`

# VPS Production & Deployment Specification
- **VPS Server IP**: `103.76.181.143` (User: `root`)
- **SSH Key**: `~/.ssh/thunjaipos_tunnel`
- **Directory Path**: `/var/www/demo-claim`
- **PM2 Process Name / ID**: `demo-claim` (ID: 6)
- **Live Production URL**: [https://demo-claim.techthunjai.com/](https://demo-claim.techthunjai.com/)
- **Zero-Downtime Deployment Command**:
  ```bash
  ssh -i ~/.ssh/thunjaipos_tunnel root@103.76.181.143 "cd /var/www/demo-claim && git fetch origin main && git reset --hard origin/main && npm install && npx prisma generate && npx prisma db push && npm run build && pm2 restart demo-claim"
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

