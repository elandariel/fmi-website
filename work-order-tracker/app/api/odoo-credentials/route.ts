import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import https from "https";

const sb = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

function checkPin(pin: string) {
  const valid = process.env.SUPER_DEV_PIN;
  if (!valid) return false;
  return pin?.trim() === valid.trim();
}

// ─── Minimal XML-RPC untuk test koneksi ──────────────────────
function enc(v: any): string {
  if (typeof v === "number" && Number.isInteger(v)) return `<value><int>${v}</int></value>`;
  if (typeof v === "string") {
    const s = v.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    return `<value><string>${s}</string></value>`;
  }
  if (typeof v === "object" && !Array.isArray(v)) {
    const m = Object.entries(v).map(([k,val]) =>
      `<member><name>${k}</name>${enc(val)}</member>`).join("");
    return `<value><struct>${m}</struct></value>`;
  }
  return `<value><string>${String(v)}</string></value>`;
}

function httpsPost(urlStr: string, body: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const req = https.request({
      hostname: url.hostname, port: url.port ? parseInt(url.port) : 443,
      path: url.pathname + url.search, method: "POST",
      headers: { "Content-Type": "text/xml; charset=utf-8", "Content-Length": Buffer.byteLength(body, "utf-8") },
      rejectUnauthorized: false,
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.write(body, "utf-8");
    req.end();
  });
}

async function testOdooAuth(username: string, apiKey: string): Promise<number | null> {
  const base = (process.env.ODOO_URL || "").replace(/\/$/, "");
  const xml  = `<?xml version="1.0"?><methodCall><methodName>authenticate</methodName><params>${[
    process.env.ODOO_DB!, username, apiKey, {}
  ].map(p => `<param>${enc(p)}</param>`).join("")}</params></methodCall>`;
  const res  = await httpsPost(`${base}/xmlrpc/2/common`, xml);
  if (res.includes("<fault>")) return null;
  const m = res.match(/<int>(\d+)<\/int>/);
  return m ? parseInt(m[1]) : null;
}

// ─────────────────────────────────────────────────────────────
// POST /api/odoo-credentials
// body: { pin, action: "list" }
//       { pin, action: "upsert", team_name, display_name, odoo_username, odoo_api_key }
//       { pin, action: "delete", team_name }
//       { pin, action: "test",   odoo_username, odoo_api_key }
//       { pin, action: "toggle", team_name, is_active }
// ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pin, action } = body;

    if (!checkPin(pin)) return err("PIN SUPER_DEV salah", 403);

    const supabase = sb();

    // ── LIST ────────────────────────────────────────────────
    if (action === "list") {
      const { data, error } = await supabase
        .from("odoo_credentials")
        .select("id, team_name, display_name, odoo_username, is_active, updated_at")
        .order("team_name");
      if (error) throw error;
      return ok({ credentials: data ?? [] });
    }

    // ── TEST credential tanpa simpan ─────────────────────────
    if (action === "test") {
      const { odoo_username, odoo_api_key } = body;
      if (!odoo_username || !odoo_api_key) return err("username dan api_key wajib diisi", 400);
      const uid = await testOdooAuth(odoo_username, odoo_api_key);
      if (!uid) return err("Autentikasi Odoo gagal — periksa username/API key", 401);
      return ok({ uid, message: `✅ Berhasil! UID Odoo: ${uid}` });
    }

    // ── UPSERT (add / update) ────────────────────────────────
    if (action === "upsert") {
      const { team_name, display_name, odoo_username, odoo_api_key } = body;
      if (!team_name || !display_name || !odoo_username || !odoo_api_key)
        return err("Semua field wajib diisi", 400);

      // Test dulu sebelum simpan
      const uid = await testOdooAuth(odoo_username, odoo_api_key);
      if (!uid) return err("Autentikasi Odoo gagal — API key tidak valid", 401);

      const { error } = await supabase.from("odoo_credentials").upsert(
        { team_name: team_name.trim(), display_name: display_name.trim(),
          odoo_username: odoo_username.trim(), odoo_api_key: odoo_api_key.trim(),
          is_active: true },
        { onConflict: "team_name" }
      );
      if (error) throw error;
      return ok({ message: `✅ Credentials untuk "${team_name}" berhasil disimpan (UID: ${uid})` });
    }

    // ── TOGGLE aktif/nonaktif ────────────────────────────────
    if (action === "toggle") {
      const { team_name, is_active } = body;
      const { error } = await supabase
        .from("odoo_credentials")
        .update({ is_active })
        .eq("team_name", team_name);
      if (error) throw error;
      return ok({ message: `Credentials "${team_name}" ${is_active ? "diaktifkan" : "dinonaktifkan"}` });
    }

    // ── DELETE ───────────────────────────────────────────────
    if (action === "delete") {
      const { team_name } = body;
      if (!team_name) return err("team_name wajib diisi", 400);
      const { error } = await supabase
        .from("odoo_credentials")
        .delete()
        .eq("team_name", team_name);
      if (error) throw error;
      return ok({ message: `Credentials "${team_name}" dihapus` });
    }

    return err("action tidak dikenal", 400);
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

function ok(data: object) { return NextResponse.json({ success: true, ...data }); }
function err(msg: string, status = 400) { return NextResponse.json({ success: false, error: msg }, { status }); }
