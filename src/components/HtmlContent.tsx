import React, { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import RenderHtml from "react-native-render-html";

import { ThemedText } from "@/components/ui";
import { fontSize, radius, spacing, useTheme, withAlpha } from "@/theme";

/**
 * Renders blog HTML the way the website does — including real `<table>`s, which
 * `react-native-render-html` alone can only stack into a flat list. We split the
 * HTML on `<table>…</table>` blocks: prose goes through RenderHtml, tables are
 * parsed and drawn as a native grid (emerald-tinted header, matching the site's
 * `.prose-spider thead th` style). No WebView needed, so it works in Expo Go.
 */

type Segment = { type: "html"; value: string } | { type: "table"; value: string };

function splitOnTables(html: string): Segment[] {
  const segments: Segment[] = [];
  const re = /<table[\s\S]*?<\/table>/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m.index > last) segments.push({ type: "html", value: html.slice(last, m.index) });
    segments.push({ type: "table", value: m[0] });
    last = m.index + m[0].length;
  }
  if (last < html.length) segments.push({ type: "html", value: html.slice(last) });
  return segments;
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&mdash;": "—",
  "&ndash;": "–",
  "&times;": "×",
  "&hellip;": "…",
};

function decode(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&[a-z#0-9]+;/gi, (e) => ENTITIES[e.toLowerCase()] ?? e);
}

function cellText(cell: string): string {
  return decode(
    cell
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/[ \t]+/g, " ")
      .trim(),
  );
}

interface Row {
  cells: string[];
  header: boolean;
}

function parseTable(tableHtml: string): Row[] {
  const rows: Row[] = [];
  const trRe = /<tr[\s\S]*?<\/tr>/gi;
  let tr: RegExpExecArray | null;
  while ((tr = trRe.exec(tableHtml))) {
    const cellRe = /<(th|td)\b[^>]*>([\s\S]*?)<\/\1>/gi;
    const cells: string[] = [];
    let thCount = 0;
    let total = 0;
    let cell: RegExpExecArray | null;
    while ((cell = cellRe.exec(tr[0]))) {
      total += 1;
      if (cell[1].toLowerCase() === "th") thCount += 1;
      cells.push(cellText(cell[2]));
    }
    if (total > 0) rows.push({ cells, header: thCount === total });
  }
  return rows;
}

function HtmlTable({ tableHtml }: { tableHtml: string }) {
  const { colors } = useTheme();
  const rows = useMemo(() => parseTable(tableHtml), [tableHtml]);
  if (!rows.length) return null;

  const columns = rows.reduce((max, r) => Math.max(max, r.cells.length), 0);
  const wide = columns >= 4;

  const headerBg = withAlpha(colors.tint, 0.102); // ~10% opacity, matches site's emerald tint

  const table = (
    <View
      style={[
        styles.table,
        { borderColor: colors.border, minWidth: wide ? columns * 130 : undefined },
      ]}
    >
      {rows.map((row, ri) => (
        <View
          key={ri}
          style={[
            styles.row,
            { borderTopColor: colors.border, borderTopWidth: ri === 0 ? 0 : StyleSheet.hairlineWidth },
            row.header ? { backgroundColor: headerBg } : null,
          ]}
        >
          {Array.from({ length: columns }).map((_, ci) => {
            const value = row.cells[ci] ?? "";
            // A `th` used as a leading row-label (body row, first cell) is bold too.
            const emphasise = row.header || (rows.some((r) => r.header) === false && ci === 0);
            return (
              <View
                key={ci}
                style={[
                  styles.cell,
                  { borderLeftColor: colors.border, borderLeftWidth: ci === 0 ? 0 : StyleSheet.hairlineWidth },
                  wide ? { width: 130 } : { flex: 1 },
                ]}
              >
                <ThemedText
                  variant="caption"
                  color={colors.text}
                  style={{ fontSize: 13, lineHeight: 19, fontWeight: emphasise ? "700" : "400" }}
                >
                  {value}
                </ThemedText>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );

  if (wide) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: spacing.md }}>
        {table}
      </ScrollView>
    );
  }
  return <View style={{ marginVertical: spacing.md }}>{table}</View>;
}

export function HtmlContent({ html, contentWidth }: { html: string; contentWidth: number }) {
  const { colors } = useTheme();
  const segments = useMemo(() => splitOnTables(html), [html]);

  return (
    <View>
      {segments.map((seg, i) => {
        if (seg.type === "table") return <HtmlTable key={i} tableHtml={seg.value} />;
        if (!seg.value.replace(/<[^>]+>/g, "").trim() && !/<img/i.test(seg.value)) return null;
        return (
          <RenderHtml
            key={i}
            contentWidth={contentWidth}
            source={{ html: seg.value }}
            baseStyle={{ color: colors.text, fontSize: fontSize.base, lineHeight: 25 }}
            tagsStyles={{
              a: { color: colors.tint },
              h1: { color: colors.text, fontSize: 24 },
              h2: { color: colors.text, fontSize: 20 },
              h3: { color: colors.text, fontSize: 17 },
              img: { borderRadius: radius.md },
              blockquote: {
                borderLeftColor: colors.tint,
                borderLeftWidth: 3,
                paddingLeft: spacing.md,
                opacity: 0.9,
              },
            }}
            enableExperimentalMarginCollapsing
            defaultTextProps={{ selectable: true }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  table: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, overflow: "hidden" },
  row: { flexDirection: "row" },
  cell: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, justifyContent: "center" },
});
