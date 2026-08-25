import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: sheet } = await supabase.from("sheets").select("id").eq("token", token).maybeSingle();
  if (!sheet) return NextResponse.json({ error: "Ficha não encontrada." }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Arquivo não enviado." }, { status: 400 });

  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Envie uma imagem." }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "A imagem deve ter no máximo 5 MB." }, { status: 400 });

  const ext = (file.name.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
  const path = `${token}/personagem-${Date.now()}.${ext}`;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage.from("character-images").upload(path, bytes, {
    contentType: file.type,
    upsert: false,
    cacheControl: "3600"
  });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: publicUrl } = supabase.storage.from("character-images").getPublicUrl(path);

  const { data: current } = await supabase.from("sheets").select("data").eq("id", sheet.id).single();
  const nextData = { ...(current?.data || {}), personagemImagem: publicUrl.publicUrl };

  await supabase.from("sheets").update({ data: nextData }).eq("id", sheet.id);

  return NextResponse.json({ url: publicUrl.publicUrl });
}
