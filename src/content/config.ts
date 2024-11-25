import { defineCollection, z } from 'astro:content';

const collection = defineCollection({
  type: 'content',
  // Type-check frontmatter using a schema
  schema: z.object({
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
  }),
});

export const collections = { collection };
