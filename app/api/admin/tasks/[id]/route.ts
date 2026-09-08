import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const body = await req.json();
  const { name, description, link, reward_type, collab_token_id, reward_amount, active } = body;

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("tasks")
    .update({
      name,
      description: description || null,
      link,
      reward_type,
      collab_token_id: reward_type === "COLLAB" ? collab_token_id : null,
      reward_amount,
      active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, task: data });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const db = supabaseAdmin();
  const { error } = await db.from("tasks").delete().eq("id", params.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
