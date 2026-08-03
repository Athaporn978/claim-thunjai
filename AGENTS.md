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
- ** Prior Approval for Implementation Plan**: ต้องสรุปแผนงานและขออนุมัติจากผู้ใช้ก่อนเริ่มลงมือแก้ไขโค้ดเสมอ
- ** Git Commit & Push Prior Approval**: การทำ `git commit` และ `git push` ต้องสรุปและขออนุมัติจากผู้ใช้ก่อนทุกครั้ง หากไม่อนุมัติ ห้ามทำโดยเด็ดขาด
- ** Deployment Prior Approval**: การทำ Deploy หรือการรันคำสั่งปรับเปลี่ยนระบบ Production ต้องขออนุมัติจากผู้ใช้ก่อนทุกครั้ง หากไม่อนุมัติ ห้ามทำโดยเด็ดขาด

# Strict AI Document Extraction Rules (กฎเหล็กการตรวจจับใบเสนอราคาซ่อมด้วย AI)
- **เอกสาร PDF ที่จะผ่านการประมวลผลว่าเป็นใบเสนอราคาซ่อมรถยนต์ได้ ต้องมีรายการซ่อม (`items > 0`) หรือมีข้อมูลระบุตัวตนของรถยนต์/ประกันภัย (`licensePlate` / `claimNo` / `chassisNo`) เท่านั้น**
- **หากอัปโหลดไฟล์ที่ไม่เกี่ยวข้อง (เช่น IT Report, สต็อกสินค้า, หรือสเตทเมนต์) ระบบต้องตัดสิทธิ์และแสดง Popup Alert สีส้มเตือนทันที 100% ห้ามปล่อยให้หลุดผ่านแม้จะมีชื่อบริษัทลอยๆ**



