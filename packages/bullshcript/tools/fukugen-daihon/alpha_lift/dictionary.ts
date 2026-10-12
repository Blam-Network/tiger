// The cracked strings of one build's dictionary (packages/dictionary/destiny1/
// <build>/hashes/*.csv); TIGER_DICTIONARY_DIR overrides the folder beside
// this package.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

export function dictionaryDir(build: string): string {
  const root =
    process.env.TIGER_DICTIONARY_DIR ??
    resolve(import.meta.dirname, "../../../../dictionary");
  return join(root, "destiny1", build);
}

// RFC 4180: comma separated, double quotes escape, LF or CRLF; first line is
// the header.
function parseCsv(text: string): Record<string, string>[] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      record.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") {
        i++;
      }
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field !== "" || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  const [header, ...rows] = records;
  if (!header) {
    return [];
  }
  return rows
    .filter((row) => !(row.length === 1 && row[0] === ""))
    .map((row) =>
      Object.fromEntries(header.map((name, i) => [name, row[i] ?? ""]))
    );
}

function readCsv(dir: string, file: string): Record<string, string>[] {
  return parseCsv(readFileSync(join(dir, file), "utf8"));
}

// Every cracked (hash, string) across the build's domains, in domains.csv order.
export function crackedStrings(build: string): [number, string][] {
  const dir = dictionaryDir(build);
  const out: [number, string][] = [];
  for (const domain of readCsv(dir, "hashes/domains.csv")) {
    for (const row of readCsv(dir, `hashes/${domain.domain}.csv`)) {
      out.push([Number.parseInt(row.hash, 16) >>> 0, row.string]);
    }
  }
  return out;
}
