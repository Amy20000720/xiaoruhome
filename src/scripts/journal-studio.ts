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
  JOURNAL_SPREAD_HEIGHT,
  JOURNAL_SPREAD_WIDTH,
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
  type: JournalElement["type"] | "background";
  label: string;
  assetId?: string;
  text?: string;
  src?: string;
  alt?: string;
  locked?: boolean;
}

type StudioObject = FabricObject & {
  journalMeta?: StudioObjectMeta;
  text?: string;
};

interface StudioFields {
  title: HTMLInputElement;
  date: HTMLInputElement;
  summary: HTMLTextAreaElement;
  tags: HTMLInputElement;
  mood: HTMLInputElement;
  location: HTMLInputElement;
  slug: HTMLInputElement;
  body: HTMLTextAreaElement;
  bookTitle: HTMLInputElement;
  author: HTMLInputElement;
  output: HTMLTextAreaElement;
  selectedName: HTMLInputElement;
  selectedX: HTMLInputElement;
  selectedY: HTMLInputElement;
  selectedWidth: HTMLInputElement;
  selectedAngle: HTMLInputElement;
}

const DRAFT_ID = "reading-spread-current";
const root = document.querySelector<HTMLElement>("[data-journal-studio]");
const canvasElement = document.querySelector<HTMLCanvasElement>("#journal-canvas");

if (root && canvasElement) {
  const canvas = new Canvas(canvasElement, {
    width: JOURNAL_SPREAD_WIDTH,
    height: JOURNAL_SPREAD_HEIGHT,
    backgroundColor: "#fffdf7",
    preserveObjectStacking: true,
    selection: true,
  });
  const fields = getFields();

  seedReadingTemplate(canvas);
  bindActions(canvas, fields);
  bindCanvasState(canvas, fields);
  updateLayerList(canvas);
  updateInspector(canvas, fields);
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

function getFields(): StudioFields {
  return {
    title: getInput("journal-title"),
    date: getInput("journal-date"),
    summary: getTextArea("journal-summary"),
    tags: getInput("journal-tags"),
    mood: getInput("journal-mood"),
    location: getInput("journal-location"),
    slug: getInput("journal-slug"),
    body: getTextArea("journal-body"),
    bookTitle: getInput("journal-book-title"),
    author: getInput("journal-author"),
    output: getTextArea("journal-export"),
    selectedName: getInput("selected-name"),
    selectedX: getInput("selected-x"),
    selectedY: getInput("selected-y"),
    selectedWidth: getInput("selected-width"),
    selectedAngle: getInput("selected-angle"),
  };
}

function bindActions(canvas: Canvas, fields: StudioFields) {
  document.querySelectorAll<HTMLElement>("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      if (action === "add-text") addText(canvas);
      if (action === "add-quote") addQuoteCard(canvas);
      if (action === "add-note") addAsset(canvas, "note-pink").catch(showError);
      if (action === "delete") deleteActive(canvas);
      if (action === "bring-front") bringActiveForward(canvas);
      if (action === "send-back") sendActiveBackward(canvas);
      if (action === "save") saveCurrentDraft(canvas, fields).catch(showError);
      if (action === "export") exportCurrent(canvas, fields);
      if (action === "reset-template") {
        canvas.clear();
        seedReadingTemplate(canvas);
        updateLayerList(canvas);
        updateInspector(canvas, fields);
      }
    });
  });

  document.querySelectorAll<HTMLButtonElement>("[data-asset-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const assetId = button.dataset.assetId;
      if (assetId) addAsset(canvas, assetId, button.dataset.assetSrc).catch(showError);
    });
  });

  document.querySelector<HTMLInputElement>("[data-action='upload-image']")?.addEventListener("change", (event) => {
    const input = event.currentTarget as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (file) {
      addImage(canvas, file, fields.slug.value).catch(showError);
      input.value = "";
    }
  });

  bindAssetFilters();
  bindInspector(canvas, fields);
}

