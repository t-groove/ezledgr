export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  raw_csv_row: string;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  errors: Array<{ row: string; reason: string }>;
}

export interface ColumnMap {
  dateIdx: number;
  descriptionIdx: number;
  amountIdx: number;
  creditIdx: number;
  debitIdx: number;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const HEADER_KEYWORDS = ["date", "amount", "description", "memo", "credit", "debit", "payee", "name", "details", "merchant", "withdrawal", "deposit", "balance", "type", "category", "transaction"];

function looksLikeHeaderRow(cols: string[]): boolean {
  return cols.some((col) => {
    const normalized = col.toLowerCase().replace(/[^a-z]/g, "");
    return HEADER_KEYWORDS.some((kw) => normalized === kw || normalized.includes(kw));
  });
}

export function detectColumns(headers: string[]): ColumnMap {
  const normalized = headers.map(normalizeHeader);

  const dateIdx = normalized.findIndex((h) =>
    ["date", "transactiondate", "postdate", "posteddate", "settledate"].includes(h)
  );

  const descriptionIdx = normalized.findIndex((h) =>
    [
      "description",
      "memo",
      "name",
      "payee",
      "details",
      "merchant",
      "narrative",
      "transactiondescription",
      "extendeddescription",
    ].includes(h)
  );

  const amountIdx = normalized.findIndex((h) =>
    ["amount", "transactionamount", "amt"].includes(h)
  );

  const creditIdx = normalized.findIndex((h) =>
    ["credit", "creditamount", "deposit", "deposits", "credits"].includes(h)
  );

  const debitIdx = normalized.findIndex((h) =>
    ["debit", "debitamount", "withdrawal", "withdrawals", "debits"].includes(h)
  );

  return { dateIdx, descriptionIdx, amountIdx, creditIdx, debitIdx };
}

function parseDate(raw: string): string | null {
  const cleaned = raw.trim().replace(/['"]/g, "");

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // MM/DD/YYYY or MM-DD-YYYY
  const mdy = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // MM/DD/YY
  const mdyShort = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
  if (mdyShort) {
    const [, m, d, y] = mdyShort;
    const fullYear = parseInt(y) > 50 ? `19${y}` : `20${y}`;
    return `${fullYear}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  return null;
}

function parseAmount(raw: string): number | null {
  if (!raw || raw.trim() === "" || raw.trim() === "-") return null;
  const cleaned = raw.replace(/[$,\s'"]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export function parseCSV(csvString: string): ParseResult {
  const transactions: ParsedTransaction[] = [];
  const errors: Array<{ row: string; reason: string }> = [];

  // Normalize line endings
  const lines = csvString.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  if (lines.length < 2) {
    return { transactions, errors: [{ row: "", reason: "File appears empty or has no data rows" }] };
  }

  // Find the header row — skip lines that are clearly not headers (e.g. bank account info rows)
  let headerLineIdx = 0;
  let columnMap: ColumnMap | null = null;

  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const headers = parseCSVLine(line);
    const map = detectColumns(headers);
    if (map.dateIdx !== -1 && map.descriptionIdx !== -1) {
      headerLineIdx = i;
      columnMap = map;
      break;
    }
  }

  // If no header row found, check if the first non-empty line looks like Wells Fargo format
  // (no header row, columns: date, amount, *, empty, description)
  let dataStartIdx: number;
  let isWellsFargoFormat = false;

  if (!columnMap) {
    const firstDataLine = lines.find((l) => l.trim());
    const firstCols = firstDataLine ? parseCSVLine(firstDataLine.trim()) : [];
    if (!looksLikeHeaderRow(firstCols) && firstCols.length >= 5) {
      isWellsFargoFormat = true;
      dataStartIdx = 0;
    } else {
      return {
        transactions,
        errors: [{ row: lines[0], reason: "Could not detect required columns (date, description)" }],
      };
    }
  } else {
    dataStartIdx = headerLineIdx + 1;
  }

  const { dateIdx, descriptionIdx, amountIdx, creditIdx, debitIdx } = isWellsFargoFormat
    ? { dateIdx: 0, descriptionIdx: 4, amountIdx: 1, creditIdx: -1, debitIdx: -1 }
    : columnMap!;
  const hasSeparateDebitCredit = !isWellsFargoFormat && (creditIdx !== -1 || debitIdx !== -1);

  for (let i = dataStartIdx; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;

    const cols = parseCSVLine(raw);
    if (cols.length <= Math.max(dateIdx, descriptionIdx)) continue;

    const dateStr = parseDate(cols[dateIdx] ?? "");
    if (!dateStr) {
      errors.push({ row: raw, reason: `Unparseable date: "${cols[dateIdx]}"` });
      continue;
    }

    const description = (cols[descriptionIdx] ?? "").replace(/^["']|["']$/g, "").trim();
    if (!description) {
      errors.push({ row: raw, reason: "Empty description" });
      continue;
    }

    let amount: number | null = null;
    let type: "income" | "expense";

    if (hasSeparateDebitCredit) {
      const credit = creditIdx !== -1 ? parseAmount(cols[creditIdx] ?? "") : null;
      const debit = debitIdx !== -1 ? parseAmount(cols[debitIdx] ?? "") : null;

      if (credit !== null && credit !== 0 && (debit === null || debit === 0)) {
        amount = Math.abs(credit);
        type = "income";
      } else if (debit !== null && debit !== 0) {
        amount = Math.abs(debit);
        type = "expense";
      } else if (credit !== null && credit !== 0) {
        amount = Math.abs(credit);
        type = "income";
      } else {
        errors.push({ row: raw, reason: "No valid credit or debit amount found" });
        continue;
      }
    } else if (amountIdx !== -1) {
      const rawAmount = parseAmount(cols[amountIdx] ?? "");
      if (rawAmount === null) {
        errors.push({ row: raw, reason: `Unparseable amount: "${cols[amountIdx]}"` });
        continue;
      }
      amount = Math.abs(rawAmount);
      // Negative amount = expense (money leaving), positive = income
      type = rawAmount >= 0 ? "income" : "expense";
    } else {
      errors.push({ row: raw, reason: "No amount column found" });
      continue;
    }

    transactions.push({
      date: dateStr,
      description,
      amount,
      type,
      raw_csv_row: raw,
    });
  }

  return { transactions, errors };
}
