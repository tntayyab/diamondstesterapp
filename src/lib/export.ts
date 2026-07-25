/** CSV + PDF export for scan history and the field journal. */
import { File, Paths } from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { env } from "@/config/env";
import type { IdentifyResult } from "@/lib/identify";
import type { ScanRecord, Sighting } from "@/lib/storage";

/** RFC 4180: wrap in quotes and double any embedded quote. */
const cell = (value: unknown): string => `"${String(value ?? "").replace(/"/g, '""')}"`;

const rows = (data: unknown[][]): string => data.map((row) => row.map(cell).join(",")).join("\r\n");

async function writeAndShare(filename: string, contents: string, mimeType: string): Promise<void> {
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(contents);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: filename, UTI: "public.data" });
  }
}

export async function exportHistoryCsv(history: ScanRecord[]): Promise<void> {
  const contents = rows([
    ["Date", "Stone type", "Authenticity", "Confidence", "Source", "UV fluorescence", "Notes"],
    ...history.map((entry) => [
      entry.createdAt,
      entry.result.stoneType,
      entry.result.authenticityLevel,
      `${entry.result.confidence}%`,
      entry.source,
      entry.uvObservation?.fluorescence ?? "",
      entry.notes ?? "",
    ]),
  ]);

  await writeAndShare("diamond-scan-history.csv", contents, "text/csv");
}

export async function exportJournalCsv(sightings: Sighting[]): Promise<void> {
  const contents = rows([
    ["Observed at", "Title", "Species", "Latitude", "Longitude", "Place", "Notes"],
    ...sightings.map((entry) => [
      entry.observedAt,
      entry.title,
      entry.speciesSlug ?? "",
      entry.latitude ?? "",
      entry.longitude ?? "",
      entry.placeLabel ?? "",
      entry.notes,
    ]),
  ]);

  await writeAndShare("diamond-field-journal.csv", contents, "text/csv");
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const AUTHENTICITY_HEX: Record<IdentifyResult["authenticityLevel"], string> = {
  genuine: "#22c55e",
  uncertain: "#f59e0b",
  simulant: "#f97316",
  synthetic: "#ef4444",
};

/** A shareable one-page scan report. */
export async function exportResultPdf(record: ScanRecord): Promise<void> {
  const { result } = record;
  const observations = result.visualObservations.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const redFlags = result.redFlags.length
    ? `<h2>Red flags</h2><ul>${result.redFlags.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>`
    : "";
  const nextSteps = result.recommendedNextSteps.map((item) => `<li>${escapeHtml(item)}</li>`).join("");

  const html = `<!doctype html><html><head><meta charset="utf-8" />
<style>
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: #1C1917; padding: 40px; }
  .bar { height: 6px; background: linear-gradient(90deg,#6366F1,#38E1FF); border-radius: 999px; }
  h1 { font-size: 28px; margin: 24px 0 2px; }
  .pill { display: inline-block; padding: 5px 14px; border-radius: 999px; color: #fff; font-size: 12px;
          font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
          background: ${AUTHENTICITY_HEX[result.authenticityLevel]}; }
  h2 { font-size: 13px; letter-spacing: .1em; text-transform: uppercase; color: #78716C;
       margin: 26px 0 8px; }
  li { margin-bottom: 5px; }
  .disclaimer { margin-top: 18px; padding: 12px 16px; background: #FFF7ED; border-radius: 8px; font-size: 12px; color: #78716C; }
  footer { margin-top: 44px; padding-top: 14px; border-top: 1px solid #E8E3DB;
           color: #A8A29E; font-size: 11px; }
</style></head><body>
  <div class="bar"></div>
  <h1>${escapeHtml(result.stoneType)}</h1>
  <span class="pill">${escapeHtml(result.authenticityLevel)}</span>
  <span style="color:#78716C;font-size:12px;margin-left:10px">Confidence: ${escapeHtml(String(result.confidence))}%</span>

  <h2>Visual observations</h2><ul>${observations}</ul>
  ${redFlags}
  <h2>Recommended next steps</h2><ul>${nextSteps}</ul>
  ${result.funFact ? `<h2>Did you know</h2><p>${escapeHtml(result.funFact)}</p>` : ""}
  <p class="disclaimer">${escapeHtml(result.disclaimer)}</p>

  <footer>
    Generated ${new Date(record.createdAt).toLocaleString()} by Diamonds Tester &middot; ${escapeHtml(env.app.siteUrl)}<br />
    AI-assisted visual estimate. Not a substitute for a certified professional gemological appraisal.
  </footer>
</body></html>`;

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
  }
}