function bindCanvasState(canvas: Canvas, fields: StudioFields) {
  const refresh = () => {
    updateLayerList(canvas);
    updateInspector(canvas, fields);
  };
  canvas.on("selection:created", refresh);
  canvas.on("selection:updated", refresh);
  canvas.on("selection:cleared", refresh);
  canvas.on("object:modified", refresh);
  canvas.on("object:added", refresh);
  canvas.on("object:removed", refresh);
  canvas.on("text:changed", () => {
    const active = canvas.getActiveObject() as StudioObject | undefined;
    if (active?.journalMeta && "text" in active) {
      active.journalMeta.text = active.text;
      active.journalMeta.label = active.text?.slice(0, 18) || active.journalMeta.label;
    }
    refresh();
  });
}

function bindAssetFilters() {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-category-button]"));
  const assets = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-asset-id]"));
  const search = document.querySelector<HTMLInputElement>("[data-asset-search]");
  let category = buttons.find((button) => button.classList.contains("active"))?.dataset.categoryButton ?? "胶带";

  const apply = () => {
    const query = search?.value.trim().toLowerCase() ?? "";
    assets.forEach((asset) => {
      const matchesCategory = asset.dataset.category === category || category === "我的导入";
      const matchesSearch = !query || (asset.dataset.search ?? "").toLowerCase().includes(query);
      asset.hidden = !matchesCategory || !matchesSearch;
    });
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      category = button.dataset.categoryButton ?? category;
      buttons.forEach((item) => item.classList.toggle("active", item === button));
      apply();
    });
  });
  search?.addEventListener("input", apply);
  apply();
}

function bindInspector(canvas: Canvas, fields: StudioFields) {
  const inputs = [fields.selectedX, fields.selectedY, fields.selectedWidth, fields.selectedAngle];
  inputs.forEach((input) => {
    input.addEventListener("change", () => {
      const active = canvas.getActiveObject() as StudioObject | undefined;
      if (!active || active.journalMeta?.locked) {
        return;
      }
      const value = Number(input.value);
      if (!Number.isFinite(value)) {
        return;
      }
      const field = input.dataset.transformField;
      if (field === "x") active.set("left", value);
      if (field === "y") active.set("top", value);
      if (field === "angle") active.set("angle", value);
      if (field === "width") {
        const baseWidth = active.width || value;
        active.set("scaleX", value / baseWidth);
      }
      active.setCoords();
      canvas.renderAll();
      updateLayerList(canvas);
      updateInspector(canvas, fields);
    });
  });
}

function seedReadingTemplate(canvas: Canvas) {
  createBookBackground(canvas);
  addBookCover(canvas);
  addMetaLabel(canvas, "04 / JOURNAL", 120, 88, 110, "#b0ad96");
  addMetaLabel(canvas, "阅读笔记", 250, 91, 90, "#c2bcaa");
  addTemplateText(canvas, "一间，只属于自己的房间", 368, 164, 220, 28, 18, "#171717", "书名字段");
  addTemplateText(canvas, "伍尔夫", 370, 238, 160, 28, 18, "#171717", "作者字段");
  addTemplateText(canvas, "小说 / 随笔", 370, 312, 160, 28, 18, "#171717", "类型字段");
  addQuoteCard(canvas, {
    left: 100,
    top: 462,
    text: "我希望，不必永远通过别人的方法，才懂得抵达自己的生活。",
    width: 320,
  });
  addFavoriteQuote(canvas);
  addPhotoPlaceholder(canvas);
  addTemplateText(canvas, "读到这里，我想把当时的联想、电影截图和私人感受放在同一页。", 816, 500, 230, 110, 19, "#9a4e50", "右页手写评论", 2);
  canvas.discardActiveObject();
  canvas.renderAll();
}

