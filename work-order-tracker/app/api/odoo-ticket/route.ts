import { NextRequest, NextResponse } from "next/server";
import https from "https";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// ─── Service role ─────────────────────────────────────────────
const sbAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

// ─── Get credentials dari user session yang sedang login ──────
async function getSessionCreds(): Promise<{ username: string; apiKey: string } | null> {
  try {
    const cookieStore = await cookies();
    const supabase    = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id || !user?.email) return null;

    const { data } = await sbAdmin()
      .from("user_odoo_keys")
      .select("odoo_api_key, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (data?.odoo_api_key) {
      return { username: user.email, apiKey: data.odoo_api_key };
    }
  } catch { /* session tidak tersedia */ }
  return null;
}

/**
 * Odoo 16 XML-RPC proxy — server-side only, credentials never exposed to client.
 *
 * Confirmed field names (from live Odoo introspection):
 *   Ticket number  → field "number"          (format HTxxxxxx, set at creation)
 *   Team           → field "team_id"         (model: helpdesk.ticket.team)
 *   Field Team     → field "field_team_id"   (model: helpdesk.ticket.field.team)
 *   Esc. desc      → field "escalate_description" (html)
 *   Is escalated   → field "is_escalated"    (boolean)
 *   Start time     → field "create_date"     (UTC → convert +7 for WIB)
 *
 * ENV vars required in .env.local:
 *   ODOO_URL              = https://portal.fibermedia.co.id
 *   ODOO_DB               = erpnew
 *   ODOO_USERNAME         = email@fibermedia.co.id
 *   ODOO_API_KEY              = (generated API key)
 *   ODOO_NOC_TEAM_ID          = (int, ID of "Fibermedia || NOC" → ?action=teams)
 *   ODOO_ESC_FIELD_TEAM_ID    = (int, ID of "Helpdesk Fibermedia" → ?action=field-teams)
 *
 * GET  /api/odoo-ticket?action=teams        → list ticket teams (helpdesk.ticket.team)
 * GET  /api/odoo-ticket?action=field-teams  → list field teams (helpdesk.ticket.field.team)
 * GET  /api/odoo-ticket?action=fields       → list all ticket fields
 * GET  /api/odoo-ticket?action=search       → list 5 latest ticket IDs
 * GET  /api/odoo-ticket?action=ticket&id=N  → read one ticket (all fields)
 * POST /api/odoo-ticket                     → create + escalate ticket
 *      body: { subject, description }
 *      returns: { success, ticketId, ticketNumber, startTime, odooUrl }
 */

// ─────────────────────────────────────────────────────────────
// Minimal XML-RPC client (no external deps)
// ─────────────────────────────────────────────────────────────

function enc(v: any): string {
  if (v === null || v === undefined || v === false)
    return "<value><boolean>0</boolean></value>";
  if (v === true)  return "<value><boolean>1</boolean></value>";
  if (typeof v === "number" && Number.isInteger(v))
    return `<value><int>${v}</int></value>`;
  if (typeof v === "number")
    return `<value><double>${v}</double></value>`;
  if (typeof v === "string") {
    const s = v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<value><string>${s}</string></value>`;
  }
  if (Array.isArray(v))
    return `<value><array><data>${v.map(enc).join("")}</data></array></value>`;
  if (typeof v === "object") {
    const m = Object.entries(v)
      .map(([k, val]) => `<member><name>${k}</name>${enc(val)}</member>`)
      .join("");
    return `<value><struct>${m}</struct></value>`;
  }
  return `<value><string>${String(v)}</string></value>`;
}

function buildXml(method: string, params: any[]): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<methodCall><methodName>${method}</methodName>` +
    `<params>${params.map(p => `<param>${enc(p)}</param>`).join("")}</params>` +
    `</methodCall>`
  );
}

