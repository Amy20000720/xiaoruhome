import { Canvas, FabricImage, FabricObject, Textbox } from "fabric";
import {
  JOURNAL_PAGE_HEIGHT,
  JOURNAL_PAGE_WIDTH,
} from "../lib/journalAssets";
import type {
  JournalElement,
  JournalLayout,
  JournalTextFont,
  JournalTextStyle,
} from "../lib/journalLayout";
import {
  getLastDraftId,
  loadDraft,
  saveDraft,
  type JournalDraftMeta,
} from "./journal-storage";

const DRAFT_ID = "reading-journal-b5-current";
const SHEET_PAGE_SIZE = 6;
const MAX_LOCAL_IMAGE_BYTES = 7 * 1024 * 1024;

const textFontFamilies: Record<JournalTextFont, string> = {
  serif: "Noto Serif SC, Songti SC, STSong, serif",
  sans: "Noto Sans SC, PingFang SC, Hiragino Sans GB, sans-serif",
  wenkai: "LXGW WenKai, KaiTi, STKaiti, cursive",
  hand: "Ma Shan Zheng, KaiTi, STKaiti, cursive",
};

interface MaterialItem {
  id: string;
  name: string;
  src: string;
  sourceItemPage: string;
  tags: string[];
}

interface MaterialSheet {
  id: string;
  name: string;
  category: string;
  style: string[];
  source: {
    provider: string;
    termsUrl: string;
    licenseNote: string;
  };
  defaultPlacement: {
    width: number;
    height: number;
    rotation: number;
  };
  items: MaterialItem[];
}

interface StudioBootstrap {
  base: string;
  sheets: MaterialSheet[];
}

interface StudioObjectMeta {
  id: string;
  type: JournalElement["type"];
  label: string;
  src?: string;
  alt?: string;
  assetId?: string;
  textStyle?: JournalTextStyle;
}

type StudioObject = FabricObject & {
  journalMeta?: StudioObjectMeta;
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fill?: string;
  textAlign?: "left" | "center" | "right";
  lineHeight?: number;
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
  selectedX: HTMLInputElement;
  selectedY: HTMLInputElement;
  selectedWidth: HTMLInputElement;
  selectedAngle: HTMLInputElement;
  selectedOpacity: HTMLInputElement;
  textFont: HTMLSelectElement;
  textSize: HTMLInputElement;
  textColor: HTMLInputElement;
  textAlign: HTMLSelectElement;
  selectedName: HTMLOutputElement;
  status: HTMLElement;
  publicLink: HTMLAnchorElement;
}

interface TextDefaults {
  font: JournalTextFont;
  fontSize: number;
  color: string;
  align: "left" | "center" | "right";
}

const root = document.querySelector<HTMLElement>("[data-journal-studio]");
const canvasElement = document.querySelector<HTMLCanvasElement>("#journal-canvas");

if (root && canvasElement) {
  const bootstrap = readBootstrap();
  const canvas = new Canvas(canvasElement, {
    width: JOURNAL_PAGE_WIDTH,
    height: JOURNAL_PAGE_HEIGHT,
    preserveObjectStacking: true,
    selection: true,
  });
  const fields = getFields();
  const textDefaults: TextDefaults = {
    font: "serif",
    fontSize: 22,
    color: "#3d3a32",
    align: "left",
  };
  let activeSheetIndex = 0;
  let sheetPage = 0;

  renderMaterialBrowser(
    bootstrap,
    canvas,
    () => activeSheetIndex,
    () => sheetPage,
    (index) => {
      activeSheetIndex = index;
      sheetPage = 0;
    },
    (next) => {
      sheetPage = next;
    },
  );
  bindActions(canvas, fields, bootstrap, textDefaults, () => activeSheetIndex, () => sheetPage, (index) => {
    activeSheetIndex = index;
    sheetPage = 0;
  }, (next) => {
    sheetPage = next;
  });
  bindCanvasState(canvas, fields, textDefaults);
  bindInspector(canvas, fields, textDefaults);
  updateLayerList(canvas, fields);
  updateInspector(canvas, fields, textDefaults);
  restoreLastDraft(canvas, fields, textDefaults).catch((error) => setStatus(fields, errorMessage(error), "error"));
}

