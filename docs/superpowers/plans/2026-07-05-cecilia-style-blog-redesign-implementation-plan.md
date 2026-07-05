# Cecilia 风格个人博客改版实施计划

## 目标

把当前“糖果小镇”主题站调整为更接近 `cecibaldoni.github.io` 的个人博客结构：以“郭小儒”为首页主体，使用用户提供的照片，保留互动地图作为内容入口，但整体文字、项目页和博客页改成更克制的个人博客/轻学术展示方式。

## 阶段 1：照片资源处理

处理用户提供的照片：

- 源文件：`/Users/xiaoru/Pictures/Photos Library.photoslibrary/originals/4/487FB75E-10D8-48A2-BD67-A5B98A3F4246.jpeg`。
- 生成网页用横向个人照：`public/assets/profile/guo-xiaoru-profile.webp`。
- 生成头像/缩略图：`public/assets/profile/guo-xiaoru-avatar.webp`。

验收：

- 图片文件体积适合网页加载。
- 首页和 About 页可以正常引用。
- 图片不进入 `design-assets`，因为这是页面实际公开内容。

## 阶段 2：全站品牌和导航更新

修改 `src/layouts/BaseLayout.astro`：

- 站点名改为“郭小儒的博客”。
- 默认 description 改成个人博客口径。
- 导航更接近参考站：About、Projects、Blog、Life、Contact。
- 保持中文页面 title 和可访问性标签。

验收：

- 浏览器标题和页面 header 都显示新站名。
- 页面不再以“糖果小镇”命名。

## 阶段 3：首页重排

修改 `src/pages/index.astro`：

- 顶部改成参考站式个人介绍：`h1` 为“郭小儒”，插入用户照片，写 2 到 3 段自然占位介绍。
- 加一句加粗引导语，引导用户探索博客、项目和生活记录。
- 互动地图区标题改成 `Explore` / `探索我的内容`。
- 热点标签改为 About、Projects、Blog、Life、Contact。
- 地图 alt 文案改成手绘互动地图导航，不再写糖果小镇。

验收：

- 首页第一屏能看到姓名、照片、介绍文字。
- 地图入口继续能点击到正确路由。
- 移动端没有横向溢出。

## 阶段 4：About / Projects / Blog 页面改造

About：

- 增加照片 + 简介两栏。
- 下方保留“现在关注 / 正在建设 / 关键词”等结构。

Projects：

- 改成类似参考站的 gallery 卡片。
- 每张卡片有缩略图/图标、标题、简介和标签。
- 使用现有项目内容，并补充几个占位项目卡片。

Blog：

- 改成 listing 样式。
- 每篇文章显示标题、标签、摘要、日期和缩略图占位。
- 保持 Markdown 自动流入。

验收：

- Projects 不再是普通内容卡片列表。
- Blog 列表更接近参考站的 Quarto listing 观感。
- About 有明确个人照。

## 阶段 5：全局视觉语言调整

修改 `src/styles/global.css`：

- 从粉色糖果主题转为奶油白、墨绿、暖棕、金色点缀。
- 标题字体更克制，接近个人博客/轻学术气质。
- 卡片减少玻璃拟态和胶囊感，改为白底、细线、轻阴影。
- 保留手绘感，但不做廉价装饰。

验收：

- 视觉上比当前版本更接近参考站。
- 文章正文和列表可读性优先。
- 桌面和移动端文本不溢出。

## 阶段 6：验证、提交、部署

执行：

```bash
npm run build
```

本地浏览器检查：

- 首页。
- About。
- Projects。
- Blog。
- Contact。

然后提交、推送并运行：

```bash
npm run deploy
```

验收：

- 构建 0 errors。
- 本地主要页面没有明显布局问题。
- `main` 推送成功。
- `gh-pages` 发布成功。
- 公开 URL 可访问新版内容。