function parseXmlVal(s: string): any {
  s = s.trim();
  if (!s) return null;
  if (s.startsWith("<int>") || s.startsWith("<i4>") || s.startsWith("<i8>"))
    return parseInt(s.replace(/<[^>]+>/g, ""), 10);
  if (s.startsWith("<double>"))
    return parseFloat(s.replace(/<[^>]+>/g, ""));
  if (s.startsWith("<boolean>"))
    return s.includes(">1<");
  if (s.startsWith("<nil"))
    return null;
  if (s.startsWith("<string>") || !s.startsWith("<"))
    return s.replace(/<\/?string>/g, "")
            .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

  if (s.startsWith("<array>")) {
    const data = s.match(/<data>([\s\S]*)<\/data>/)?.[1] ?? "";
    const items: any[] = [];
    let pos = 0;
    while (pos < data.length) {
      const start = data.indexOf("<value>", pos);
      if (start === -1) break;
      let depth = 0, i = start, end = -1;
      while (i < data.length) {
        if (data.startsWith("<value>", i) || data.startsWith("<value ", i)) {
          depth++; i = data.indexOf(">", i) + 1;
        } else if (data.startsWith("</value>", i)) {
          depth--;
          if (depth === 0) { end = i; break; }
          i += 8;
        } else { i++; }
      }
      if (end === -1) break;
      items.push(parseXmlVal(data.slice(start + 7, end)));
      pos = end + 8;
    }
    return items;
  }

  if (s.startsWith("<struct>")) {
    const obj: Record<string, any> = {};
    let pos = 0;
    while (pos < s.length) {
      const memberStart = s.indexOf("<member>", pos);
      if (memberStart === -1) break;
      // Extract <name>
      const nameOpen  = s.indexOf("<name>",  memberStart);
      const nameClose = s.indexOf("</name>", nameOpen);
      if (nameOpen === -1 || nameClose === -1) break;
      const name = s.slice(nameOpen + 6, nameClose);
      // Find <value>…</value> with depth tracking (handles nested structs/arrays)
      const valOpen = s.indexOf("<value>", nameClose);
      if (valOpen === -1) break;
      let depth = 0, i = valOpen, end = -1;
      while (i < s.length) {
        if (s.startsWith("<value>", i) || s.startsWith("<value ", i)) {
          depth++; i = s.indexOf(">", i) + 1;
        } else if (s.startsWith("</value>", i)) {
          depth--;
          if (depth === 0) { end = i; break; }
          i += 8;
        } else { i++; }
      }
      if (end === -1) break;
      obj[name] = parseXmlVal(s.slice(valOpen + 7, end));
      pos = end + 8; // skip past </value>
    }
    return obj;
  }

  return s;
}

function parseXmlResponse(xml: string): any {
  if (xml.includes("<fault>")) {
    const msg =
      xml.match(/<name>faultString<\/name>[\s\S]*?<string>([\s\S]*?)<\/string>/)?.[1]?.trim() ??
      xml.match(/<string>([\s\S]*?)<\/string>/)?.[1]?.trim() ??
      "Odoo fault";
    throw new Error(msg);
  }
  const inner = xml.match(
    /<params>\s*<param>\s*<value>([\s\S]+?)<\/value>\s*<\/param>\s*<\/params>/
  )?.[1]?.trim();
  if (inner === undefined) throw new Error("Invalid XML-RPC response from Odoo");
  return parseXmlVal(inner);
}

// Use Node.js https module directly so we can set rejectUnauthorized: false
// for Odoo servers with self-signed / intermediate CA certificates.
function httpsPost(urlStr: string, body: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const req = https.request(
      {
        hostname: url.hostname,
        port:     url.port ? parseInt(url.port) : 443,
        path:     url.pathname + url.search,
        method:   "POST",
        headers:  {
          "Content-Type":   "text/xml; charset=utf-8",
          "Content-Length": Buffer.byteLength(body, "utf-8"),
        },
        rejectUnauthorized: false, // bypass intermediate-CA issue
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data",  c => chunks.push(typeof c === "string" ? Buffer.from(c) : c));
        res.on("end",  () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`Odoo HTTP ${res.statusCode}: ${res.statusMessage}`));
          } else {
            resolve(Buffer.concat(chunks).toString("utf-8"));
          }
        });
        res.on("error", reject);
      }
    );
    req.on("error", reject);
    req.write(body, "utf-8");
    req.end();
  });
}

async function rpc(path: string, method: string, args: any[]): Promise<any> {
  const base = process.env.ODOO_URL?.replace(/\/$/, "");
  if (!base) throw new Error("ODOO_URL is not set");
  const xml = buildXml(method, args);
  let text: string;
  try {
    text = await httpsPost(`${base}${path}`, xml);
  } catch (err: any) {
    throw new Error(`Tidak bisa terhubung ke Odoo: ${err.message}`);
  }
  return parseXmlResponse(text);
}

