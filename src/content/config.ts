import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

const schema = z.object({
  title: z.string(),
  description: z.string(),
  // Transform string to Date object
  pubDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  heroImage: z.string().optional(),
  fullWidth: z.boolean().optional(),
  source: z.string().optional(),
  isBackground: z.boolean().optional(),
  darkMode: z.boolean().optional(),
  headerClasses: z.string().optional(),
  contentClasses: z.string().optional(),
  footerClasses: z.string().optional(),
});

const collection = defineCollection({
  loader: glob({
    pattern: '**/[^_]*.mdx',
    base: 'src/content/collection',
  }),
  // Type-check frontmatter using a schema
  schema,
});

const games = defineCollection({
  loader: glob({
    pattern: '**/[^_]*.mdx',
    base: 'src/content/games',
  }),
  // Type-check frontmatter using a schema
  schema,
});

export const collections = { collection, games };