function createBookBackground(canvas: Canvas) {
  const leftPage = new Rect({
    left: 44,
    top: 34,
    width: 514,
    height: 728,
    fill: "#fffdf7",
    stroke: "#d8d2c5",
    strokeWidth: 1,
    rx: 20,
    ry: 20,
    selectable: false,
    evented: false,
  }) as StudioObject;
  leftPage.journalMeta = { id: "bg-left-page", type: "background", label: "左页背景", locked: true };

  const rightPage = new Rect({
    left: 562,
    top: 34,
    width: 514,
    height: 728,
    fill: "#fffdf7",
    stroke: "#d8d2c5",
    strokeWidth: 1,
    rx: 20,
    ry: 20,
    selectable: false,
    evented: false,
  }) as StudioObject;
  rightPage.journalMeta = { id: "bg-right-page", type: "background", label: "右页背景", locked: true };

  const spine = new Rect({
    left: 548,
    top: 34,
    width: 24,
    height: 728,
    fill: "#ebe4d5",
    stroke: "rgba(86, 76, 62, 0.22)",
    strokeWidth: 1,
    selectable: false,
    evented: false,
  }) as StudioObject;
  spine.journalMeta = { id: "bg-spine", type: "background", label: "书脊", locked: true };

  canvas.add(leftPage, spine, rightPage);

  for (let x = 62; x <= 1060; x += 18) {
    addGridLine(canvas, x, 48, x, 748);
  }
  for (let y = 52; y <= 744; y += 18) {
    addGridLine(canvas, 62, y, 540, y);
    addGridLine(canvas, 580, y, 1058, y);
  }

  const leftShade = new Rect({
    left: 522,
    top: 36,
    width: 36,
    height: 724,
    fill: "rgba(88, 74, 58, 0.07)",
    selectable: false,
    evented: false,
  }) as StudioObject;
  leftShade.journalMeta = { id: "bg-left-shade", type: "background", label: "左页阴影", locked: true };
  const rightShade = new Rect({
    left: 562,
    top: 36,
    width: 34,
    height: 724,
    fill: "rgba(88, 74, 58, 0.07)",
    selectable: false,
    evented: false,
  }) as StudioObject;
  rightShade.journalMeta = { id: "bg-right-shade", type: "background", label: "右页阴影", locked: true };
  canvas.add(leftShade, rightShade);
}

function addGridLine(canvas: Canvas, left: number, top: number, x2: number, y2: number) {
  const line = new Rect({
    left,
    top,
    width: Math.max(1, x2 - left || 1),
    height: Math.max(1, y2 - top || 1),
    fill: "rgba(114, 134, 117, 0.13)",
    selectable: false,
    evented: false,
  }) as StudioObject;
  line.journalMeta = { id: createId("grid"), type: "background", label: "格线", locked: true };
  canvas.add(line);
}

function addBookCover(canvas: Canvas) {
  const cover = new Rect({
    left: 0,
    top: 0,
    width: 150,
    height: 230,
    fill: "#3b3440",
    stroke: "rgba(42, 34, 28, 0.24)",
    strokeWidth: 1,
  });
  const slash = new Rect({
    left: -16,
    top: 124,
    width: 184,
    height: 24,
    fill: "#d5d05d",
  });
  const title = new FabricText("一间\\n只属于自己\\n的房间", {
    left: 18,
    top: 28,
    fill: "#f7df97",
    fontFamily: "Gaegu, PingFang SC, sans-serif",
    fontSize: 24,
    fontWeight: "bold",
    lineHeight: 0.92,
  });
  const small = new FabricText("A room of\\none's own", {
    left: 88,
    top: 184,
    fill: "#f2ce66",
    fontFamily: "Georgia, serif",
    fontSize: 14,
    lineHeight: 0.95,
  });
  const group = new Group([cover, slash, title, small], { left: 104, top: 126, angle: 0 }) as StudioObject;
  group.journalMeta = { id: createId("book-cover"), type: "frame", label: "书封占位", assetId: "field-book-cover" };
  canvas.add(group);
}

function addMetaLabel(canvas: Canvas, text: string, left: number, top: number, width: number, fill: string) {
  const label = new Textbox(text, {
    left,
    top,
    width,
    fontFamily: "JetBrains Mono, Menlo, monospace",
    fontSize: 16,
    fill,
    fontWeight: "bold",
    selectable: false,
    evented: false,
  }) as StudioObject;
  label.journalMeta = { id: createId("bg-label"), type: "background", label: "页眉", locked: true };
  canvas.add(label);
}