// Authenticate → returns uid (int)
// Jika username/apiKey tidak diberikan, pakai env default
async function getUid(username?: string, apiKey?: string): Promise<number> {
  const db   = process.env.ODOO_DB!;
  const usr  = username ?? process.env.ODOO_USERNAME!;
  const key  = apiKey   ?? process.env.ODOO_API_KEY!;
  const uid  = await rpc("/xmlrpc/2/common", "authenticate", [db, usr, key, {}]);
  if (!uid || uid === false)
    throw new Error("Autentikasi Odoo gagal — periksa ODOO_USERNAME dan ODOO_API_KEY");
  return uid as number;
}

// Shorthand: call object endpoint
async function call(model: string, method: string, args: any[], kwargs: any = {}, username?: string, apiKey?: string): Promise<any> {
  const db  = process.env.ODOO_DB!;
  const key = apiKey ?? process.env.ODOO_API_KEY!;
  const uid = await getUid(username, apiKey);
  return rpc("/xmlrpc/2/object", "execute_kw", [db, uid, key, model, method, args, kwargs]);
}

// ─────────────────────────────────────────────────────────────
// GET — discovery helpers
//   ?action=teams   → list helpdesk teams
//   ?action=fields  → list all helpdesk.ticket fields (for setup)
//   ?action=ticket&id=123 → read a single ticket (all fields)
// ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action");

  // ── list helpdesk-related models ────────────────────────────
  if (action === "models") {
    try {
      const models = await call("ir.model", "search_read",
        [[["model", "like", "helpdesk"]]],
        { fields: ["name", "model"], limit: 50 }
      );
      return NextResponse.json({ success: true, models });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  }

  // ── list ticket teams (helpdesk.ticket.team) ────────────────
  if (action === "teams") {
    try {
      const teams = await call("helpdesk.ticket.team", "search_read", [[]], {
        fields: ["id", "name"], limit: 100,
      });
      return NextResponse.json({ success: true, teams });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  }

  // ── list field teams (helpdesk.ticket.field.team) ────────────
  if (action === "field-teams") {
    try {
      const teams = await call("helpdesk.ticket.field.team", "search_read", [[]], {
        fields: ["id", "name"], limit: 100,
      });
      return NextResponse.json({ success: true, teams });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  }

  // ── list ticket stages ──────────────────────────────────────
  if (action === "stages") {
    try {
      const stages = await call("helpdesk.ticket.stage", "search_read", [[]], {
        fields: ["id", "name", "sequence"], limit: 100,
      });
      return NextResponse.json({ success: true, stages });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  }

  // ── list all fields on helpdesk.ticket ──────────────────────
  if (action === "fields") {
    try {
      // Call fields_get with no kwargs — get ALL field metadata
      const fields = await rpc("/xmlrpc/2/object", "execute_kw", [
        process.env.ODOO_DB!, await getUid(), process.env.ODOO_API_KEY!,
        "helpdesk.ticket", "fields_get", [], {},
      ]);
      const sorted = Object.entries(fields as Record<string, any>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, meta]) => ({ name, type: (meta as any).type, label: (meta as any).string, relation: (meta as any).relation || "" }));
      return NextResponse.json({ success: true, count: sorted.length, fields: sorted });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  }

  // ── search recent tickets (find IDs) ─────────────────────────
  if (action === "search") {
    try {
      const ids = await call("helpdesk.ticket", "search", [[]], { limit: 5, order: "id desc" });
      return NextResponse.json({ success: true, ids });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  }

  // ── read a single ticket by ID (all fields) ──────────────────
  if (action === "ticket") {
    const id = parseInt(req.nextUrl.searchParams.get("id") ?? "0", 10);
    if (!id) return NextResponse.json({ error: "Provide ?id=<ticket_id>" }, { status: 400 });
    try {
      const [ticket] = await call("helpdesk.ticket", "read", [[id]], {});
      return NextResponse.json({ success: true, ticket });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json(
    { error: "Unknown action. Use ?action=models | teams | fields | search | ticket&id=N" },
    { status: 400 }
  );
}

// ─────────────────────────────────────────────────────────────
// Helper — convert Odoo UTC datetime string → WIB (UTC+7)
// Input:  "2026-04-20 03:04:56"
// Output: "20/04/2026 10:04:56"
// ─────────────────────────────────────────────────────────────
function odooDateToWIB(odooUtc: string): string {
  if (!odooUtc) return "";
  // Odoo returns "YYYY-MM-DD HH:MM:SS" in UTC
  const utcMs = new Date(odooUtc.replace(" ", "T") + "Z").getTime();
  const wib   = new Date(utcMs + 7 * 3_600_000); // +7 hours
  const dd  = String(wib.getUTCDate()).padStart(2, "0");
  const mm  = String(wib.getUTCMonth() + 1).padStart(2, "0");
  const yy  = wib.getUTCFullYear();
  const hh  = String(wib.getUTCHours()).padStart(2, "0");
  const min = String(wib.getUTCMinutes()).padStart(2, "0");
  const ss  = String(wib.getUTCSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yy} ${hh}:${min}:${ss}`;
}

// ─────────────────────────────────────────────────────────────
// POST — create helpdesk ticket + escalate
// ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const missing = ["ODOO_URL","ODOO_DB","ODOO_USERNAME","ODOO_API_KEY","ODOO_NOC_TEAM_ID"]
    .filter(k => !process.env[k]);
  if (missing.length) {
    return NextResponse.json(
      { success: false, error: `Env var belum diset: ${missing.join(", ")}` },
      { status: 500 }
    );
  }

  try {
    const { subject, description } = (await req.json()) as {
      subject:     string;
      description: string;
    };

    if (!subject?.trim()) {
      return NextResponse.json(
        { success: false, error: "Subject tiket tidak boleh kosong" },
        { status: 400 }
      );
    }

    // ── Ambil credentials: WAJIB dari session user ────────
    // Tidak ada fallback ke env — user harus set API key sendiri
    const sessionCreds = await getSessionCreds();
    if (!sessionCreds) {
      return NextResponse.json({
        success:      false,
        error:        "Odoo API Key belum dikonfigurasi",
        needsApiKey:  true,
        hint:         "Buka Profil → Integrasi Odoo → input API Key kamu dari portal.fibermedia.co.id",
      }, { status: 403 });
    }
    const odooUsername = sessionCreds.username;
    const odooApiKey   = sessionCreds.apiKey;

    const nocTeamId      = Number(process.env.ODOO_NOC_TEAM_ID);
    const escFieldTeamId = Number(process.env.ODOO_ESC_FIELD_TEAM_ID ?? "0");
    const descHtml       = (description?.trim() || subject.trim()).replace(/\n/g, "<br/>");

    // ── 1. Buat tiket di team Fibermedia || NOC ────────────
    const ticketId: number = await call("helpdesk.ticket", "create", [{
      name:        subject.trim(),
      description: descHtml,
      team_id:     nocTeamId,
    }], {}, odooUsername, odooApiKey);

    // ── 2. Set escalation fields + trigger ESCALATE ────────
    if (escFieldTeamId) {
      await call("helpdesk.ticket", "write", [[ticketId], {
        field_team_id:        escFieldTeamId,
        escalate_description: `<p>${descHtml}</p>`,
      }], {}, odooUsername, odooApiKey);

      const escalateMethods = ["action_escalate", "do_escalate", "escalate_ticket", "button_escalate"];
      for (const method of escalateMethods) {
        try {
          await call("helpdesk.ticket", method, [[ticketId]], {}, odooUsername, odooApiKey);
          break;
        } catch { /* try next */ }
      }
    }

    // ── 3. Baca nomor tiket + create_date (SETELAH escalate) ─
    const [ticketData] = await call(
      "helpdesk.ticket", "read",
      [[ticketId]],
      { fields: ["name", "number", "create_date", "team_id"] },
      odooUsername, odooApiKey
    );

    // "number" field = HTxxxxxx (generated by Odoo at escalation)
    const ticketNumber: string =
      ticketData?.number ||
      `HT${String(ticketId).padStart(5, "0")}`;

    // Start time = create_date UTC → WIB
    const startTime = odooDateToWIB(ticketData?.create_date ?? "");

    // ── 4. Build portal URL ────────────────────────────────
    const odooUrl =
      `${process.env.ODOO_URL?.replace(/\/$/, "")}/web#id=${ticketId}&model=helpdesk.ticket&view_type=form`;

    return NextResponse.json({
      success:      true,
      ticketId,
      ticketNumber,   // "HT186901"
      startTime,      // "20/04/2026 10:04:56" (WIB)
      subject:        ticketData?.name ?? subject.trim(),
      odooUrl,
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