function readBootstrap(): StudioBootstrap {
  const node = document.getElementById("journal-material-sheets");
  if (!node?.textContent) {
    return { base: "/", sheets: [] };
  }
  try {
    const data = JSON.parse(node.textContent) as Partial<StudioBootstrap>;
    return {
      base: typeof data.base === "string" ? data.base : "/",
      sheets: Array.isArray(data.sheets) ? data.sheets : [],
    };
  } catch {
    return { base: "/", sheets: [] };
  }
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

function getSelect(id: string) {
  const select = document.getElementById(id);
  if (!(select instanceof HTMLSelectElement)) {
    throw new Error(`Missing select #${id}`);
  }
  return select;
}

function getFields(): StudioFields {
  const selectedName = document.querySelector<HTMLOutputElement>("[data-selected-name]");
  const status = document.querySelector<HTMLElement>("[data-studio-status]");
  const publicLink = document.querySelector<HTMLAnchorElement>("[data-public-link]");
  if (!selectedName || !status || !publicLink) {
    throw new Error("Missing Studio status controls.");
  }
  return {
    title: getInput("journal-title"),
    date: getInput("journal-date"),
    summary: getTextArea("journal-summary"),
    tags: getInput("journal-tags"),
    mood: getInput("journal-mood"),
    location: getInput("journal-location"),
    slug: getInput("journal-slug"),
    body: getTextArea("journal-body"),
    selectedX: getInput("selected-x"),
    selectedY: getInput("selected-y"),
    selectedWidth: getInput("selected-width"),
    selectedAngle: getInput("selected-angle"),
    selectedOpacity: getInput("selected-opacity"),
    textFont: getSelect("text-font"),
    textSize: getInput("text-size"),
    textColor: getInput("text-color"),
    textAlign: getSelect("text-align"),
    selectedName,
    status,
    publicLink,
  };
}

function bindActions(
  canvas: Canvas,
  fields: StudioFields,
  bootstrap: StudioBootstrap,
  defaults: TextDefaults,
  getSheetIndex: () => number,
  getSheetPage: () => number,
  setSheetIndex: (index: number) => void,
  setSheetPage: (page: number) => void,
) {
  document.querySelectorAll<HTMLElement>("[data-action]").forEach((control) => {
    control.addEventListener("click", () => {
      const action = control.dataset.action;
      if (action === "select") {
        canvas.discardActiveObject();
        canvas.requestRenderAll();
      }
      if (action === "add-text") addText(canvas, defaults);
      if (action === "duplicate") duplicateActive(canvas).catch((error) => setStatus(fields, errorMessage(error), "error"));
      if (action === "delete") deleteActive(canvas);
      if (action === "bring-forward") moveActive(canvas, "forward");
      if (action === "send-backward") moveActive(canvas, "backward");
      if (action === "bring-front") moveActive(canvas, "front");
      if (action === "send-back") moveActive(canvas, "back");
      if (action === "new-page") newPage(canvas, fields);
      if (action === "save") saveCurrentDraft(canvas, fields).catch((error) => setStatus(fields, errorMessage(error), "error"));
      if (action === "publish") publishCurrent(canvas, fields).catch((error) => setStatus(fields, errorMessage(error), "error"));
      if (action === "previous-sheet-page" || action === "next-sheet-page") {
        const sheet = bootstrap.sheets[getSheetIndex()];
        if (!sheet) return;
        const lastPage = Math.max(0, Math.ceil(sheet.items.length / SHEET_PAGE_SIZE) - 1);
        const nextPage = action === "previous-sheet-page" ? Math.max(0, getSheetPage() - 1) : Math.min(lastPage, getSheetPage() + 1);
        setSheetPage(nextPage);
        refreshMaterialBrowser(bootstrap, canvas, getSheetIndex, getSheetPage, setSheetIndex, setSheetPage);
      }
    });
  });

  document.querySelector<HTMLInputElement>("[data-action='upload-image']")?.addEventListener("change", (event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      addUserImage(canvas, file).catch((error) => setStatus(fields, errorMessage(error), "error"));
      input.value = "";
    }
  });
}