function addTemplateText(
  canvas: Canvas,
  text: string,
  left: number,
  top: number,
  width: number,
  height: number,
  fontSize: number,
  fill: string,
  label: string,
  angle = 0,
) {
  const object = new Textbox(text, {
    left,
    top,
    width,
    height,
    angle,
    fontFamily: "Gaegu, PingFang SC, sans-serif",
    fontSize,
    fill,
    fontWeight: "bold",
    splitByGrapheme: true,
  }) as StudioObject;
  object.journalMeta = { id: createId("text"), type: "text", label, text };
  canvas.add(object);
}

function addFavoriteQuote(canvas: Canvas) {
  const card = new Rect({
    left: 0,
    top: 0,
    width: 360,
    height: 174,
    fill: "rgba(245, 246, 238, 0.94)",
    stroke: "rgba(157, 170, 124, 0.48)",
    strokeWidth: 1,
  });
  const side = new Rect({
    left: 0,
    top: 0,
    width: 6,
    height: 174,
    fill: "#aeb98b",
  });
  const quote = new Textbox("伟大的灵魂\\n是雌雄同体。", {
    left: 42,
    top: 26,
    width: 260,
    fill: "#a291ca",
    fontFamily: "Ma Shan Zheng, Gaegu, PingFang SC, cursive",
    fontSize: 34,
    lineHeight: 1.03,
  });
  const body = new Textbox("这句像一枚书签，夹在独立和自由之间。", {
    left: 42,
    top: 116,
    width: 280,
    fill: "#5a3f3a",
    fontFamily: "Gaegu, PingFang SC, sans-serif",
    fontSize: 19,
  });
  const group = new Group([card, side, quote, body], { left: 640, top: 118 }) as StudioObject;
  group.journalMeta = { id: createId("quote"), type: "note", label: "右页摘抄卡", assetId: "field-quote-card" };
  canvas.add(group);
}

function addPhotoPlaceholder(canvas: Canvas) {
  const photo = new Rect({
    left: 0,
    top: 0,
    width: 248,
    height: 142,
    fill: "#2d4038",
    stroke: "#f1e5d4",
    strokeWidth: 8,
    angle: -1,
  });
  const label = new FabricText("可替换图片", {
    left: 68,
    top: 58,
    fill: "#fffaf2",
    fontFamily: "PingFang SC, sans-serif",
    fontSize: 18,
    fontWeight: "bold",
  });
  const group = new Group([photo, label], { left: 664, top: 348, angle: -1 }) as StudioObject;
  group.journalMeta = { id: createId("photo-frame"), type: "frame", label: "图片框", assetId: "field-photo-frame" };
  canvas.add(group);
}

function addText(canvas: Canvas, options: { left?: number; top?: number; text?: string } = {}) {
  const text = options.text ?? "双击编辑文字";
  const object = new Textbox(text, {
    left: options.left ?? 660,
    top: options.top ?? 610,
    width: 260,
    fontFamily: "Gaegu, Ma Shan Zheng, PingFang SC, cursive",
    fontSize: 26,
    fill: "#2f2646",
    backgroundColor: "rgba(255, 255, 255, 0.66)",
    padding: 8,
    splitByGrapheme: true,
  }) as StudioObject;
  object.journalMeta = { id: createId("text"), type: "text", label: text.slice(0, 18), text };
  canvas.add(object);
  canvas.setActiveObject(object);
  canvas.renderAll();
}

function addQuoteCard(
  canvas: Canvas,
  options: { left?: number; top?: number; width?: number; text?: string } = {},
) {
  const width = options.width ?? 310;
  const text = options.text ?? "把喜欢的句子贴在这里。";
  const card = new Rect({
    width,
    height: 110,
    fill: "#f2e4d2",
    stroke: "rgba(138, 104, 72, 0.18)",
    strokeWidth: 1,
  });
  const tape = new Rect({
    left: 22,
    top: -11,
    width: 94,
    height: 18,
    fill: "rgba(229, 215, 199, 0.74)",
    angle: -3,
  });
  const label = new Textbox(text, {
    left: 24,
    top: 24,
    width: width - 48,
    fill: "#934b47",
    fontFamily: "Gaegu, PingFang SC, sans-serif",
    fontSize: 21,
    fontWeight: "bold",
    lineHeight: 1.28,
  });
  const group = new Group([card, tape, label], {
    left: options.left ?? 710,
    top: options.top ?? 560,
    angle: -1,
  }) as StudioObject;
  group.journalMeta = { id: createId("quote-card"), type: "note", label: "摘抄卡", assetId: "field-quote-card", text };
  canvas.add(group);
  canvas.setActiveObject(group);
  canvas.renderAll();
}

