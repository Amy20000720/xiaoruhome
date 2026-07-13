import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";

export type JournalElementType = "text" | "image" | "sticker" | "tape" | "note" | "stamp" | "frame";
export type JournalTextFont = "serif" | "sans" | "wenkai" | "hand";

export interface JournalTextStyle {
  font?: JournalTextFont;
  fontSize?: number;
  color?: string;
  align?: "left" | "center" | "right";
  lineHeight?: number;
}

export interface JournalElement {
  id: string;
  type: JournalElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex?: number;
  style?: string;
  text?: string;
  src?: string;
  alt?: string;
  assetId?: string;
  opacity?: number;
  textStyle?: JournalTextStyle;
}

export interface JournalLayout {
  version: number;
  page: {
    size: "a5" | "b5" | "b5-spread";
    orientation: "portrait" | "landscape";
    theme: string;
  };
  elements: JournalElement[];
}

export async function readJournalLayout(layoutPath?: string): Promise<JournalLayout | null> {
  if (!layoutPath) {
    return null;
  }

  const publicPath = layoutPath.startsWith("/") ? layoutPath.slice(1) : layoutPath;
  const safePath = normalize(publicPath);

  if (!safePath.startsWith("assets/life/") || !safePath.endsWith(".json")) {
    return null;
  }

  try {
    const file = join(process.cwd(), "public", safePath);
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw) as JournalLayout;
  } catch {
    return null;
  }
}
