import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const sharedSchema = z.object({
  title: z.string(),
  date: z.coerce.date(),
  summary: z.string(),
  tags: z.array(z.string()).default([]),
  cover: z.string().optional(),
  draft: z.boolean().default(false),
});

const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
  schema: sharedSchema,
});

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: sharedSchema.extend({
    status: z.string().default("进行中"),
    repo: z.url().optional(),
    demo: z.url().optional(),
  }),
});

const life = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/life" }),
  schema: sharedSchema.extend({
    mood: z.string().optional(),
    location: z.string().optional(),
    journalLayout: z.string().optional(),
  }),
});

export const collections = { posts, projects, life };
