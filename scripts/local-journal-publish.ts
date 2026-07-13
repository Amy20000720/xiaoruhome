import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import type { Plugin, ViteDevServer } from "vite";

const MAX_REQUEST_BYTES = 12 * 1024 * 1024;
const MAX_IMAGE_BYTES = 7 * 1024 * 1024;
const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ALLOWED_IMAGE_TYPES = new Map([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

interface PublishMeta {
  title: string;
  date: string;
  summary: string;
  tags: string;
  mood: string;
  location: string;
  slug: string;
  body: string;
}

interface PublishElement {
  id?: string;
  src?: string;
  [key: string]: unknown;
}

interface PublishPayload {
  meta: PublishMeta;
  layout: {
    version: number;
    page: Record<string, unknown>;
    elements: PublishElement[];
  };
  overwrite?: boolean;
}

interface LocalJournalPublishOptions {
  base: string;
}

function normalizeBase(base: string) {
  const normalized = `/${base.replace(/^\/+|\/+$/g, "")}`.replace("//", "/");
  return normalized === "/" ? "" : normalized;
}

function writeJson(response: import("node:http").ServerResponse, status: number, payload: unknown) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > MAX_REQUEST_BYTES) {
      throw new Error("请求超过 12 MB 限制。");
    }
    chunks.push(buffer);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function isPublishPayload(value: unknown): value is PublishPayload {
  if (!value || typeof value !== "object") {
    return false;
  }
  const payload = value as Partial<PublishPayload>;
  return (
    Boolean(payload.meta) &&
    typeof payload.meta?.title === "string" &&
    typeof payload.meta?.date === "string" &&
    typeof payload.meta?.summary === "string" &&
    typeof payload.meta?.tags === "string" &&
    typeof payload.meta?.mood === "string" &&
    typeof payload.meta?.location === "string" &&
    typeof payload.meta?.slug === "string" &&
    typeof payload.meta?.body === "string" &&
    Boolean(payload.layout) &&
    Boolean(payload.layout?.page) &&
    Array.isArray(payload.layout?.elements)
  );
}

function escapeYaml(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ");
}

function markdownFor(meta: PublishMeta, layoutPath: string) {
  const tags = meta.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => `  - "${escapeYaml(tag)}"`)
    .join("\n");

  return `---\ntitle: "${escapeYaml(meta.title || "未命名读书手帐")}"\ndate: ${meta.date}\nsummary: "${escapeYaml(meta.summary || "一张读书手帐页。")}"\ntags:\n${tags || '  - "读书"'}\nmood: "${escapeYaml(meta.mood)}"\nlocation: "${escapeYaml(meta.location)}"\ndraft: false\njournalLayout: "${layoutPath}"\n---\n\n${meta.body.trim() || "一张读书手帐页。"}\n`;
}

function parseImageDataUrl(value: string) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=]+)$/.exec(value);
  if (!match) {
    return null;
  }
  const extension = ALLOWED_IMAGE_TYPES.get(match[1]);
  if (!extension) {
    return null;
  }
  const buffer = Buffer.from(match[2], "base64");
  return buffer.length > MAX_IMAGE_BYTES ? null : { buffer, extension };
}

function safeAssetId(value: string | undefined, index: number) {
  const normalized = (value ?? `image-${index + 1}`).replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 64);
  return normalized || `image-${index + 1}`;
}

async function readPriorStudioUploads(layoutFile: string, slug: string) {
  try {
    const layout = JSON.parse(await readFile(layoutFile, "utf8")) as { elements?: PublishElement[] };
    return new Set(
      (layout.elements ?? [])
        .map((element) => element.src)
        .filter((source): source is string => typeof source === "string")
        .filter((source) => source.startsWith(`/assets/life/${slug}/upload-`))
        .map((source) => source.slice(source.lastIndexOf("/") + 1)),
    );
  } catch {
    return new Set<string>();
  }
}

