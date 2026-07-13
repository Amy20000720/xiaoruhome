import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export interface JournalMaterialItem {
  id: string;
  name: string;
  file: string;
  sourceItemPage: string;
  tags: string[];
}

export interface JournalMaterialSheet {
  schemaVersion: number;
  id: string;
  name: string;
  category: string;
  style: string[];
  cover: string;
  visibility: "studio-private" | "public-page-use";
  allowedContexts: string[];
  source: {
    provider: string;
    sourcePage?: string;
    sourceCollection?: string;
    termsUrl: string;
    licenseNote: string;
  };
  defaultPlacement: {
    width: number;
    height: number;
    rotation: number;
  };
  items: JournalMaterialItem[];
}

function isValidSheet(value: unknown): value is JournalMaterialSheet {
  if (!value || typeof value !== "object") {
    return false;
  }

  const sheet = value as Partial<JournalMaterialSheet>;
  return (
    typeof sheet.id === "string" &&
    typeof sheet.name === "string" &&
    typeof sheet.category === "string" &&
    Array.isArray(sheet.items) &&
    Boolean(sheet.defaultPlacement)
  );
}

/** Reads checked-in material manifests for the local Studio build. */
export async function readJournalMaterialSheets(): Promise<JournalMaterialSheet[]> {
  const sheetsRoot = join(process.cwd(), "public", "assets", "life-journal", "sheets");
  const entries = await readdir(sheetsRoot, { withFileTypes: true });
  const sheets = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        try {
          const raw = await readFile(join(sheetsRoot, entry.name, "sheet.json"), "utf8");
          const sheet = JSON.parse(raw) as unknown;
          return isValidSheet(sheet) ? sheet : null;
        } catch {
          return null;
        }
      }),
  );

  return sheets.filter((sheet): sheet is JournalMaterialSheet => sheet !== null);
}
