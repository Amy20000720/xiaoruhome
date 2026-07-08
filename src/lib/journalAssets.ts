export const JOURNAL_PAGE_WIDTH = 420;
export const JOURNAL_PAGE_HEIGHT = 594;

export type JournalAssetKind = "paper" | "tape" | "sticker" | "note" | "stamp" | "frame";

export interface JournalAsset {
  id: string;
  kind: JournalAssetKind;
  name: string;
  className: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultText?: string;
}

export const journalAssetCatalog: JournalAsset[] = [
  { id: "paper-cream-grid", kind: "paper", name: "奶油格纸", className: "asset-paper-cream-grid", defaultWidth: 420, defaultHeight: 594 },
  { id: "paper-mint-dot", kind: "paper", name: "薄荷点阵", className: "asset-paper-mint-dot", defaultWidth: 420, defaultHeight: 594 },
  { id: "paper-pink-line", kind: "paper", name: "粉色横线", className: "asset-paper-pink-line", defaultWidth: 420, defaultHeight: 594 },
  { id: "paper-lavender", kind: "paper", name: "淡紫便笺", className: "asset-paper-lavender", defaultWidth: 420, defaultHeight: 594 },
  { id: "tape-pink-grid", kind: "tape", name: "粉色格纹胶带", className: "asset-tape-pink-grid", defaultWidth: 132, defaultHeight: 28 },
  { id: "tape-blue-star", kind: "tape", name: "蓝色星星胶带", className: "asset-tape-blue-star", defaultWidth: 138, defaultHeight: 28 },
  { id: "tape-yellow-dot", kind: "tape", name: "香草波点胶带", className: "asset-tape-yellow-dot", defaultWidth: 128, defaultHeight: 28 },
  { id: "tape-silver-y2k", kind: "tape", name: "银色 Y2K 胶带", className: "asset-tape-silver-y2k", defaultWidth: 146, defaultHeight: 26 },
  { id: "sticker-sunny", kind: "sticker", name: "晴天贴纸", className: "asset-sticker-sunny", defaultWidth: 74, defaultHeight: 74, defaultText: "晴天" },
  { id: "sticker-coffee", kind: "sticker", name: "咖啡贴纸", className: "asset-sticker-coffee", defaultWidth: 78, defaultHeight: 68, defaultText: "咖啡" },
  { id: "sticker-book", kind: "sticker", name: "阅读贴纸", className: "asset-sticker-book", defaultWidth: 84, defaultHeight: 62, defaultText: "阅读" },
  { id: "sticker-camera", kind: "sticker", name: "照片贴纸", className: "asset-sticker-camera", defaultWidth: 82, defaultHeight: 64, defaultText: "照片" },
  { id: "sticker-flower", kind: "sticker", name: "小花贴纸", className: "asset-sticker-flower", defaultWidth: 70, defaultHeight: 70, defaultText: "花" },
  { id: "sticker-laptop", kind: "sticker", name: "电脑贴纸", className: "asset-sticker-laptop", defaultWidth: 92, defaultHeight: 58, defaultText: "电脑" },
  { id: "note-pink", kind: "note", name: "粉色便签", className: "asset-note-pink", defaultWidth: 150, defaultHeight: 104, defaultText: "写一点今天的心情" },
  { id: "note-mint", kind: "note", name: "薄荷便签", className: "asset-note-mint", defaultWidth: 150, defaultHeight: 104, defaultText: "今日小事" },
  { id: "note-yellow", kind: "note", name: "香草便签", className: "asset-note-yellow", defaultWidth: 150, defaultHeight: 104, defaultText: "值得保存" },
  { id: "note-purple", kind: "note", name: "淡紫便签", className: "asset-note-purple", defaultWidth: 150, defaultHeight: 104, defaultText: "碎碎念" },
  { id: "stamp-date", kind: "stamp", name: "日期章", className: "asset-stamp-date", defaultWidth: 112, defaultHeight: 42, defaultText: "DATE" },
  { id: "stamp-mood", kind: "stamp", name: "心情章", className: "asset-stamp-mood", defaultWidth: 112, defaultHeight: 42, defaultText: "MOOD" },
  { id: "stamp-place", kind: "stamp", name: "地点章", className: "asset-stamp-place", defaultWidth: 112, defaultHeight: 42, defaultText: "PLACE" },
  { id: "stamp-memory", kind: "stamp", name: "记忆章", className: "asset-stamp-memory", defaultWidth: 118, defaultHeight: 42, defaultText: "MEMORY" },
  { id: "frame-polaroid", kind: "frame", name: "拍立得相框", className: "asset-frame-polaroid", defaultWidth: 176, defaultHeight: 220 },
  { id: "frame-film", kind: "frame", name: "胶片相框", className: "asset-frame-film", defaultWidth: 184, defaultHeight: 126 },
];

export function getJournalAsset(id?: string) {
  return journalAssetCatalog.find((asset) => asset.id === id);
}