async function addAsset(canvas: Canvas, assetId: string, runtimeSrc?: string) {
  const asset = getJournalAsset(assetId);
  if (!asset || asset.kind === "paper") {
    return;
  }
  const object = asset.src ? await makeImageAsset(asset, runtimeSrc ?? asset.src) : makeShapeAsset(asset);
  object.journalMeta = {
    id: createId(asset.kind),
    type: asset.kind === "field" ? "frame" : asset.kind === "sticker" || asset.kind === "tape" || asset.kind === "note" || asset.kind === "stamp" || asset.kind === "frame" ? asset.kind : "frame",
    label: asset.name,
    assetId: asset.id,
    text: asset.defaultText,
    src: asset.src,
    alt: asset.name,
  };
  canvas.add(object);
  canvas.setActiveObject(object);
  canvas.renderAll();
}

async function makeImageAsset(asset: JournalAsset, runtimeSrc: string) {
  const image = (await FabricImage.fromURL(runtimeSrc)) as StudioObject;
  image.set({
    left: 650 + Math.random() * 180,
    top: 310 + Math.random() * 220,
    scaleX: asset.defaultWidth / (image.width || asset.defaultWidth),
    scaleY: asset.defaultHeight / (image.height || asset.defaultHeight),
    angle: Math.random() * 5 - 2,
  });
  return image;
}