function bindCanvasState(canvas: Canvas, fields: StudioFields, defaults: TextDefaults) {
  const refresh = () => {
    updateLayerList(canvas, fields);
    updateInspector(canvas, fields, defaults);
  };
  canvas.on("selection:created", refresh);
  canvas.on("selection:updated", refresh);
  canvas.on("selection:cleared", refresh);
  canvas.on("object:modified", refresh);
  canvas.on("object:added", refresh);
  canvas.on("object:removed", refresh);
  canvas.on("text:changed", () => {
    const active = canvas.getActiveObject() as StudioObject | undefined;
    if (active?.journalMeta && typeof active.text === "string") {
      active.journalMeta.label = active.text.replace(/\s+/g, " ").trim().slice(0, 18) || "文字";
    }
    refresh();
  });
}

function bindInspector(canvas: Canvas, fields: StudioFields, defaults: TextDefaults) {
  [fields.selectedX, fields.selectedY, fields.selectedWidth, fields.selectedAngle, fields.selectedOpacity].forEach((input) => {
    input.addEventListener("input", () => {
      const active = canvas.getActiveObject() as StudioObject | undefined;
      if (!active) return;
      const value = Number(input.value);
      if (!Number.isFinite(value)) return;
      const field = input.dataset.transformField;
      if (field === "x") active.set("left", value);
      if (field === "y") active.set("top", value);
      if (field === "angle") active.set("angle", value);
      if (field === "opacity") active.set("opacity", Math.max(0.1, Math.min(1, value)));
      if (field === "width") {
        active.set("scaleX", Math.max(8, value) / Math.max(1, active.width ?? value));
      }
      active.setCoords();
      canvas.requestRenderAll();
      updateLayerList(canvas, fields);
      updateInspector(canvas, fields, defaults);
    });
  });

  const applyTextStyle = () => {
    defaults.font = toTextFont(fields.textFont.value);
    defaults.fontSize = clampNumber(Number(fields.textSize.value), 10, 72, 22);
    defaults.color = validHexColor(fields.textColor.value) ? fields.textColor.value : "#3d3a32";
    defaults.align = toTextAlign(fields.textAlign.value);
    const active = canvas.getActiveObject() as StudioObject | undefined;
    if (!isTextObject(active)) return;
    active.set({
      fontFamily: textFontFamilies[defaults.font],
      fontSize: defaults.fontSize,
      fill: defaults.color,
      textAlign: defaults.align,
    });
    const meta = active.journalMeta;
    if (!meta) return;
    active.journalMeta = {
      ...meta,
      textStyle: textStyleFromDefaults(defaults),
    };
    active.setCoords();
    canvas.requestRenderAll();
    updateInspector(canvas, fields, defaults);
  };
  fields.textFont.addEventListener("change", applyTextStyle);
  fields.textSize.addEventListener("input", applyTextStyle);
  fields.textColor.addEventListener("input", applyTextStyle);
  fields.textAlign.addEventListener("change", applyTextStyle);
}

function renderMaterialBrowser(
  bootstrap: StudioBootstrap,
  canvas: Canvas,
  getSheetIndex: () => number,
  getSheetPage: () => number,
  setSheetIndex: (index: number) => void,
  setSheetPage: (page: number) => void,
) {
  refreshMaterialBrowser(bootstrap, canvas, getSheetIndex, getSheetPage, setSheetIndex, setSheetPage);
}

