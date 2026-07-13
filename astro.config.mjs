import { defineConfig } from "astro/config";
import { localJournalPublish } from "./scripts/local-journal-publish";

export default defineConfig({
  site: "https://amy20000720.github.io",
  base: "/xiaoruhome",
  vite: {
    plugins: [localJournalPublish({ base: "/xiaoruhome" })],
  },
});
