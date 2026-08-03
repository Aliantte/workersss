import { NextRequest, NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { CATEGORY_LABEL, type IdeaCategory, type Report } from "@/lib/types";
import { NICHE_LABEL, type SocialNiche } from "@/lib/socialCategories";

export const dynamic = "force-dynamic";

const ROLE_MAP: Record<string, { employee: Report["employee"]; label: string; title: string }> = {
  research: { employee: "Aliantte", label: "Research Lab", title: "Aliantte" },
  studio: { employee: "Pin Laden", label: "Studio", title: "Pin Laden" },
  editor: { employee: "Ally Al", label: "Editor", title: "Ally Al" },
  packager: { employee: "Packager", label: "Packaging Bay", title: "Boxley" },
  scout: { employee: "Scout", label: "Social Research", title: "Aj" },
  designer: { employee: "Designer", label: "Social Studio", title: "Al Jr." },
  copywriter: { employee: "Copywriter", label: "Social Copy", title: "Katastrophik" },
};

type UnifiedItem = {
  id: number;
  category_label: string;
  concept: string;
  extra: string | null;
  status: string | null;
  url: string | null;
  created_at: string;
};

export async function GET(req: NextRequest, { params }: { params: { role: string } }) {
  const role = params.role;
  const info = ROLE_MAP[role];
  if (!info) {
    return NextResponse.json({ error: "Unknown role" }, { status: 404 });
  }

  try {
    await ensureSchema();

    const { rows: reports } = await sql<Report>`
      SELECT * FROM reports WHERE employee = ${info.employee} ORDER BY created_at DESC LIMIT 25`;

    let items: UnifiedItem[] = [];

    if (role === "research") {
      const { rows } = await sql<{ id: number; category: IdeaCategory; concept: string; status: string; created_at: string }>`
        SELECT id, category, concept, status, created_at FROM ideas ORDER BY created_at DESC LIMIT 20`;
      items = rows.map((r) => ({
        id: r.id,
        category_label: CATEGORY_LABEL[r.category] ?? r.category,
        concept: r.concept,
        extra: null,
        status: r.status,
        url: null,
        created_at: r.created_at,
      }));
    } else if (role === "studio") {
      const { rows } = await sql<{ id: number; url: string; created_at: string; concept: string; category: IdeaCategory }>`
        SELECT a.id, a.url, a.created_at, i.concept, i.category FROM assets a
        JOIN ideas i ON i.id = a.idea_id WHERE a.type = 'design' ORDER BY a.created_at DESC LIMIT 20`;
      items = rows.map((r) => ({
        id: r.id,
        category_label: CATEGORY_LABEL[r.category] ?? r.category,
        concept: r.concept,
        extra: null,
        status: null,
        url: r.url,
        created_at: r.created_at,
      }));
    } else if (role === "editor") {
      const { rows } = await sql<{ idea_id: number; title: string; created_at: string; concept: string; category: IdeaCategory }>`
        SELECT lc.idea_id, lc.title, lc.created_at, i.concept, i.category FROM listing_copy lc
        JOIN ideas i ON i.id = lc.idea_id ORDER BY lc.created_at DESC LIMIT 20`;
      items = rows.map((r) => ({
        id: r.idea_id,
        category_label: CATEGORY_LABEL[r.category] ?? r.category,
        concept: r.concept,
        extra: r.title,
        status: null,
        url: null,
        created_at: r.created_at,
      }));
    } else if (role === "packager") {
      const { rows } = await sql<{ id: number; concept: string; category: IdeaCategory; status: string; created_at: string }>`
        SELECT id, concept, category, status, created_at FROM ideas
        WHERE status IN ('pending-review', 'approved', 'archived') ORDER BY created_at DESC LIMIT 20`;
      items = rows.map((r) => ({
        id: r.id,
        category_label: CATEGORY_LABEL[r.category] ?? r.category,
        concept: r.concept,
        extra: null,
        status: r.status,
        url: null,
        created_at: r.created_at,
      }));
    } else if (role === "scout") {
      const { rows } = await sql<{ id: number; niche: string; hook: string; status: string; created_at: string }>`
        SELECT id, niche, hook, status, created_at FROM posts ORDER BY created_at DESC LIMIT 20`;
      items = rows.map((r) => ({
        id: r.id,
        category_label: NICHE_LABEL[r.niche as SocialNiche] ?? r.niche,
        concept: r.hook,
        extra: null,
        status: r.status,
        url: null,
        created_at: r.created_at,
      }));
    } else if (role === "designer") {
      const { rows } = await sql<{ id: number; url: string; platform: string; created_at: string; hook: string; niche: string }>`
        SELECT pa.id, pa.url, pa.platform, pa.created_at, p.hook, p.niche FROM post_assets pa
        JOIN posts p ON p.id = pa.post_id ORDER BY pa.created_at DESC LIMIT 20`;
      items = rows.map((r) => ({
        id: r.id,
        category_label: NICHE_LABEL[r.niche as SocialNiche] ?? r.niche,
        concept: r.hook,
        extra: r.platform,
        status: null,
        url: r.url,
        created_at: r.created_at,
      }));
    } else if (role === "copywriter") {
      const { rows } = await sql<{ post_id: number; caption: string; created_at: string; hook: string; niche: string }>`
        SELECT pc.post_id, pc.caption, pc.created_at, p.hook, p.niche FROM post_copy pc
        JOIN posts p ON p.id = pc.post_id ORDER BY pc.created_at DESC LIMIT 20`;
      items = rows.map((r) => ({
        id: r.post_id,
        category_label: NICHE_LABEL[r.niche as SocialNiche] ?? r.niche,
        concept: r.hook,
        extra: r.caption,
        status: null,
        url: null,
        created_at: r.created_at,
      }));
    }

    return NextResponse.json({ label: info.label, title: info.title, reports, items });
  } catch (err) {
    return NextResponse.json(
      { label: info.label, title: info.title, reports: [], items: [], error: String(err) },
      { status: 200 }
    );
  }
}
