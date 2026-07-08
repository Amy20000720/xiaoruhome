export const JOURNAL_PAGE_WIDTH = 420;
export const JOURNAL_PAGE_HEIGHT = 594;
export const JOURNAL_SPREAD_WIDTH = 1120;
export const JOURNAL_SPREAD_HEIGHT = 795;

export type JournalAssetKind = "paper" | "tape" | "sticker" | "note" | "stamp" | "frame" | "field";
export type JournalAssetCategory = "胶带" | "标签" | "贴纸" | "底图" | "字体" | "模板" | "我的导入";

export interface JournalAsset {
  id: string;
  kind: JournalAssetKind;
  category: JournalAssetCategory;
  name: string;
  className: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultText?: string;
  src?: string;
  sourceUrl?: string;
}

const illustBase = "/assets/life-journal/illustcenter";

export const studioAssetCategories: JournalAssetCategory[] = ["胶带", "标签", "贴纸", "底图", "字体", "模板", "我的导入"];

export const journalAssetCatalog: JournalAsset[] = [
  { id: "paper-cream-grid", kind: "paper", category: "底图", name: "奶油格纸", className: "asset-paper-cream-grid", defaultWidth: 420, defaultHeight: 594 },
  { id: "paper-mint-dot", kind: "paper", category: "底图", name: "薄荷点阵", className: "asset-paper-mint-dot", defaultWidth: 420, defaultHeight: 594 },
  { id: "paper-pink-line", kind: "paper", category: "底图", name: "粉色横线", className: "asset-paper-pink-line", defaultWidth: 420, defaultHeight: 594 },
  { id: "paper-lavender", kind: "paper", category: "底图", name: "淡紫便笺", className: "asset-paper-lavender", defaultWidth: 420, defaultHeight: 594 },
  { id: "asset-stationery-set", kind: "tape", category: "胶带", name: "文具胶带素材包", className: "asset-image-stationery", defaultWidth: 218, defaultHeight: 164, src: `${illustBase}/stationery-set.png`, sourceUrl: "https://illustcenter.com/en/2025/01/21/rdesign_8772/" },
  { id: "asset-tape-holder", kind: "tape", category: "胶带", name: "胶带座素材", className: "asset-image-tape-holder", defaultWidth: 190, defaultHeight: 142, src: `${illustBase}/tape-holder.png`, sourceUrl: "https://illustcenter.com/en/2021/12/21/rdesign_8764/" },
  { id: "asset-sticky-notes", kind: "note", category: "贴纸", name: "彩色便利贴", className: "asset-image-sticky-notes", defaultWidth: 230, defaultHeight: 172, src: `${illustBase}/sticky-notes.png`, sourceUrl: "https://illustcenter.com/en/2022/09/06/sdesign_00132/" },
  { id: "asset-brown-tag", kind: "sticker", category: "标签", name: "牛皮纸标签", className: "asset-image-brown-tag", defaultWidth: 190, defaultHeight: 142, src: `${illustBase}/brown-tag.png`, sourceUrl: "https://illustcenter.com/en/2023/04/19/sdesign_00237/" },
  { id: "asset-white-tag", kind: "sticker", category: "标签", name: "白色吊牌", className: "asset-image-white-tag", defaultWidth: 190, defaultHeight: 142, src: `${illustBase}/white-tag.png`, sourceUrl: "https://illustcenter.com/en/2023/04/19/sdesign_00236-2/" },
  { id: "asset-rose-frame", kind: "frame", category: "贴纸", name: "花朵边框", className: "asset-image-rose-frame", defaultWidth: 220, defaultHeight: 165, src: `${illustBase}/rose-frame.png`, sourceUrl: "https://illustcenter.com/en/2022/12/22/sdesign_00229/" },
  { id: "field-book-cover", kind: "field", category: "模板", name: "书封占位", className: "asset-field-book-cover", defaultWidth: 150, defaultHeight: 220, defaultText: "书封" },
  { id: "field-quote-card", kind: "field", category: "模板", name: "摘抄卡", className: "asset-field-quote", defaultWidth: 280, defaultHeight: 128, defaultText: "摘抄" },
  { id: "field-note-card", kind: "field", category: "模板", name: "资料卡", className: "asset-field-note", defaultWidth: 250, defaultHeight: 168, defaultText: "资料" },
  { id: "field-photo-frame", kind: "frame", category: "模板", name: "图片框", className: "asset-frame-photo", defaultWidth: 260, defaultHeight: 160, defaultText: "图片" },
  { id: "tape-pink-grid", kind: "tape", category: "胶带", name: "粉色胶带块", className: "asset-tape-pink-grid", defaultWidth: 132, defaultHeight: 28 },
  { id: "tape-blue-star", kind: "tape", category: "胶带", name: "蓝色胶带块", className: "asset-tape-blue-star", defaultWidth: 138, defaultHeight: 28 },
  { id: "note-pink", kind: "note", category: "贴纸", name: "粉色便签块", className: "asset-note-pink", defaultWidth: 150, defaultHeight: 104, defaultText: "写一点想法" },
  { id: "note-mint", kind: "note", category: "贴纸", name: "薄荷便签块", className: "asset-note-mint", defaultWidth: 150, defaultHeight: 104, defaultText: "今日小事" },
  { id: "stamp-date", kind: "stamp", category: "标签", name: "日期章", className: "asset-stamp-date", defaultWidth: 112, defaultHeight: 42, defaultText: "DATE" },
  { id: "stamp-mood", kind: "stamp", category: "标签", name: "心情章", className: "asset-stamp-mood", defaultWidth: 112, defaultHeight: 42, defaultText: "MOOD" },
];

export function getJournalAsset(id?: string) {
  return journalAssetCatalog.find((asset) => asset.id === id);
}
