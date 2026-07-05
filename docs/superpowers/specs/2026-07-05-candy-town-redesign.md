# 梦幻糖果小镇互动地图改版方案

## 背景

当前网站第一版使用 CSS 绘制的收藏柜首页，能验证页面结构和 Markdown 内容流，但视觉质量不符合目标。新的方向回到 Cecilia Baldoni 个人站的核心结构：用一张完整、高质量、手绘风地图插画作为首页主视觉，再在插画上叠加可点击热点和真实网页文字。

本次改版主题为“梦幻糖果小镇”。它不是低保真 CSS 插画，也不是简单粉色贴纸风，而是一张完整的高质量 AI 生成插画地图。目标是梦幻、精致、甜美、有个人气质，同时避免廉价、粗糙、幼稚和过度堆砌粉色。

## 设计目标

- 首页改为一张完整的梦幻糖果小镇插画地图。
- 结构参考 `cecibaldoni.github.io`：插画底图 + 绝对定位热点 + hover 标签 + 内容页。
- 保留现有五个一级入口：关于我、技术文章、项目入口、个人生活、联系我。
- 插画质量必须作为核心交付物，不能用粗糙 CSS 图形代替。
- 所有中文导航文字由 HTML/CSS 渲染，不进入模型生成图片。
- 继续使用 Astro 和现有 Markdown 内容集合，不重写内容系统。
- 首页视觉要一眼有记忆点，内容页也要继承同一套梦幻糖果视觉语言。

## 非目标

- 不复制 Cecilia Baldoni 网站的具体插画、图标、城市布局或视觉资产。
- 不复制 Barbie、Disney 或其他商业 IP 的角色、logo、服装、标志性元素。
- 不在第一版做 3D、游戏、复杂视差或长滚动交互。
- 不用 CSS 临摹最终插画。CSS 只用于布局、热点、标签、响应式和页面样式。
- 不让 AI 图片模型生成中文文字。

## 首页概念

首页是一张横向的梦幻糖果小镇地图。访问者看到的是一个像绘本地图一样完整的小镇，五个主要地点分别对应网站栏目：

- 糖果小屋：关于我。
- 奶油图书馆：技术文章。
- 魔法工坊：项目入口。
- 甜品咖啡馆：个人生活。
- 星星邮局：联系我。

小镇中可以包含糖霜屋顶、马卡龙街道、云朵、星星、糖果路灯、奶油喷泉、粉色树、透明糖果玻璃窗等元素。整体应保持高质量插画感和空间完整性，而不是独立图标拼贴。

## 视觉标准

方向关键词：

- 梦幻糖果小镇。
- 高质量手绘插画地图。
- 精致、甜美、明亮、轻盈。
- 粉色为主，但需要搭配奶油白、薄荷蓝、香草黄、淡紫、少量香槟金。
- 线条细腻，建筑形状有手绘不规则感。
- 有空间层次、街道连接和整体构图。
- 像一本高级绘本或精致个人插画站，而不是儿童贴纸、廉价 Y2K 或低保真网页图形。

需要避免：

- 大面积荧光粉。
- 过度饱和、塑料感、土味渐变。
- 粗糙 CSS 形状堆叠。
- 随机贴纸拼贴。
- AI 图片里出现乱码文字。
- 入口建筑太小，导致热点定位困难。

## 插画资产生产流程

插画生产分为四步，不能一步到位：

### 1. 艺术方向探索

先生成 3 到 5 张概念图，只验证整体风格和构图。要求：

- 横向网页首页构图。
- 五个清晰地点。
- 没有任何文字、logo、水印。
- 保留足够空白或视觉分区，方便叠加中文标签。
- 小镇要像完整地图，不是单张风景画。

### 2. 选定方向并精修

选定一张后继续迭代：

- 固定五个入口建筑的位置。
- 增强建筑识别度。
- 调整道路和视觉动线。
- 控制颜色高级感。
- 给网页首屏预留安全裁切区域。

### 3. 生成最终主图

最终主图建议输出：

- 原始高分辨率 PNG。
- 网页用压缩 WebP。
- 保留源文件到 `public/assets/candy-town/source/`。
- 网页文件放到 `public/assets/candy-town/candy-town-map.webp`。

### 4. 生成热点辅助资产

如果模型或编辑流程可控，再生成五个入口建筑的局部高亮图，或从主图裁切：

- `about-highlight.webp`
- `posts-highlight.webp`
- `projects-highlight.webp`
- `life-highlight.webp`
- `contact-highlight.webp`

