import { prisma } from "@/lib/db";

export type RecordUploadInput = {
  userEmail: string;
  userName: string;
  branchName?: string | null;
  fileName: string;
  fileCount?: number;
  pageCount?: number;
  mode?: "single" | "batch";
  success?: boolean;
  errorMessage?: string | null;
  itemsFound?: number;
  apiUsageLogId?: number | null;
};

/**
 * Writes one billing-ledger row per scan request. Never throws: metering must
 * not be able to fail an extraction the operator is waiting on.
 *
 * Returns the new row's id so the eventual save can attach the quotation
 * number, or null if the write failed.
 */
export async function recordUploadTransaction(input: RecordUploadInput): Promise<number | null> {
  try {
    const row = await prisma.uploadTransactionLog.create({
      data: {
        userEmail: input.userEmail,
        userName: input.userName,
        branchName: input.branchName ?? null,
        fileName: input.fileName.slice(0, 300),
        fileCount: input.fileCount ?? 1,
        pageCount: input.pageCount ?? 0,
        mode: input.mode ?? "single",
        success: input.success ?? true,
        // Guard against an oversized stack trace bloating the table.
        errorMessage: input.errorMessage ? input.errorMessage.slice(0, 500) : null,
        itemsFound: input.itemsFound ?? 0,
        apiUsageLogId: input.apiUsageLogId ?? null,
      },
      select: { id: true },
    });
    return row.id;
  } catch (err) {
    console.error("recordUploadTransaction failed (ignored):", err);
    return null;
  }
}

/**
 * Attaches a scan row to the case it produced. The scan runs before the
 * quotation exists, so this can only happen once the case is saved — rows left
 * unlinked are scans that were thrown away. Also never throws.
 */
export async function linkUploadToQuotation(
  uploadLogId: number,
  quotationId: string,
  quotationNo: string
) {
  try {
    await prisma.uploadTransactionLog.update({
      where: { id: uploadLogId },
      data: { quotationId, quotationNo },
    });
  } catch (err) {
    console.error("linkUploadToQuotation failed (ignored):", err);
  }
}
