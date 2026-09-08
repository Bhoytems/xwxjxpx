import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(_req: NextRequest, { params }: { params: { code: string } }) {
  const db = supabaseAdmin();
  const { data: link } = await db
    .from("task_links")
    .select("id, code, tasks(name, link)")
    .eq("code", params.code)
    .maybeSingle();

  if (!link) return NextResponse.json({ ok: false, error: "Link not found." }, { status: 404 });

  const { data: ads } = await db.from("settings").select("value").eq("key", "ads").maybeSingle();

  return NextResponse.json({
    ok: true,
    taskName: (link as any).tasks?.name ?? "Task",
    ads: ads?.value ?? { mode: "none" },
  });
}