如果局部图难以一致，第一版可只使用 CSS hover 标签和轻微滤镜，不强行叠加局部高亮图。

## 推荐模型流程

优先使用高质量图像模型做插画，不使用 CSS 作为最终插画替代。

推荐工作流：

1. 用 Midjourney 或同级高质量图像模型做第一轮艺术探索，因为它适合快速寻找插画风格、构图和整体氛围。
2. 用 OpenAI 图像模型做编辑和可控修正，例如去掉文字、调整局部建筑、生成 hover 辅助资产或统一风格。
3. 必要时用图像后处理工具压缩、裁切、转 WebP。

如果只使用 OpenAI 图像模型，也可以完成，但提示词需要更严格，且每轮都要人工筛选。

## 主提示词草案

英文提示词：

```text
A high-quality hand-drawn illustrated map for a personal website homepage, a dreamy candy town with five distinct landmark buildings: a candy cottage, a cream library, a magical workshop, a dessert cafe, and a star-shaped post office. Soft pastel pink as the main color, with cream white, mint blue, vanilla yellow, lavender, and subtle champagne gold accents. Elegant storybook illustration, refined linework, whimsical but sophisticated, cohesive town layout with candy roads, frosting rooftops, soft clouds, tiny stars, and pearl-like highlights. Wide horizontal web hero composition, clear clickable landmark areas, no text, no letters, no logo, no watermark, no characters, no brand references, not childish, not cheap, not sticker collage.
```

中文解释：

- 这是一张个人网站首页用的高质量手绘地图。
- 地图主题是梦幻糖果小镇。
- 必须有五个清晰建筑入口。
- 不能出现文字、字母、logo、水印。
- 风格要精致梦幻，不要廉价贴纸或粗糙儿童画。

## 前端实现

保留 Astro 项目和当前路由：

- `/about`
- `/posts`
- `/projects`
- `/life`
- `/contact`

首页改造：

- `src/pages/index.astro` 移除 CSS 收藏柜结构，改为 candy town map 组件。
- 使用一张 `<img>` 或 `<picture>` 渲染糖果小镇地图。
- 在地图容器上叠加五个绝对定位 `<a>` 热点。
- 每个热点有真实中文 label 和短说明。
- hover 时热点区域轻微放大、发光，显示 label。
- 移动端标签固定显示，热点足够大。

样式改造：

- `src/styles/global.css` 重做色彩变量。
- 从木色/手帐色改成糖果小镇色系。
- 内容页使用奶油白卡片、浅粉背景、细线边框、柔和阴影。
- 技术文章页保持可读，避免背景和装饰影响正文阅读。

## 响应式设计

桌面端：

- 首页地图横向完整展示。
- 地图可占据第一屏主要空间。
- 热点标签 hover 出现。

移动端：

- 地图可以保持完整缩放。
- 入口标签固定显示，避免 hover 不可用。
- 如果地图缩小后热点太密，则在地图下方提供五个备用文字入口。
- 页面不能横向溢出。

## 验收标准

视觉验收：

- 首页视觉明显接近“完整高质量手绘地图”，而不是 CSS 形状或图标拼贴。
- 糖果小镇五个入口建筑清晰可识别。
- 整体风格梦幻、甜美、精致，不廉价、不粗糙。
- 插画中没有中文、英文字母、乱码、logo 或水印。

功能验收：

- 五个热点都能点击到正确页面。
- 桌面端 hover 有明确反馈。
- 移动端入口可读、可点。
- 现有 Markdown 文章、项目和生活记录继续可用。
- `npm run build` 通过。
- 部署到 `gh-pages` 后，公开地址可访问。

## 实施顺序

1. 先生成并筛选糖果小镇概念图。
2. 确认最终主图后，再修改前端首页。
3. 接入图片和热点定位。
4. 重做全局视觉变量和内容页卡片风格。
5. 桌面和移动端截图验证。
6. 构建、提交、推送、部署。

## 风险和处理

- 风险：AI 生成图出现文字或乱码。
  - 处理：提示词明确 no text；筛选时直接淘汰；必要时编辑去除。
- 风险：建筑位置不适合热点定位。
  - 处理：精修阶段固定五个建筑区域，前端使用百分比定位。
- 风险：画面太幼稚。
  - 处理：降低饱和度，加入奶油白、薄荷蓝、香槟金和更细线稿。
- 风险：图片太大影响首屏加载。
  - 处理：WebP 压缩，保留源文件但不在首屏使用源图。