function makeShapeAsset(asset: JournalAsset) {
  const left = 650 + Math.random() * 180;
  const top = 320 + Math.random() * 200;
  if (asset.kind === "tape") {
    return new Rect({
      left,
      top,
      width: asset.defaultWidth,
      height: asset.defaultHeight,
      fill: asset.id.includes("blue") ? "#92d8e6" : "#f69ac5",
      stroke: "rgba(69, 54, 82, 0.22)",
      strokeWidth: 1,
      rx: 5,
      ry: 5,
      angle: -5,
    }) as StudioObject;
  }
  if (asset.kind === "stamp") {
    const rect = new Rect({
      width: asset.defaultWidth,
      height: asset.defaultHeight,
      fill: "rgba(255, 255, 255, 0.2)",
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
    return new Group([rect, label], { left, top }) as StudioObject;
  }
  if (asset.kind === "frame" || asset.kind === "field") {
    const rect = new Rect({
      width: asset.defaultWidth,
      height: asset.defaultHeight,
      fill: asset.id.includes("photo") ? "rgba(45, 64, 56, 0.74)" : "rgba(255, 255, 255, 0.42)",
      stroke: asset.id.includes("photo") ? "#f1e5d4" : "#cbbda9",
      strokeWidth: asset.id.includes("photo") ? 8 : 2,
      rx: 4,
      ry: 4,
    });
    const label = new FabricText(asset.defaultText ?? asset.name, {
      left: 16,
      top: 18,
      fontSize: 18,
      fontFamily: "Gaegu, PingFang SC, sans-serif",
      fill: asset.id.includes("photo") ? "#fffaf2" : "#5f5143",
      fontWeight: "bold",
    });
    return new Group([rect, label], { left, top }) as StudioObject;
  }
  const rect = new Rect({
    width: asset.defaultWidth,
    height: asset.defaultHeight,
    fill: asset.id.includes("mint") ? "#d7f9ed" : "#ffd7eb",
    stroke: "#ffffff",
    strokeWidth: 2,
    rx: 8,
    ry: 8,
  });
  const label = new FabricText(asset.defaultText ?? asset.name, {
    left: 16,
    top: 18,
    width: asset.defaultWidth - 32,
    fontSize: 16,
    fontFamily: "Gaegu, PingFang SC, sans-serif",
    fill: "#2d3148",
    fontWeight: "bold",
  });
  return new Group([rect, label], { left, top }) as StudioObject;
}

async function addImage(canvas: Canvas, file: File, slug: string) {
  const dataUrl = await readFileAsDataUrl(file);
  const image = (await FabricImage.fromURL(dataUrl)) as StudioObject;
  image.set({
    left: 660,
    top: 348,
    scaleX: 250 / (image.width || 250),
    scaleY: 170 / (image.height || 170),
    angle: -2,
  });
  image.journalMeta = {
    id: createId("photo"),
    type: "image",
    label: file.name,
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
  const active = canvas.getActiveObject() as StudioObject | undefined;
  if (active && !active.journalMeta?.locked) {
    canvas.remove(active);
    canvas.discardActiveObject();
    canvas.renderAll();
  }
}

function bringActiveForward(canvas: Canvas) {
  const active = canvas.getActiveObject() as StudioObject | undefined;
  if (active && !active.journalMeta?.locked) {
    canvas.bringObjectForward(active);
    canvas.renderAll();
    updateLayerList(canvas);
  }
}

function sendActiveBackward(canvas: Canvas) {
  const active = canvas.getActiveObject() as StudioObject | undefined;
  if (active && !active.journalMeta?.locked) {
    canvas.sendObjectBackwards(active);
    canvas.renderAll();
    updateLayerList(canvas);
  }
}

async function saveCurrentDraft(canvas: Canvas, fields: StudioFields) {
  const layout = layoutFromCanvas(canvas, fields.slug.value);
  await saveDraft({
    id: DRAFT_ID,
    updatedAt: new Date().toISOString(),
    meta: readMeta(fields),
    canvasJson: (canvas.toJSON as (propertiesToInclude?: string[]) => unknown)(["journalMeta"]),
    layout,
  });
  fields.output.value = "草稿已保存到当前浏览器。";
}

async function restoreLastDraft(canvas: Canvas, fields: StudioFields) {
  const draftId = getLastDraftId();
  if (!draftId) {
    return;
  }
  const draft = await loadDraft(draftId);
  if (!draft || draft.id !== DRAFT_ID || draft.layout.page.size !== "b5-spread") {
    return;
  }
  writeMeta(fields, draft.meta);
  await canvas.loadFromJSON(draft.canvasJson as string | Record<string, unknown>);
  canvas.renderAll();
  updateLayerList(canvas);
  updateInspector(canvas, fields);
}

function exportCurrent(canvas: Canvas, fields: StudioFields) {
  const meta = readMeta(fields);
  const slug = safeSlug(meta.slug);
  const layout = layoutFromCanvas(canvas, slug);
  const tags = meta.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const tagYaml = tags.map((tag) => `  - ${tag}`).join("\n");
  const markdown = `---\ntitle: "${escapeYaml(meta.title)}"\ndate: ${meta.date}\nsummary: "${escapeYaml(meta.summary)}"\ntags:\n${tagYaml || "  - 读书"}\nmood: "${escapeYaml(meta.mood)}"\nlocation: "${escapeYaml(meta.location)}"\nbookTitle: "${escapeYaml(meta.bookTitle ?? "")}"\nauthor: "${escapeYaml(meta.author ?? "")}"\njournalLayout: "/assets/life/${slug}/layout.json"\n---\n\n${meta.body.trim()}\n`;
  const json = JSON.stringify(layout, null, 2);
  fields.output.value = `# src/content/life/${slug}.md\n\n${markdown}\n# public/assets/life/${slug}/layout.json\n\n${json}`;
}

function layoutFromCanvas(canvas: Canvas, slug: string): JournalLayout {
  const elements = canvas
    .getObjects()
    .filter((object) => {
      const meta = (object as StudioObject).journalMeta;
      return meta && !meta.locked && meta.type !== "background";
    })
    .map((object, index) => objectToElement(object as StudioObject, index, slug));
  return {
    version: 2,
    page: {
      size: "b5-spread",
      orientation: "landscape",
      theme: "reading-journal-spread",
    },
    elements,
  };
}

function objectToElement(object: StudioObject, index: number, slug: string): JournalElement {
  const meta = object.journalMeta;
  const scaledWidth = Math.round((object.width ?? 0) * (object.scaleX ?? 1));
  const scaledHeight = Math.round((object.height ?? 0) * (object.scaleY ?? 1));
  const type = meta?.type === "background" ? "frame" : meta?.type ?? "text";
  const text = type === "text" ? object.text : meta?.text;
  return {
    id: meta?.id ?? createId("element"),
    type,
    assetId: meta?.assetId,
    text,
    src: meta?.src?.replace("/reading-journal-page/", `/${safeSlug(slug)}/`),
    alt: meta?.alt,
    x: Math.round(object.left ?? 0),
    y: Math.round(object.top ?? 0),
    width: Math.max(24, scaledWidth),
    height: Math.max(24, scaledHeight),
    rotation: Math.round(object.angle ?? 0),
    zIndex: index + 5,
  };
}

function readMeta(fields: StudioFields): JournalDraftMeta {
  return {
    title: fields.title.value,
    date: fields.date.value,
    summary: fields.summary.value,
    tags: fields.tags.value,
    mood: fields.mood.value,
    location: fields.location.value,
    slug: safeSlug(fields.slug.value),
    body: fields.body.value,
    bookTitle: fields.bookTitle.value,
    author: fields.author.value,
  };
}

function writeMeta(fields: StudioFields, meta: JournalDraftMeta) {
  fields.title.value = meta.title;
  fields.date.value = meta.date;
  fields.summary.value = meta.summary;
  fields.tags.value = meta.tags;
  fields.mood.value = meta.mood;
  fields.location.value = meta.location;
  fields.slug.value = meta.slug;
  fields.body.value = meta.body;
  fields.bookTitle.value = meta.bookTitle ?? "一间，只属于自己的房间";
  fields.author.value = meta.author ?? "伍尔夫";
}

function updateLayerList(canvas: Canvas) {
  const container = document.querySelector<HTMLElement>("[data-layer-list]");
  if (!container) {
    return;
  }
  const active = canvas.getActiveObject() as StudioObject | undefined;
  const objects = canvas
    .getObjects()
    .filter((object) => {
      const meta = (object as StudioObject).journalMeta;
      return meta && !meta.locked && meta.type !== "background";
    })
    .reverse() as StudioObject[];

  if (!objects.length) {
    container.innerHTML = "<p>还没有可编辑图层。</p>";
    return;
  }

  container.innerHTML = "";
  objects.forEach((object, index) => {
    const meta = object.journalMeta;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.layerId = meta?.id ?? "";
    button.classList.toggle("active", object === active);
    button.innerHTML = `<span class=\"layer-index\">${String(index + 1).padStart(2, "0")}</span><span>${escapeHtml(meta?.label ?? "未命名图层")}</span>`;
    button.addEventListener("click", () => {
      canvas.setActiveObject(object);
      canvas.renderAll();
      updateLayerList(canvas);
      const fields = getFields();
      updateInspector(canvas, fields);
    });
    container.append(button);
  });
}

function updateInspector(canvas: Canvas, fields: StudioFields) {
  const active = canvas.getActiveObject() as StudioObject | undefined;
  const locked = !active || active.journalMeta?.locked;
  fields.selectedName.value = locked ? "未选择" : active.journalMeta?.label ?? "未命名";
  fields.selectedX.value = locked ? "" : String(Math.round(active.left ?? 0));
  fields.selectedY.value = locked ? "" : String(Math.round(active.top ?? 0));
  fields.selectedWidth.value = locked ? "" : String(Math.round((active.width ?? 0) * (active.scaleX ?? 1)));
  fields.selectedAngle.value = locked ? "" : String(Math.round(active.angle ?? 0));
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function safeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "reading-journal-page";
}

function escapeYaml(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const output = document.getElementById("journal-export");
  if (output instanceof HTMLTextAreaElement) {
    output.value = `操作失败：${message}`;
  }
}
