import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { defaultSheet } from "@/lib/default-sheet";
import crypto from "crypto";

async function getMaster() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const user = await getMaster();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin.from("sheets").select("*").eq("owner_id", user.id).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sheets: data });
}

export async function POST(req: Request) {
  const user = await getMaster();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || "Nova ficha").trim().slice(0, 120);
  const token = crypto.randomBytes(12).toString("base64url");

  const admin = createAdminClient();
  const { data, error } = await admin.from("sheets").insert({
    owner_id: user.id,
    title,
    token,
    data: defaultSheet
  }).select("*").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sheet: data }, { status: 201 });
}
