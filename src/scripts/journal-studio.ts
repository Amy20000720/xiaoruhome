import {
  Canvas,
  FabricImage,
  FabricObject,
  FabricText,
  Group,
  Rect,
  Textbox,
} from "fabric";
import {
  getJournalAsset,
  JOURNAL_PAGE_HEIGHT,
  JOURNAL_PAGE_WIDTH,
  type JournalAsset,
} from "../lib/journalAssets";
import type { JournalElement, JournalLayout } from "../lib/journalLayout";
import {
  getLastDraftId,
  loadDraft,
  saveDraft,
  type JournalDraftMeta,
} from "./journal-storage";

interface StudioObjectMeta {
  id: string;
  type: JournalElement["type"];
  assetId?: string;
  text?: string;
  src?: string;
  alt?: string;
}

type StudioObject = FabricObject & {
  journalMeta?: StudioObjectMeta;
  text?: string;
};

const root = document.querySelector<HTMLElement>("[data-journal-studio]");
const canvasElement = document.querySelector<HTMLCanvasElement>("#journal-canvas");

if (root && canvasElement) {
  const canvas = new Canvas(canvasElement, {
    width: JOURNAL_PAGE_WIDTH,
    height: JOURNAL_PAGE_HEIGHT,
    backgroundColor: "#fffaf0",
    preserveObjectStacking: true,
    selection: true,
  });

  const fields = {
    title: getInput("journal-title"),
    date: getInput("journal-date"),
    summary: getTextArea("journal-summary"),
    tags: getInput("journal-tags"),
    mood: getInput("journal-mood"),
    location: getInput("journal-location"),
    slug: getInput("journal-slug"),
    body: getTextArea("journal-body"),
    output: getTextArea("journal-export"),
  };

  fields.date.value = new Date().toISOString().slice(0, 10);

  seedCanvas(canvas);
  bindActions(canvas, fields);
  restoreLastDraft(canvas, fields).catch(() => undefined);
}

function getInput(id: string) {
  const input = document.getElementById(id);
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`Missing input #${id}`);
  }
  return input;
}

function getTextArea(id: string) {
  const textarea = document.getElementById(id);
  if (!(textarea instanceof HTMLTextAreaElement)) {
    throw new Error(`Missing textarea #${id}`);
  }
  return textarea;
}

function bindActions(canvas: Canvas, fields: ReturnType<typeof getFields>) {
  document.querySelectorAll<HTMLElement>("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      if (action === "add-text") addText(canvas);
      if (action === "add-note") addAsset(canvas, "note-pink");
      if (action === "add-stamp") addAsset(canvas, "stamp-date");
      if (action === "delete") deleteActive(canvas);
      if (action === "bring-front") bringActiveForward(canvas);
      if (action === "send-back") sendActiveBackward(canvas);
      if (action === "save") saveCurrentDraft(canvas, fields).catch(showError);
      if (action === "export") exportCurrent(canvas, fields);
    });
  });

  document.querySelectorAll<HTMLButtonElement>("[data-asset-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const assetId = button.dataset.assetId;
      if (assetId) addAsset(canvas, assetId);
    });
  });

  document.querySelector<HTMLInputElement>("[data-action='upload-image']")?.addEventListener("change", (event) => {
    const input = event.currentTarget as HTMLInputElement | null;
    if (!input) {
      return;
    }
    const file = input.files?.[0];
    if (file) {
      addImage(canvas, file, fields.slug.value).catch(showError);
      input.value = "";
    }
  });
}

function getFields() {
  return {
    title: getInput("journal-title"),
    date: getInput("journal-date"),
    summary: getTextArea("journal-summary"),
    tags: getInput("journal-tags"),
    mood: getInput("journal-mood"),
    location: getInput("journal-location"),
    slug: getInput("journal-slug"),
    body: getTextArea("journal-body"),
    output: getTextArea("journal-export"),
  };
}

function seedCanvas(canvas: Canvas) {
  addAsset(canvas, "tape-pink-grid", { left: 34, top: 34, angle: -7 });
  addAsset(canvas, "sticker-sunny", { left: 318, top: 42, angle: 8 });
  addAsset(canvas, "note-mint", { left: 238, top: 394, angle: 3 });
  addText(canvas, { left: 74, top: 132, text: "新的手帐页" });
  canvas.discardActiveObject();
  canvas.renderAll();
}

function addText(canvas: Canvas, options: { left?: number; top?: number; text?: string } = {}) {
  const object = new Textbox(options.text ?? "双击编辑文字", {
    left: options.left ?? 82,
    top: options.top ?? 168,
    width: 210,
    fontFamily: "PingFang SC, Microsoft YaHei, sans-serif",
    fontSize: 22,
    fill: "#2f2646",
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    padding: 8,
    splitByGrapheme: true,
  }) as StudioObject;

  object.journalMeta = {
    id: createId("text"),
    type: "text",
    text: options.text ?? "双击编辑文字",
  };
  canvas.add(object);
  canvas.setActiveObject(object);
  canvas.renderAll();
}