function refreshMaterialBrowser(
  bootstrap: StudioBootstrap,
  canvas: Canvas,
  getSheetIndex: () => number,
  getSheetPage: () => number,
  setSheetIndex: (index: number) => void,
  setSheetPage: (page: number) => void,
) {
  const tabs = document.querySelector<HTMLElement>("[data-sheet-tabs]");
  const grid = document.querySelector<HTMLElement>("[data-material-grid]");
  const pageLabel = document.querySelector<HTMLElement>("[data-sheet-page-label]");
  const source = document.querySelector<HTMLElement>("[data-material-source]");
  const count = document.querySelector<HTMLElement>("[data-sheet-count]");
  const previous = document.querySelector<HTMLButtonElement>("[data-action='previous-sheet-page']");
  const next = document.querySelector<HTMLButtonElement>("[data-action='next-sheet-page']");
  if (!tabs || !grid || !pageLabel || !source || !count || !previous || !next) return;

  tabs.replaceChildren();
  bootstrap.sheets.forEach((sheet, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = index === getSheetIndex() ? "active" : "";
    button.textContent = sheet.name;
    button.addEventListener("click", () => {
      setSheetIndex(index);
      setSheetPage(0);
      refreshMaterialBrowser(bootstrap, canvas, getSheetIndex, getSheetPage, setSheetIndex, setSheetPage);
    });
    tabs.append(button);
  });

  const sheet = bootstrap.sheets[getSheetIndex()];
  if (!sheet) {
    count.textContent = "0 sheets";
    pageLabel.textContent = "还没有素材 Sheet";
    source.textContent = "请在 public/assets/life-journal/sheets 中添加有许可记录的素材。";
    grid.replaceChildren();
    previous.disabled = true;
    next.disabled = true;
    return;
  }

  const pageCount = Math.max(1, Math.ceil(sheet.items.length / SHEET_PAGE_SIZE));
  const page = Math.min(getSheetPage(), pageCount - 1);
  if (page !== getSheetPage()) setSheetPage(page);
  const items = sheet.items.slice(page * SHEET_PAGE_SIZE, page * SHEET_PAGE_SIZE + SHEET_PAGE_SIZE);
  count.textContent = `${sheet.items.length} items`;
  pageLabel.textContent = `${page + 1} / ${pageCount}`;
  source.textContent = `${sheet.source.provider} · ${sheet.category} · ${sheet.source.licenseNote}`;
  previous.disabled = page === 0;
  next.disabled = page === pageCount - 1;
  grid.replaceChildren();
  items.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "material-item";
    button.title = `${item.name}，来源：${sheet.source.provider}`;
    const image = document.createElement("img");
    image.src = withBasePath(bootstrap.base, item.src);
    image.alt = "";
    image.loading = "lazy";
    const label = document.createElement("span");
    label.textContent = item.name;
    button.append(image, label);
    button.addEventListener("click", () => {
      addMaterial(canvas, item, sheet, bootstrap.base).catch((error) => {
        const fields = getFields();
        setStatus(fields, errorMessage(error), "error");
      });
    });
    grid.append(button);
  });
}

async function addMaterial(canvas: Canvas, item: MaterialItem, sheet: MaterialSheet, base: string) {
  const image = (await FabricImage.fromURL(withBasePath(base, item.src))) as StudioObject;
  const placement = fitInto(image.width ?? sheet.defaultPlacement.width, image.height ?? sheet.defaultPlacement.height, sheet.defaultPlacement.width, sheet.defaultPlacement.height);
  const position = nextPosition(canvas);
  image.set({
    left: position.left,
    top: position.top,
    scaleX: placement.scaleX,
    scaleY: placement.scaleY,
    angle: sheet.defaultPlacement.rotation,
  });
  image.journalMeta = {
    id: createId("material"),
    type: "sticker",
    label: item.name,
    assetId: item.id,
    src: item.src,
    alt: item.name,
  };
  canvas.add(image);
  canvas.setActiveObject(image);
  canvas.requestRenderAll();
}

async function addUserImage(canvas: Canvas, file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("只支持图片文件。");
  }
  if (file.size > MAX_LOCAL_IMAGE_BYTES) {
    throw new Error("单张上传图片不能超过 7 MB。请压缩后重试。");
  }
  const dataUrl = await readFileAsDataUrl(file);
  const image = (await FabricImage.fromURL(dataUrl)) as StudioObject;
  const placement = fitInto(image.width ?? 180, image.height ?? 180, 220, 180);
  const position = nextPosition(canvas);
  image.set({ left: position.left, top: position.top, scaleX: placement.scaleX, scaleY: placement.scaleY, angle: -2 });
  image.journalMeta = {
    id: createId("photo"),
    type: "image",
    label: file.name,
    src: dataUrl,
    alt: file.name,
  };
  canvas.add(image);
  canvas.setActiveObject(image);
  canvas.requestRenderAll();
}