async function publish(root: string, payload: PublishPayload) {
  const { meta, layout } = payload;
  const slug = meta.slug.trim().toLowerCase();
  if (!SAFE_SLUG.test(slug)) {
    throw new Error("Slug 只能使用小写字母、数字和连字符。");
  }
  if (!meta.date || Number.isNaN(Date.parse(meta.date))) {
    throw new Error("请填写有效日期。");
  }
  if (layout.page.size !== "b5" || layout.page.orientation !== "portrait") {
    throw new Error("只能发布竖版 B5 手帐页。");
  }
  if (layout.elements.length > 120) {
    throw new Error("单张手帐页最多可发布 120 个元素。");
  }

  const contentRoot = resolve(root, "src", "content", "life");
  const assetsRoot = resolve(root, "public", "assets", "life");
  const markdownFile = resolve(contentRoot, `${slug}.md`);
  const assetDirectory = resolve(assetsRoot, slug);
  const layoutFile = resolve(assetDirectory, "layout.json");
  if (!markdownFile.startsWith(`${contentRoot}/`) || !assetDirectory.startsWith(`${assetsRoot}/`)) {
    throw new Error("无效的发布路径。");
  }

  let alreadyPublished = false;
  try {
    await readFile(markdownFile, "utf8");
    alreadyPublished = true;
  } catch {
    alreadyPublished = false;
  }
  if (alreadyPublished && !payload.overwrite) {
    return { conflict: true, slug };
  }

  await mkdir(assetDirectory, { recursive: true });
  const previousUploads = await readPriorStudioUploads(layoutFile, slug);
  const nextUploads = new Set<string>();
  const normalizedElements: PublishElement[] = [];

  for (const [index, element] of layout.elements.entries()) {
    const nextElement = { ...element };
    if (typeof nextElement.src === "string" && nextElement.src.startsWith("data:")) {
      const image = parseImageDataUrl(nextElement.src);
      if (!image) {
        throw new Error(`第 ${index + 1} 张上传图片不是受支持的图片格式，或超过 7 MB。`);
      }
      const filename = `upload-${safeAssetId(nextElement.id, index)}${image.extension}`;
      await writeFile(join(assetDirectory, filename), image.buffer);
      nextUploads.add(filename);
      nextElement.src = `/assets/life/${slug}/${filename}`;
    }
    normalizedElements.push(nextElement);
  }

  for (const filename of previousUploads) {
    if (nextUploads.has(filename) || !filename.startsWith("upload-")) {
      continue;
    }
    const file = normalize(join(assetDirectory, filename));
    if (file.startsWith(`${assetDirectory}/`) && extname(file)) {
      await rm(file, { force: true });
    }
  }

  const publicLayoutPath = `/assets/life/${slug}/layout.json`;
  await writeFile(
    layoutFile,
    `${JSON.stringify({ ...layout, elements: normalizedElements }, null, 2)}\n`,
    "utf8",
  );
  await writeFile(markdownFile, markdownFor({ ...meta, slug }, publicLayoutPath), "utf8");

  return { conflict: false, slug, overwritten: alreadyPublished };
}

/** A development-only Vite endpoint for publishing a local journal page. */
export function localJournalPublish(options: LocalJournalPublishOptions): Plugin {
  const externalEndpoint = `${normalizeBase(options.base)}/__journal_publish` || "/__journal_publish";
  // Astro strips `base` before this Vite middleware receives a development request.
  const internalEndpoint = "/__journal_publish";
  let projectRoot = process.cwd();

  return {
    name: "local-journal-publish",
    apply: "serve",
    configResolved(config) {
      projectRoot = config.root;
    },
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (request, response, next) => {
        const requestPath = request.url?.split("?")[0];
        if (
          request.method !== "POST" ||
          (requestPath !== externalEndpoint && requestPath !== internalEndpoint)
        ) {
          next();
          return;
        }
        if (!request.headers["content-type"]?.includes("application/json")) {
          writeJson(response, 415, { error: "发布请求必须使用 application/json。" });
          return;
        }

        try {
          const body = await readJsonBody(request);
          if (!isPublishPayload(body)) {
            writeJson(response, 400, { error: "发布数据不完整。" });
            return;
          }
          const result = await publish(projectRoot, body);
          if (result.conflict) {
            writeJson(response, 409, { code: "slug-exists", slug: result.slug, error: "此 slug 已有公开页面。" });
            return;
          }
          writeJson(response, 200, {
            ...result,
            publicPath: `${normalizeBase(options.base)}/life/${result.slug}/`,
          });
        } catch (error) {
          writeJson(response, 400, {
            error: error instanceof Error ? error.message : "发布失败。",
          });
        }
      });
    },
  };
}