function addAsset(
  canvas: Canvas,
  assetId: string,
  options: { left?: number; top?: number; angle?: number } = {},
) {
  const asset = getJournalAsset(assetId);
  if (!asset || asset.kind === "paper") {
    return;
  }

  const object = makeAssetObject(asset, options) as StudioObject;
  object.journalMeta = {
    id: createId(asset.kind),
    type: asset.kind === "frame" ? "frame" : asset.kind,
    assetId: asset.id,
    text: asset.defaultText,
  };

  canvas.add(object);
  canvas.setActiveObject(object);
  canvas.renderAll();
}

function makeAssetObject(asset: JournalAsset, options: { left?: number; top?: number; angle?: number }) {
  const left = options.left ?? 88 + Math.random() * 120;
  const top = options.top ?? 120 + Math.random() * 160;
  const base = {
    left,
    top,
    angle: options.angle ?? 0,
    originX: "left" as const,
    originY: "top" as const,
  };

  if (asset.kind === "tape") {
    return new Rect({
      ...base,
      width: asset.defaultWidth,
      height: asset.defaultHeight,
      fill: tapeFill(asset.id),
      stroke: "rgba(69, 54, 82, 0.22)",
      strokeWidth: 1,
      rx: 5,
      ry: 5,
    });
  }

  if (asset.kind === "stamp") {
    const rect = new Rect({
      width: asset.defaultWidth,
      height: asset.defaultHeight,
      fill: "rgba(255, 255, 255, 0.25)",
      stroke: "#c967a0",
      strokeWidth: 2,
      rx: 6,
      ry: 6,
    });
    const label = new FabricText(asset.defaultText ?? asset.name, {
      left: 12,
      top: 12,
      fontSize: 14,
      fontFamily: "Menlo, Consolas, monospace",
      fill: "#6d3761",
      fontWeight: "bold",
    });
    return new Group([rect, label], { ...base });
  }

  if (asset.kind === "frame") {
    return new Rect({
      ...base,
      width: asset.defaultWidth,
      height: asset.defaultHeight,
      fill: "rgba(255, 255, 255, 0.12)",
      stroke: asset.id === "frame-film" ? "#2f3148" : "#ffffff",
      strokeWidth: asset.id === "frame-film" ? 10 : 14,
      rx: 4,
      ry: 4,
    });
  }

  const fill = asset.kind === "note" ? noteFill(asset.id) : stickerFill(asset.id);
  const rect = new Rect({
    width: asset.defaultWidth,
    height: asset.defaultHeight,
    fill,
    stroke: "#ffffff",
    strokeWidth: asset.kind === "sticker" ? 4 : 1,
    rx: asset.kind === "sticker" ? 18 : 8,
    ry: asset.kind === "sticker" ? 18 : 8,
  });
  const label = new FabricText(asset.defaultText ?? asset.name, {
    left: 12,
    top: asset.kind === "note" ? 14 : asset.defaultHeight / 2 - 8,
    width: asset.defaultWidth - 24,
    fontSize: asset.kind === "note" ? 13 : 14,
    fontFamily: "PingFang SC, Microsoft YaHei, sans-serif",
    fill: "#2d3148",
    fontWeight: "bold",
  });
  return new Group([rect, label], { ...base });
}

