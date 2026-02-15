import type { MetadataRoute } from "next";
import { getEditions, getReadingPaths, getCharacters, getCreators, getEvents } from "@/lib/data";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://marvelcartographer.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [editions, paths, characters, creators, events] = await Promise.all([
    getEditions(),
    getReadingPaths(),
    getCharacters(),
    getCreators(),
    getEvents(),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/timeline`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/search`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/events`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/conflicts`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/characters`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/creators`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/collection`, changeFrequency: "weekly", priority: 0.5 },
  ];

  const editionPages: MetadataRoute.Sitemap = editions.map((e) => ({
    url: `${BASE_URL}/edition/${e.slug}`,
    changeFrequency: "monthly" as const,
    priority: e.importance === "essential" ? 0.8 : 0.6,
  }));

  const pathPages: MetadataRoute.Sitemap = paths.map((p) => ({
    url: `${BASE_URL}/path/${p.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const characterPages: MetadataRoute.Sitemap = characters.map((c) => ({
    url: `${BASE_URL}/character/${c.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const creatorPages: MetadataRoute.Sitemap = creators.map((c) => ({
    url: `${BASE_URL}/creator/${c.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  const eventPages: MetadataRoute.Sitemap = events.map((e) => ({
    url: `${BASE_URL}/event/${e.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [
    ...staticPages,
    ...editionPages,
    ...pathPages,
    ...characterPages,
    ...creatorPages,
    ...eventPages,
  ];
}
