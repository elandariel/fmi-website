import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import https from "https";

// ─── Service role client (bypasses RLS — admin view) ──────────
const sbAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

// ─── Session-aware client (uses logged-in user cookie) ────────
async function sbSession() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );
}

// ─── Minimal XML-RPC Odoo auth test ───────────────────────────
function testOdooAuth(email: string, apiKey: string): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      const base = (process.env.ODOO_URL || "").replace(/\/$/, "");
      const esc  = (s: string) => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
      const body =
        `<?xml version="1.0" encoding="UTF-8"?>` +
        `<methodCall><methodName>authenticate</methodName><params>` +
        `<param><value><string>${esc(process.env.ODOO_DB!)}</string></value></param>` +
        `<param><value><string>${esc(email)}</string></value></param>` +
        `<param><value><string>${esc(apiKey)}</string></value></param>` +
        `<param><value><struct></struct></value></param>` +
        `</params></methodCall>`;
      const url = new URL(`${base}/xmlrpc/2/common`);
      const req = https.request(
        {
          hostname: url.hostname,
          port:     url.port ? parseInt(url.port) : 443,
          path:     url.pathname,
          method:   "POST",
          headers:  { "Content-Type": "text/xml; charset=utf-8", "Content-Length": Buffer.byteLength(body, "utf-8") },
          rejectUnauthorized: false,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
          res.on("end", () => {
            const text = Buffer.concat(chunks).toString("utf-8");
            if (text.includes("<fault>")) return resolve(null);
            const m = text.match(/<int>(\d+)<\/int>/);
            resolve(m ? parseInt(m[1]) : null);
          });
          res.on("error", () => resolve(null));
        }
      );
      req.on("error", () => resolve(null));
      req.write(body, "utf-8");
      req.end();
    } catch {
      resolve(null);
    }
  });
}

// ─────────────────────────────────────────────────────────────
// GET /api/my-odoo-key
//   → status API key milik user yang login
// GET /api/my-odoo-key?all=1
//   → status semua user (hanya SUPER_DEV / ADMIN)
// ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const supabase = await sbSession();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ── Admin: list semua user + status ────────────────────────
  if (req.nextUrl.searchParams.get("all") === "1") {
    const { data: myProfile } = await sbAdmin()
      .from("profiles").select("role").eq("id", user.id).single();
    if (!["SUPER_DEV", "ADMIN"].includes(myProfile?.role ?? ""))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const [{ data: profiles }, { data: keys }] = await Promise.all([
      sbAdmin().from("profiles").select("id, full_name, email, role").order("full_name"),
      sbAdmin().from("user_odoo_keys").select("user_id, odoo_uid, verified_at, is_active, updated_at"),
    ]);

    const keyMap = new Map((keys ?? []).map((k) => [k.user_id, k]));
    const users = (profiles ?? []).map((p) => ({
      ...p,
      odoo: keyMap.get(p.id) ?? null,
    }));
    return NextResponse.json({ success: true, users });
  }

  // ── Own status ─────────────────────────────────────────────
  const { data: key } = await sbAdmin()
    .from("user_odoo_keys")
    .select("odoo_uid, verified_at, is_active, updated_at")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({
    success:     true,
    email:       user.email,
    hasKey:      !!key,
    odoo_uid:    key?.odoo_uid    ?? null,
    verified_at: key?.verified_at ?? null,
    is_active:   key?.is_active   ?? false,
    updated_at:  key?.updated_at  ?? null,
  });
}

// ─────────────────────────────────────────────────────────────
// POST /api/my-odoo-key
//   body: { api_key }
//   → test koneksi ke Odoo, simpan jika berhasil
// ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await sbSession();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { api_key } = (await req.json()) as { api_key?: string };
  if (!api_key?.trim())
    return NextResponse.json({ error: "API key tidak boleh kosong" }, { status: 400 });

  // Test auth ke Odoo pakai email login user
  const uid = await testOdooAuth(user.email!, api_key.trim());
  if (!uid)
    return NextResponse.json(
      { error: "Autentikasi Odoo gagal — pastikan API Key benar dan email Odoo sesuai email login" },
      { status: 401 }
    );

  const { error } = await sbAdmin().from("user_odoo_keys").upsert(
    {
      user_id:      user.id,
      odoo_api_key: api_key.trim(),
      odoo_uid:     uid,
      verified_at:  new Date().toISOString(),
      is_active:    true,
      updated_at:   new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    uid,
    message: `✅ Berhasil terhubung ke Odoo (UID: ${uid})`,
  });
}

// ─────────────────────────────────────────────────────────────
// DELETE /api/my-odoo-key
//   → hapus API key milik user sendiri
// DELETE /api/my-odoo-key?userId=<uuid>
//   → hapus API key user lain (hanya SUPER_DEV / ADMIN)
// ─────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const supabase = await sbSession();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const targetId = req.nextUrl.searchParams.get("userId") ?? user.id;

  if (targetId !== user.id) {
    const { data: myProfile } = await sbAdmin()
      .from("profiles").select("role").eq("id", user.id).single();
    if (!["SUPER_DEV", "ADMIN"].includes(myProfile?.role ?? ""))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await sbAdmin().from("user_odoo_keys").delete().eq("user_id", targetId);
  return NextResponse.json({ success: true, message: "API key berhasil dihapus" });
}
