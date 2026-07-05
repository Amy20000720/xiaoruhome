# 郭小儒的博客

中文个人博客和作品集入口。首页包含个人介绍、个人照片、互动地图导航，以及 About、Projects、Blog、Life、Contact 五个入口。

## 访问地址

部署完成后，公开访问地址是：

```text
https://amy20000720.github.io/xiaoruhome/
```

第一次启用 GitHub Pages 时，需要在 GitHub 仓库里设置一次：

1. 打开 `Settings`。
2. 进入 `Pages`。
3. 在 `Build and deployment` 的 `Source` 里选择 `Deploy from a branch`。
4. Branch 选择 `gh-pages`，文件夹选择 `/ (root)`。
5. 保存后等待 GitHub Pages 发布完成。

## 开发

```bash
npm install
npm run dev
```

本地预览地址通常是：

```text
http://127.0.0.1:4321/xiaoruhome/
```

## 构建

```bash
npm run build
```

## 发布到公网

```bash
npm run deploy
```

这个命令会先构建网站，再把 `dist/` 里的静态文件推送到 `gh-pages` 分支。GitHub Pages 会从这个分支发布网站。

## 内容

- 博客文章：`src/content/posts/`
- 项目：`src/content/projects/`
- 生活记录：`src/content/life/`

新增 Markdown 文件后，列表页会自动读取并展示。

## 更新博客文章

在 `src/content/posts/` 里新增一个 `.md` 文件，例如：

```text
src/content/posts/my-new-post.md
```

文件开头需要写 frontmatter：

```md
---
title: "文章标题"
date: 2026-07-05
summary: "一句话摘要，会显示在文章列表。"
tags: ["Astro", "技术笔记"]
---

这里开始写正文。
```

然后运行：

```bash
npm run build
git add src/content/posts/my-new-post.md
git commit -m "Add new blog post"
git push
npm run deploy
```

`git push` 会保存源码更新，`npm run deploy` 会更新公开网站。

## 更新项目和生活记录

项目内容放在：

```text
src/content/projects/
```

生活记录放在：

```text
src/content/life/
```

它们和技术文章一样都是 Markdown 文件。新增文件后运行 `npm run build` 检查，再提交并 push。

## 修改网页设计

常改的文件：

- 首页个人介绍和互动地图：`src/pages/index.astro`
- 全站样式、颜色、布局：`src/styles/global.css`
- 页面外壳和顶部导航：`src/layouts/BaseLayout.astro`
- 内容结构和字段校验：`src/content.config.ts`
- 关于我页面：`src/pages/about.astro`
- 联系方式页面：`src/pages/contact.astro`

修改设计后的推荐流程：

```bash
npm run dev
npm run build
git add .
git commit -m "Update website design"
git push
npm run deploy
```

`git push` 保存源码，`npm run deploy` 发布网页。