function addText(canvas: Canvas, defaults: TextDefaults) {
  const position = nextPosition(canvas);
  const object = new Textbox("双击编辑文字", {
    left: position.left,
    top: position.top,
    width: 180,
    fontFamily: textFontFamilies[defaults.font],
    fontSize: defaults.fontSize,
    fill: defaults.color,
    textAlign: defaults.align,
    lineHeight: 1.35,
    splitByGrapheme: true,
  }) as StudioObject;
  object.journalMeta = {
    id: createId("text"),
    type: "text",
    label: "双击编辑文字",
    textStyle: textStyleFromDefaults(defaults),
  };
  canvas.add(object);
  canvas.setActiveObject(object);
  canvas.requestRenderAll();
  setTimeout(() => (object as unknown as Textbox).enterEditing(), 0);
}

function nextPosition(canvas: Canvas) {
  const count = canvas.getObjects().filter((object) => (object as StudioObject).journalMeta).length;
  return { left: 56 + (count % 6) * 17, top: 74 + (count % 5) * 21 };
}

function fitInto(sourceWidth: number, sourceHeight: number, maxWidth: number, maxHeight: number) {
  const scale = Math.min(maxWidth / Math.max(1, sourceWidth), maxHeight / Math.max(1, sourceHeight));
  return { scaleX: scale, scaleY: scale };
}

async function duplicateActive(canvas: Canvas) {
  const active = canvas.getActiveObject() as StudioObject | undefined;
  const sourceMeta = active?.journalMeta;
  if (!active || !sourceMeta) return;
  const cloned = (await active.clone()) as StudioObject;
  cloned.set({ left: (active.left ?? 0) + 14, top: (active.top ?? 0) + 14 });
  cloned.journalMeta = {
    ...sourceMeta,
    id: createId(sourceMeta.type),
    label: `${sourceMeta.label} 副本`,
  };
  canvas.add(cloned);
  canvas.setActiveObject(cloned);
  canvas.requestRenderAll();
}

function deleteActive(canvas: Canvas) {
  const active = canvas.getActiveObject();
  if (!active) return;
  canvas.remove(active);
  canvas.discardActiveObject();
  canvas.requestRenderAll();
}

function moveActive(canvas: Canvas, direction: "forward" | "backward" | "front" | "back") {
  const active = canvas.getActiveObject();
  if (!active) return;
  if (direction === "forward") canvas.bringObjectForward(active);
  if (direction === "backward") canvas.sendObjectBackwards(active);
  if (direction === "front") canvas.bringObjectToFront(active);
  if (direction === "back") canvas.sendObjectToBack(active);
  canvas.requestRenderAll();
}

function newPage(canvas: Canvas, fields: StudioFields) {
  if (canvas.getObjects().length && !window.confirm("清空当前 B5 画布并新建一页？未保存的内容会丢失。")) {
    return;
  }
  canvas.clear();
  fields.publicLink.hidden = true;
  setStatus(fields, "已新建一张空白 B5 页。", "info");
}

async function saveCurrentDraft(canvas: Canvas, fields: StudioFields) {
  const layout = layoutFromCanvas(canvas);
  await saveDraft({
    id: DRAFT_ID,
    updatedAt: new Date().toISOString(),
    meta: readMeta(fields),
    canvasJson: (canvas.toJSON as (propertiesToInclude?: string[]) => unknown)(["journalMeta"]),
    layout,
  });
  setStatus(fields, "草稿已保存到当前浏览器。", "success");
}

