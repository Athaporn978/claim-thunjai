import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import path from "path";
import fs from "fs";
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Font, Image } from "@react-pdf/renderer";
import JSZip from "jszip";

export const runtime = "nodejs";

const fontRegPath = path.join(process.cwd(), "public", "fonts", "Sarabun-Regular.ttf");
const fontBoldPath = path.join(process.cwd(), "public", "fonts", "Sarabun-Bold.ttf");

let fontsRegistered = false;
function ensureFonts() {
  if (fontsRegistered) return;
  Font.register({ family: "Sarabun", fonts: [
    { src: fontRegPath },
    { src: fontBoldPath, fontWeight: "bold" },
  ]});
  fontsRegistered = true;
}

const styles = StyleSheet.create({
  page: { fontFamily: "Sarabun", fontSize: 10, padding: "15mm 12mm", backgroundColor: "#fff", color: "#1a1a1a" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: "#0071e3" },
  logo: { width: 36, height: 36 },
  brandBlock: { flex: 1, paddingLeft: 10 },
  brandName: { fontSize: 13, fontWeight: "bold", color: "#0071e3" },
  brandSub: { fontSize: 8, color: "#64748b", marginTop: 1 },
  docTitle: { fontSize: 14, fontWeight: "bold", color: "#0b132a", textAlign: "right" },
  docNo: { fontSize: 9, color: "#64748b", textAlign: "right", marginTop: 2 },
  section: { marginBottom: 10 },
  sectionTitle: { fontSize: 9, fontWeight: "bold", color: "#0071e3", textTransform: "uppercase", marginBottom: 4, letterSpacing: 0.5 },
  infoGrid: { flexDirection: "row", gap: 20 },
  infoCol: { flex: 1 },
  infoRow: { flexDirection: "row", marginBottom: 3 },
  infoLabel: { fontSize: 8.5, color: "#64748b", width: 80 },
  infoValue: { fontSize: 8.5, color: "#1a1a1a", fontWeight: "bold", flex: 1 },
  table: { marginTop: 6 },
  tableHeader: { flexDirection: "row", backgroundColor: "#0b132a", padding: "5 8", borderRadius: 3 },
  tableHeaderText: { color: "#fff", fontSize: 8, fontWeight: "bold" },
  tableRow: { flexDirection: "row", padding: "4 8", borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0" },
  tableRowAlt: { backgroundColor: "#f8fafc" },
  colNo: { width: 24, fontSize: 8 },
  colName: { flex: 1, fontSize: 8 },
  colType: { width: 36, fontSize: 8, textAlign: "center" },
  colQuoted: { width: 58, fontSize: 8, textAlign: "right" },
  colControl: { width: 58, fontSize: 8, textAlign: "right" },
  colSaving: { width: 52, fontSize: 8, textAlign: "right", color: "#ea580c" },
  totalsBox: { marginTop: 10, alignItems: "flex-end" },
  totalsInner: { width: 220, borderTopWidth: 1.5, borderTopColor: "#0071e3", paddingTop: 6 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  totalLabel: { fontSize: 8.5, color: "#64748b" },
  totalValue: { fontSize: 8.5, fontWeight: "bold", color: "#1a1a1a" },
  totalSavingRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4, paddingTop: 4, borderTopWidth: 0.5, borderTopColor: "#e2e8f0" },
  totalSavingLabel: { fontSize: 9, fontWeight: "bold", color: "#0071e3" },
  totalSavingValue: { fontSize: 9, fontWeight: "bold", color: "#ea580c" },
  statusBadge: { fontSize: 8, fontWeight: "bold", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  footer: { position: "absolute", bottom: 15, left: "12mm", right: "12mm", flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.5, borderTopColor: "#e2e8f0", paddingTop: 4 },
  footerText: { fontSize: 7, color: "#94a3b8" },
});

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusLabel(s: string) {
  if (s === "approved" || s === "finalized") return "อนุมัติแล้ว";
  if (s === "pending_approval") return "รออนุมัติ";
  if (s === "pending_review") return "รอตรวจสอบ";
  if (s === "rejected") return "ตีกลับ";
  return "บันทึกร่าง";
}

function QuotationPDF({ q }: { q: any }) {
  const logoPath = path.join(process.cwd(), "public", "logo", "Htech_logo.webp");
  const logoSrc = fs.existsSync(logoPath) ? logoPath : undefined;

  const items: any[] = q.items || [];
  const createdDate = q.createdAt ? new Date(q.createdAt).toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {logoSrc && <Image src={logoSrc} style={styles.logo} />}
            <View style={styles.brandBlock}>
              <Text style={styles.brandName}>H TECHNOLOGY</Text>
              <Text style={styles.brandSub}>AND SERVICES COMPANY LIMITED</Text>
            </View>
          </View>
          <View>
            <Text style={styles.docTitle}>ใบเสนอราคาควบคุม</Text>
            <Text style={styles.docNo}>{q.quotationNo}</Text>
            <Text style={styles.docNo}>วันที่: {createdDate}</Text>
            <Text style={[styles.docNo, { color: q.status === "approved" || q.status === "finalized" ? "#15803d" : "#64748b", fontWeight: "bold", marginTop: 3 }]}>
              สถานะ: {statusLabel(q.status)}
            </Text>
          </View>
        </View>

        {/* Customer + Vehicle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ข้อมูลลูกค้าและยานพาหนะ</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoCol}>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>ชื่อลูกค้า:</Text><Text style={styles.infoValue}>{q.customerName || "-"}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>ทะเบียน:</Text><Text style={styles.infoValue}>{q.licensePlate || "-"}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>ยี่ห้อ/รุ่น:</Text><Text style={styles.infoValue}>{[q.vehicleBrand, q.vehicleModel].filter(Boolean).join(" ") || "-"}</Text></View>
            </View>
            <View style={styles.infoCol}>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>ประกันภัย:</Text><Text style={styles.infoValue}>{q.insurerName || "-"}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>เลขเคลม:</Text><Text style={styles.infoValue}>{q.claimNo || "-"}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>ศูนย์ซ่อม:</Text><Text style={styles.infoValue}>{q.centerName || "-"}</Text></View>
            </View>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>รายการซ่อม ({items.length} รายการ)</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colNo]}>#</Text>
              <Text style={[styles.tableHeaderText, styles.colName]}>รายการ</Text>
              <Text style={[styles.tableHeaderText, styles.colType]}>ประเภท</Text>
              <Text style={[styles.tableHeaderText, styles.colQuoted]}>ราคาเสนอ</Text>
              <Text style={[styles.tableHeaderText, styles.colControl]}>ราคาควบคุม</Text>
              <Text style={[styles.tableHeaderText, styles.colSaving]}>Saving</Text>
            </View>
            {items.map((item: any, i: number) => {
              const quoted = item.quotedUnit * (item.quotedQty || 1);
              const controlled = item.controlledUnit * (item.controlledQty || 1);
              const saving = quoted - controlled;
              return (
                <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                  <Text style={styles.colNo}>{i + 1}</Text>
                  <Text style={styles.colName}>{item.name}</Text>
                  <Text style={styles.colType}>{item.type === "labor" ? "ค่าแรง" : "อะไหล่"}</Text>
                  <Text style={styles.colQuoted}>{fmt(quoted)}</Text>
                  <Text style={styles.colControl}>{fmt(controlled)}</Text>
                  <Text style={styles.colSaving}>{saving > 0 ? fmt(saving) : "-"}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totalsBox}>
          <View style={styles.totalsInner}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>ราคาเสนอรวม:</Text>
              <Text style={styles.totalValue}>฿{fmt(q.totalQuoted)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>ราคาหลังควบคุม:</Text>
              <Text style={styles.totalValue}>฿{fmt(q.totalControlled)}</Text>
            </View>
            <View style={styles.totalSavingRow}>
              <Text style={styles.totalSavingLabel}>ประหยัดได้ (Saving):</Text>
              <Text style={styles.totalSavingValue}>฿{fmt(q.totalSaving)}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>H Technology And Services Company Limited</Text>
          <Text style={styles.footerText}>{q.quotationNo} · {createdDate}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function POST(req: NextRequest) {
  try {
    const { ids } = (await req.json()) as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids required" }, { status: 400 });
    }

    ensureFonts();

    const quotations = await prisma.quotation.findMany({
      where: { id: { in: ids } },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });

    const zip = new JSZip();

    await Promise.all(
      quotations.map(async (q) => {
        const pdfBuffer = await renderToBuffer(<QuotationPDF q={q} />);
        const safeNo = q.quotationNo.replace(/[/\\?%*:|"<>]/g, "-");
        zip.file(`${safeNo}.pdf`, pdfBuffer);
      })
    );

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="quotations-export-${Date.now()}.zip"`,
      },
    });
  } catch (err) {
    console.error("bulk-export error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
