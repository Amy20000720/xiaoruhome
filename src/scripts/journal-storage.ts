import type { JournalLayout } from "../lib/journalLayout";

const DB_NAME = "xiaoru-life-journal";
const DB_VERSION = 3;
const STORE_NAME = "drafts";
const LAST_DRAFT_KEY = "xiaoru-life-journal:last-draft";

export interface JournalDraftMeta {
  title: string;
  date: string;
  summary: string;
  tags: string;
  mood: string;
  location: string;
  slug: string;
  body: string;
  bookTitle?: string;
  author?: string;
}

export interface JournalDraft {
  id: string;
  updatedAt: string;
  meta: JournalDraftMeta;
  canvasJson: unknown;
  layout: JournalLayout;
}

function openJournalDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDraft(draft: JournalDraft) {
  const db = await openJournalDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(draft);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  localStorage.setItem(LAST_DRAFT_KEY, draft.id);
  db.close();
}

export async function loadDraft(id: string): Promise<JournalDraft | null> {
  const db = await openJournalDb();
  const draft = await new Promise<JournalDraft | null>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve((request.result as JournalDraft | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return draft;
}

export function getLastDraftId() {
  return localStorage.getItem(LAST_DRAFT_KEY);
}