async function addImage(canvas: Canvas, file: File, slug: string) {
  const dataUrl = await readFileAsDataUrl(file);
  const image = (await FabricImage.fromURL(dataUrl)) as StudioObject;
  image.set({
    left: 90,
    top: 180,
    scaleX: 170 / (image.width || 170),
    scaleY: 130 / (image.height || 130),
    angle: -2,
  });
  image.journalMeta = {
    id: createId("photo"),
    type: "image",
    src: `/assets/life/${safeSlug(slug)}/photo-1.webp`,
    alt: file.name,
  };
  canvas.add(image);
  canvas.setActiveObject(image);
  canvas.renderAll();
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function deleteActive(canvas: Canvas) {
  const active = canvas.getActiveObject();
  if (active) {
    canvas.remove(active);
    canvas.discardActiveObject();
    canvas.renderAll();
  }
}

function bringActiveForward(canvas: Canvas) {
  const active = canvas.getActiveObject();
  if (active) {
    canvas.bringObjectForward(active);
    canvas.renderAll();
  }
}

function sendActiveBackward(canvas: Canvas) {
  const active = canvas.getActiveObject();
  if (active) {
    canvas.sendObjectBackwards(active);
    canvas.renderAll();
  }
}

async function saveCurrentDraft(canvas: Canvas, fields: ReturnType<typeof getFields>) {
  const layout = layoutFromCanvas(canvas, fields.slug.value);
  await saveDraft({
    id: "current",
    updatedAt: new Date().toISOString(),
    meta: readMeta(fields),
    canvasJson: (canvas.toJSON as (propertiesToInclude?: string[]) => unknown)(["journalMeta"]),
    layout,
  });
  fields.output.value = "草稿已保存到当前浏览器。";
}

async function restoreLastDraft(canvas: Canvas, fields: ReturnType<typeof getFields>) {
  const draftId = getLastDraftId();
  if (!draftId) {
    return;
  }
  const draft = await loadDraft(draftId);
  if (!draft) {
    return;
  }
  writeMeta(fields, draft.meta);
  await canvas.loadFromJSON(draft.canvasJson as string | Record<string, unknown>);
  canvas.renderAll();
}

function exportCurrent(canvas: Canvas, fields: ReturnType<typeof getFields>) {
  const meta = readMeta(fields);
  const slug = safeSlug(meta.slug);
  const layout = layoutFromCanvas(canvas, slug);
  const tags = meta.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const tagYaml = tags.map((tag) => `  - ${tag}`).join("\n");
  const markdown = `---\ntitle: "${escapeYaml(meta.title)}"\ndate: ${meta.date}\nsummary: "${escapeYaml(meta.summary)}"\ntags:\n${tagYaml || "  - 生活"}\nmood: "${escapeYaml(meta.mood)}"\nlocation: "${escapeYaml(meta.location)}"\njournalLayout: "/assets/life/${slug}/layout.json"\n---\n\n${meta.body.trim()}\n`;
  const json = JSON.stringify(layout, null, 2);
  fields.output.value = `# src/content/life/${slug}.md\n\n${markdown}\n# public/assets/life/${slug}/layout.json\n\n${json}`;
}

function layoutFromCanvas(canvas: Canvas, slug: string): JournalLayout {
  const elements = canvas.getObjects().map((object, index) => objectToElement(object as StudioObject, index, slug));
  return {
    version: 1,
    page: {
      size: "a5",
      orientation: "portrait",
      theme: "candy-y2k-grid",
    },
    elements,
  };
}

function objectToElement(object: StudioObject, index: number, slug: string): JournalElement {
  const meta = object.journalMeta;
  const scaledWidth = Math.round((object.width ?? 0) * (object.scaleX ?? 1));
  const scaledHeight = Math.round((object.height ?? 0) * (object.scaleY ?? 1));
  const type = meta?.type ?? "text";
  const text = type === "text" ? object.text : meta?.text;
  return {
    id: meta?.id ?? createId("element"),
    type,
    assetId: meta?.assetId,
    text,
    src: meta?.src?.replace("/new-journal-page/", `/${safeSlug(slug)}/`),
    alt: meta?.alt,
    x: Math.round(object.left ?? 0),
    y: Math.round(object.top ?? 0),
    width: Math.max(24, scaledWidth),
    height: Math.max(24, scaledHeight),
    rotation: Math.round(object.angle ?? 0),
    zIndex: index + 5,
  };
}

function readMeta(fields: ReturnType<typeof getFields>): JournalDraftMeta {
  return {
    title: fields.title.value,
    date: fields.date.value,
    summary: fields.summary.value,
    tags: fields.tags.value,
    mood: fields.mood.value,
    location: fields.location.value,
    slug: safeSlug(fields.slug.value),
    body: fields.body.value,
  };
}

function writeMeta(fields: ReturnType<typeof getFields>, meta: JournalDraftMeta) {
  fields.title.value = meta.title;
  fields.date.value = meta.date;
  fields.summary.value = meta.summary;
  fields.tags.value = meta.tags;
  fields.mood.value = meta.mood;
  fields.location.value = meta.location;
  fields.slug.value = meta.slug;
  fields.body.value = meta.body;
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function safeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "journal-page";
}

function escapeYaml(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function tapeFill(id: string) {
  if (id.includes("blue")) return "#8ee4f0";
  if (id.includes("yellow")) return "#ffe18a";
  if (id.includes("silver")) return "#dfe6ff";
  return "#ff9fcd";
}

function stickerFill(id: string) {
  if (id.includes("coffee")) return "#ffd9c8";
  if (id.includes("book")) return "#b7eaf1";
  if (id.includes("camera")) return "#d7f8f2";
  if (id.includes("flower")) return "#ffc7e1";
  if (id.includes("laptop")) return "#d7f8ff";
  return "#fff3a8";
}

function noteFill(id: string) {
  if (id.includes("mint")) return "#d7f9ed";
  if (id.includes("yellow")) return "#fff1a8";
  if (id.includes("purple")) return "#e7dcff";
  return "#ffd7eb";
}

function showError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const output = document.getElementById("journal-export");
  if (output instanceof HTMLTextAreaElement) {
    output.value = `操作失败：${message}`;
  }
}
