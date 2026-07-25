import { env } from "@/config/env";

/**
 * Mirrors the website's public `BlogPost` API shape
 * (GET {siteUrl}/api/mobile/blog-posts). The website merges its bundled seed
 * content with anything published via the CMS, so this always reflects
 * everything live on diamondstester.com — no per-post sync needed here.
 */
export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  content_format: "html" | "markdown";
  cover_image?: string | null;
  author: string;
  author_role?: string;
  category: string;
  tags: string[];
  status: "draft" | "published";
  featured: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
  layout: "with-sidebar" | "full-page";
  difficulty: "Beginner" | "Intermediate" | "Expert";
  topic_focus: "Natural" | "Lab-grown" | "Buying" | "Care" | "4Cs";
  custom_css?: string | null;
  custom_schema?: string | null;
  read_minutes: number;
  views?: number;
  published_at: string;
}

const BASE_URL = `${env.app.siteUrl}/api/mobile/blog-posts`;

/** Unlike the old direct-Supabase version, the public API needs no config — always on. */
export const blogAvailable = (): boolean => true;

/**
 * All published posts, newest first. Hits the website's public read-only API
 * — no auth required.
 */
export async function fetchBlogPosts(): Promise<BlogPost[]> {
  try {
    const response = await fetch(BASE_URL);
    if (!response.ok) return [];
    const json = (await response.json()) as { items?: BlogPost[] };
    const items = (json.items ?? []).filter((post) => post.status === "published");
    return items.sort((a, b) => (a.published_at < b.published_at ? 1 : -1));
  } catch {
    // Offline or the website is unreachable — the Guides tab shows its empty state.
    return [];
  }
}

export async function fetchBlogPost(slug: string): Promise<BlogPost | null> {
  if (!slug) return null;
  try {
    const response = await fetch(`${BASE_URL}?slug=${encodeURIComponent(slug)}`);
    if (!response.ok) return null;
    const json = (await response.json()) as { item?: BlogPost | null };
    return json.item ?? null;
  } catch {
    return null;
  }
}
