import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    category: z.string(),
    legacyPath: z.string().startsWith('/2023/'),
    originalUrl: z.string().url(),
    notionArchive: z.string().url(),
    historical: z.boolean(),
  }),
});

export const collections = { blog };