async function restoreLastDraft(canvas: Canvas, fields: StudioFields, defaults: TextDefaults) {
  const draftId = getLastDraftId();
  if (!draftId) return;
  const draft = await loadDraft(draftId);
  if (!draft || draft.id !== DRAFT_ID) return;
  if (draft.layout.page.size !== "b5" || draft.layout.page.orientation !== "portrait") {
    setStatus(fields, "检测到旧版双页草稿，已保留但不自动载入。", "info");
    return;
  }
  writeMeta(fields, draft.meta);
  await canvas.loadFromJSON(draft.canvasJson as never);
  canvas.requestRenderAll();
  updateLayerList(canvas, fields);
  updateInspector(canvas, fields, defaults);
  setStatus(fields, "已恢复当前浏览器中的 B5 草稿。", "success");
}

async function publishCurrent(canvas: Canvas, fields: StudioFields) {
  const payload = {
    meta: readMeta(fields),
    layout: layoutFromCanvas(canvas),
  };
  setStatus(fields, "正在写入本地公开页面…", "info");
  let response = await sendPublish(payload, false);
  if (response.status === 409) {
    const conflict = await response.json() as { error?: string };
    if (!window.confirm(`${conflict.error ?? "该 slug 已存在。"}\n\n继续会覆盖这张 Studio 生成的公开页面。`)) {
      setStatus(fields, "已取消发布。", "info");
      return;
    }
    response = await sendPublish(payload, true);
  }
  const result = await response.json() as { error?: string; publicPath?: string; overwritten?: boolean };
  if (!response.ok || !result.publicPath) {
    throw new Error(result.error ?? "发布失败。");
  }
  fields.publicLink.href = result.publicPath;
  fields.publicLink.hidden = false;
  fields.publicLink.textContent = "查看公开页面";
  setStatus(fields, result.overwritten ? "已覆盖并发布公开页面。" : "已发布公开页面。", "success");
}

function sendPublish(payload: { meta: JournalDraftMeta; layout: JournalLayout }, overwrite: boolean) {
  return fetch(withBasePath(readBootstrap().base, "/__journal_publish"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, overwrite }),
  });
}

function layoutFromCanvas(canvas: Canvas): JournalLayout {
  const elements = canvas.getObjects().map((object, index) => objectToElement(object as StudioObject, index));
  return {
    version: 3,
    page: {
      size: "b5",
      orientation: "portrait",
      theme: "reading-journal-b5",
    },
    elements,
  };
}

function objectToElement(object: StudioObject, index: number): JournalElement {
  const meta = object.journalMeta;
  const type = meta?.type ?? "sticker";
  const width = Math.max(8, Math.round((object.width ?? 0) * (object.scaleX ?? 1)));
  const height = Math.max(8, Math.round((object.height ?? 0) * (object.scaleY ?? 1)));
  return {
    id: meta?.id ?? createId("element"),
    type,
    assetId: meta?.assetId,
    src: meta?.src,
    alt: meta?.alt,
    text: isTextObject(object) ? object.text : undefined,
    textStyle: isTextObject(object) ? textStyleFromObject(object, meta?.textStyle) : undefined,
    x: Math.round(object.left ?? 0),
    y: Math.round(object.top ?? 0),
    width,
    height,
    rotation: Math.round(object.angle ?? 0),
    opacity: roundOpacity(object.opacity ?? 1),
    zIndex: index + 1,
  };
}

function textStyleFromObject(object: StudioObject, fallback?: JournalTextStyle): JournalTextStyle {
  return {
    font: fontKeyForFamily(object.fontFamily) ?? fallback?.font ?? "serif",
    fontSize: clampNumber(Number(object.fontSize), 10, 72, fallback?.fontSize ?? 22),
    color: validHexColor(object.fill) ? object.fill : fallback?.color ?? "#3d3a32",
    align: toTextAlign(object.textAlign ?? fallback?.align ?? "left"),
    lineHeight: clampNumber(Number(object.lineHeight), 0.8, 2.4, fallback?.lineHeight ?? 1.35),
  };
}

function textStyleFromDefaults(defaults: TextDefaults): JournalTextStyle {
  return { font: defaults.font, fontSize: defaults.fontSize, color: defaults.color, align: defaults.align, lineHeight: 1.35 };
}

