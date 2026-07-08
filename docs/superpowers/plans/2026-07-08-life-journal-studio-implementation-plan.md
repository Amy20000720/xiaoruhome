# A5 电子手帐生活页实施计划

## 目标

把 `/life` 从普通生活记录列表升级为公开展示的 A5 电子手帐区，并新增本地使用的 `/life/studio` 编辑器。第一版保持静态站架构：公开页面由 Astro 渲染，编辑器在本地浏览器中保存草稿并导出 Markdown 与 layout JSON，不做登录、云保存或在线发布。

## 阶段 1：内容模型和示例数据

修改：

- `src/content.config.ts`
- `src/content/life/*.md`
- `public/assets/life/<slug>/layout.json`

任务：

- 在 life schema 中增加可选 `journalLayout` 字段。
- 保留现有 `title`、`date`、`summary`、`tags`、`mood`、`location` 字段。
- 增加一篇示例 A5 手帐记录，或为现有示例记录补充 layout JSON。
- 将 layout JSON 固定放在 `public/assets/life/<slug>/layout.json`。

验收：

- 没有 `journalLayout` 的旧记录仍能显示。
- 有 `journalLayout` 的记录能被后续展示组件读取。
- `astro check` 不因 schema 变化报错。

## 阶段 2：手帐展示组件

新增或修改：

- `src/components/JournalPage.astro`
- `src/components/JournalElement.astro`
- `src/styles/global.css`

任务：

- 建立 A5 竖版纸张组件。
- 支持 `text`、`image`、`sticker`、`tape`、`note`、`stamp` 等元素类型。
- 用 CSS 变量控制坐标、尺寸、旋转角度和层级。
- 保证正文仍由真实 HTML/Markdown 渲染，而不是图片。
- 为没有 layout JSON 的记录提供默认手帐样式。

验收：

- 示例记录能显示为完整 A5 手帐页。
- 元素可以正确定位、缩放和旋转。
- 正文、标题和日期清晰可读。
- 移动端 A5 页面按宽度缩放，不横向溢出。

## 阶段 3：素材库

新增：

- `public/assets/journal/papers/`
- `public/assets/journal/tapes/`
- `public/assets/journal/stickers/`
- `public/assets/journal/frames/`
- `src/lib/journalAssets.ts`

任务：

- 内置第一批 SVG/CSS 素材。
- 素材覆盖纸张、胶带、贴纸、便签、日期章、照片框。
- 建立稳定素材 id、分类、名称、默认尺寸和预览路径。
- 展示页和编辑器共用同一份素材清单。

验收：

- 至少包含 20 个可用素材。
- 素材在公开展示页能正常渲染。
- 素材路径不依赖本机绝对路径。
- 素材文件体积保持轻量。

## 阶段 4：改造 `/life` 目录页

修改：

- `src/pages/life/index.astro`
- `src/styles/global.css`

任务：

- 将普通列表改为电子手帐目录。
- 显示最近记录的大型手帐预览。
- 显示月份、心情、地点和标签索引。
- 将记录卡片改为纸张、贴纸或标签样式。
- 保留每条记录进入 `/life/[id]/` 的清晰路径。

验收：

- `/life` 一眼看起来像电子手帐目录，而不是普通博客列表。
- 所有公开生活记录仍可进入详情页。
- 桌面和移动端都可读、可点。

## 阶段 5：改造 `/life/[id]` 详情页

修改：

- `src/pages/life/[...id].astro`
- `src/components/JournalPage.astro`
- `src/styles/global.css`

任务：

- 使用手帐展示组件渲染单篇记录。
- 加入返回目录、上一篇、下一篇入口。
- 对没有 layout JSON 的旧记录使用默认 A5 模板。
- 对有 layout JSON 的记录按 JSON 渲染元素层。

验收：

- 新旧 life 记录都能正常访问。
- 示例记录展示为 A5 手帐页。
- 导航入口不会遮挡手帐内容。

## 阶段 6：本地 Studio 编辑器基础

新增：

- `src/pages/life/studio.astro`
- `src/scripts/journal-studio.ts`
- `src/scripts/journal-storage.ts`
- `src/styles/journal-studio.css`

依赖：

- `fabric`

任务：

- 建立桌面优先的编辑器页面。
- 使用 Fabric.js 初始化固定 A5 画布。
- 支持添加文字、内置贴纸、胶带和图片。
- 支持拖拽移动、缩放、旋转、删除、层级调整。
- 移动端显示只读或简化提示。

验收：

- `/life/studio` 在本地 dev server 中可打开。
- 画布非空，A5 尺寸稳定。
- 添加的元素能拖拽、缩放、旋转和删除。
- 编辑器不会影响公开页面构建。

## 阶段 7：本地草稿和导出

修改：

- `src/scripts/journal-storage.ts`
- `src/scripts/journal-studio.ts`

任务：

- 使用 IndexedDB 保存草稿 layout 和上传图片 blob。
- 使用 localStorage 保存最近草稿 id。
- 支持刷新后恢复最近草稿。
- 导出 Markdown frontmatter。
- 导出 layout JSON。
- 对上传图片给出建议保存路径，例如 `public/assets/life/<slug>/photo-1.webp`。

验收：

- 刷新页面后草稿仍能恢复。
- 导出的 Markdown 包含 `title`、`date`、`summary`、`tags`、`mood`、`location`、`journalLayout`。
- 导出的 layout JSON 可被公开展示组件使用。

## 阶段 8：视觉打磨和响应式验证

任务：

- 强化手绘、糖果色、贴纸化、Y2K 视觉。
- 保证正文阅读区域有足够对比度。
- 检查 `/life`、`/life/[id]`、`/life/studio`。
- 使用桌面和移动端视口截图验证。

验收：

- 公开页面视觉明显区别于普通博客页。
- 手帐装饰不遮挡正文和导航。
- 移动端没有横向溢出。
- 编辑器桌面端控件不重叠。

## 阶段 9：构建和交付

执行：

```bash
npm run build
git status --short --branch
```

验收：

- `npm run build` 通过。
- 改动范围只包含手帐功能相关文件。
- 原有文章、项目、首页和联系页不发生无关视觉或内容回归。
- 提交信息清楚说明手帐功能范围。

## 不做事项

- 不做账号登录。
- 不做云端保存。
- 不做在线发布按钮。
- 不做多页手帐书编辑。
- 不做自由画笔和橡皮擦。
- 不把正式正文只保存为图片。
