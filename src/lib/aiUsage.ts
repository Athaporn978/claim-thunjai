import { prisma } from "@/lib/db";

/**
 * Per-call metering for Claude API usage.
 *
 * The system sells at a flat price per completed case, but the AI cost of a case
 * varies with how many pages and line items the document has — so the only way
 * to know the real margin is to record what every call actually consumed.
 * Failures are recorded too: a truncated response costs the same as a good one.
 *
 * Nothing here stores prompt text, model output or customer data — only counts.
 */

/** USD per 1M tokens. Update when Anthropic pricing changes. */
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-5": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

/** Cache reads bill at ~0.1x the input rate; writing to cache costs ~1.25x. */
const CACHE_READ_MULTIPLIER = 0.1;
const CACHE_WRITE_MULTIPLIER = 1.25;

export type TokenCounts = {
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
};

/**
 * Cost in USD for a set of token counts. Unknown models price at 0 rather than
 * guessing — the raw counts are still stored, so cost can be recomputed later
 * once the model is added to PRICING above.
 */
export function calculateCostUsd(model: string, tokens: TokenCounts): number {
  const price = PRICING[model];
  if (!price) return 0;

  const perInputToken = price.input / 1_000_000;
  const perOutputToken = price.output / 1_000_000;

  return (
    (tokens.inputTokens ?? 0) * perInputToken +
    (tokens.outputTokens ?? 0) * perOutputToken +
    (tokens.cacheReadTokens ?? 0) * perInputToken * CACHE_READ_MULTIPLIER +
    (tokens.cacheCreationTokens ?? 0) * perInputToken * CACHE_WRITE_MULTIPLIER
  );
}

/** Shape of the `usage` object returned by the Anthropic SDK. */
type AnthropicUsage = {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

export function tokensFromUsage(usage: AnthropicUsage | null | undefined): TokenCounts {
  return {
    inputTokens: usage?.input_tokens ?? 0,
    outputTokens: usage?.output_tokens ?? 0,
    cacheReadTokens: usage?.cache_read_input_tokens ?? 0,
    cacheCreationTokens: usage?.cache_creation_input_tokens ?? 0,
  };
}

export type RecordUsageInput = {
  route: string;
  model: string;
  usage?: AnthropicUsage | null;
  /** Use instead of `usage` when counts don't come from an SDK usage object. */
  tokens?: TokenCounts;
  success?: boolean;
  stopReason?: string | null;
  errorMessage?: string | null;
  durationMs?: number;
  quotationId?: string | null;
  userEmail?: string | null;
  branchName?: string | null;
};

/**
 * Writes one usage row. Never throws: metering must not be able to break a
 * claim extraction, so every failure here is swallowed and logged.
 *
 * Returns the new row's id (for later linking to a quotation), or null if the
 * write failed.
 */
export async function recordUsage(input: RecordUsageInput): Promise<number | null> {
  try {
    const tokens = input.tokens ?? tokensFromUsage(input.usage);
    const row = await prisma.apiUsageLog.create({
      data: {
        route: input.route,
        model: input.model,
        inputTokens: tokens.inputTokens ?? 0,
        outputTokens: tokens.outputTokens ?? 0,
        cacheReadTokens: tokens.cacheReadTokens ?? 0,
        cacheCreationTokens: tokens.cacheCreationTokens ?? 0,
        costUsd: calculateCostUsd(input.model, tokens),
        success: input.success ?? true,
        stopReason: input.stopReason ?? null,
        // Guard against an oversized stack trace bloating the table.
        errorMessage: input.errorMessage ? input.errorMessage.slice(0, 500) : null,
        durationMs: input.durationMs ?? null,
        quotationId: input.quotationId ?? null,
        userEmail: input.userEmail ?? null,
        branchName: input.branchName ?? null,
      },
      select: { id: true },
    });
    return row.id;
  } catch (err) {
    console.error("recordUsage failed (ignored):", err);
    return null;
  }
}

/**
 * Attaches a usage row to a quotation after the fact. /api/extract-quote runs
 * before the quotation exists, so the link can only be made once the case is
 * saved. Also never throws.
 */
export async function linkUsageToQuotation(usageLogId: number, quotationId: string) {
  try {
    await prisma.apiUsageLog.update({
      where: { id: usageLogId },
      data: { quotationId },
    });
  } catch (err) {
    console.error("linkUsageToQuotation failed (ignored):", err);
  }
}