function readMeta(fields: StudioFields): JournalDraftMeta {
  return {
    title: fields.title.value.trim() || "新的读书手帐页",
    date: fields.date.value,
    summary: fields.summary.value.trim() || "一张新的读书手帐页。",
    tags: fields.tags.value,
    mood: fields.mood.value.trim(),
    location: fields.location.value.trim(),
    slug: safeSlug(fields.slug.value),
    body: fields.body.value,
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
}

function updateLayerList(canvas: Canvas, fields: StudioFields) {
  const container = document.querySelector<HTMLElement>("[data-layer-list]");
  if (!container) return;
  const active = canvas.getActiveObject();
  const objects = [...canvas.getObjects()].reverse() as StudioObject[];
  if (!objects.length) {
    container.replaceChildren();
    const message = document.createElement("p");
    message.textContent = "画布还是空白的。";
    container.append(message);
    return;
  }
  container.replaceChildren();
  objects.forEach((object, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.classList.toggle("active", object === active);
    const position = document.createElement("span");
    position.className = "layer-index";
    position.textContent = String(index + 1).padStart(2, "0");
    const label = document.createElement("span");
    label.textContent = object.journalMeta?.label ?? "未命名对象";
    button.append(position, label);
    button.addEventListener("click", () => {
      canvas.setActiveObject(object);
      canvas.requestRenderAll();
      updateLayerList(canvas, fields);
      updateInspector(canvas, fields, {
        font: toTextFont(fields.textFont.value),
        fontSize: clampNumber(Number(fields.textSize.value), 10, 72, 22),
        color: fields.textColor.value,
        align: toTextAlign(fields.textAlign.value),
      });
    });
    container.append(button);
  });
}

function updateInspector(canvas: Canvas, fields: StudioFields, defaults: TextDefaults) {
  const active = canvas.getActiveObject() as StudioObject | undefined;
  fields.selectedName.value = active?.journalMeta?.label ?? "未选择";
  fields.selectedX.value = active ? String(Math.round(active.left ?? 0)) : "";
  fields.selectedY.value = active ? String(Math.round(active.top ?? 0)) : "";
  fields.selectedWidth.value = active ? String(Math.round((active.width ?? 0) * (active.scaleX ?? 1))) : "";
  fields.selectedAngle.value = active ? String(Math.round(active.angle ?? 0)) : "";
  fields.selectedOpacity.value = active ? String(roundOpacity(active.opacity ?? 1)) : "1";

  const textStyle = isTextObject(active) ? textStyleFromObject(active, active.journalMeta?.textStyle) : textStyleFromDefaults(defaults);
  fields.textFont.value = textStyle.font ?? defaults.font;
  fields.textSize.value = String(textStyle.fontSize ?? defaults.fontSize);
  fields.textColor.value = textStyle.color ?? defaults.color;
  fields.textAlign.value = textStyle.align ?? defaults.align;
}

function isTextObject(object: StudioObject | undefined): object is StudioObject & { text: string } {
  return Boolean(object && object.journalMeta?.type === "text" && typeof object.text === "string");
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function withBasePath(base: string, path: string) {
  const normalizedBase = base === "/" ? "" : base.replace(/\/$/, "");
  return `${normalizedBase}${path.startsWith("/") ? path : `/${path}`}`;
}

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 10)}`;
}

function safeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "reading-journal-page";
}

function validHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function toTextFont(value: string): JournalTextFont {
  return value === "sans" || value === "wenkai" || value === "hand" ? value : "serif";
}

function toTextAlign(value: string): "left" | "center" | "right" {
  return value === "center" || value === "right" ? value : "left";
}

function fontKeyForFamily(value: string | undefined): JournalTextFont | null {
  if (!value) return null;
  if (value.includes("Noto Sans")) return "sans";
  if (value.includes("LXGW")) return "wenkai";
  if (value.includes("Ma Shan")) return "hand";
  if (value.includes("Noto Serif")) return "serif";
  return null;
}

function clampNumber(value: number, min: number, max: number, fallback: number) {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
}

function roundOpacity(value: number) {
  return Math.round(value * 100) / 100;
}

function setStatus(fields: StudioFields, message: string, state: "info" | "success" | "error") {
  fields.status.textContent = message;
  fields.status.dataset.state = state;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "操作失败。";
}
