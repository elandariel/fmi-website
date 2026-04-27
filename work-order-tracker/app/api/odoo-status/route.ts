import { NextRequest, NextResponse } from "next/server";
import https from "https";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase (service role — untuk lookup odoo_credentials) ─
const sb = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

// ─── Lookup credentials per team (fallback ke env jika tidak ada) ─
async function getCredsFor(openedBy?: string): Promise<{ username: string; apiKey: string; source: string }> {
  const fallback = {
    username: process.env.ODOO_USERNAME!,
    apiKey:   process.env.ODOO_API_KEY!,
    source:   "env (default)",
  };
  if (!openedBy?.trim()) return fallback;
  try {
    const { data } = await sb()
      .from("odoo_credentials")
      .select("odoo_username, odoo_api_key, display_name")
      .eq("team_name", openedBy.trim())
      .eq("is_active", true)
      .single();
    if (data?.odoo_username && data?.odoo_api_key) {
      return { username: data.odoo_username, apiKey: data.odoo_api_key, source: data.display_name || openedBy };
    }
  } catch { /* tabel belum dibuat atau team tidak ditemukan → fallback */ }
  return fallback;
}

/**
 * Odoo status sync — updates ticket stage + posts log note.
 *
 * PATCH /api/odoo-status
 *   body: { ticketNumber, status, logNote? }
 *   ticketNumber : "HT187081"
 *   status       : "ON PROGRESS" | "PENDING" | "SOLVED" | "UNSOLVED" | "CANCEL"
 *   logNote      : plain text (optional) — sent as Odoo log note
 */

// ─────────────────────────────────────────────────────────────
// Stage mapping  (confirmed from live Odoo: ?action=stages)
// ─────────────────────────────────────────────────────────────
const STAGE: Record<string, number> = {
  "OPEN":        1,
  "ON PROGRESS": 2,
  "PENDING":     3,
  "SOLVED":      4,
  "UNSOLVED":    4,  // Done
  "CANCEL":      5,
};

// Reverse: Odoo stage_id → status string (for reading back)
const STAGE_REVERSE: Record<number, string> = {
  1: "OPEN",
  2: "ON PROGRESS",
  3: "PENDING",
  4: "SOLVED",   // stage 4 = Done (SOLVED & UNSOLVED both land here)
  5: "CANCEL",
};

// ─────────────────────────────────────────────────────────────
// Minimal XML-RPC helpers (duplicated from odoo-ticket/route.ts
// to keep each route self-contained)
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
    const s = v.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    return `<value><string>${s}</string></value>`;
  }
  if (Array.isArray(v))
    return `<value><array><data>${v.map(enc).join("")}</data></array></value>`;
  if (typeof v === "object") {
    const m = Object.entries(v)
      .map(([k,val]) => `<member><name>${k}</name>${enc(val)}</member>`)
      .join("");
    return `<value><struct>${m}</struct></value>`;
  }
  return `<value><string>${String(v)}</string></value>`;
}

function buildXml(method: string, params: any[]): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<methodCall><methodName>${method}</methodName>` +
    `<params>${params.map(p=>`<param>${enc(p)}</param>`).join("")}</params>` +
    `</methodCall>`
  );
}

function parseXmlVal(s: string): any {
  s = s.trim();
  if (!s) return null;
  if (s.startsWith("<int>") || s.startsWith("<i4>") || s.startsWith("<i8>"))
    return parseInt(s.replace(/<[^>]+>/g,""),10);
  if (s.startsWith("<double>"))  return parseFloat(s.replace(/<[^>]+>/g,""));
  if (s.startsWith("<boolean>")) return s.includes(">1<");
  if (s.startsWith("<nil"))      return null;
  if (s.startsWith("<string>") || !s.startsWith("<"))
    return s.replace(/<\/?string>/g,"")
            .replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">");
  if (s.startsWith("<array>")) {
    const data = s.match(/<data>([\s\S]*)<\/data>/)?.[1] ?? "";
    const items: any[] = [];
    let pos = 0;
    while (pos < data.length) {
      const start = data.indexOf("<value>",pos);
      if (start === -1) break;
      let depth=0, i=start, end=-1;
      while (i < data.length) {
        if (data.startsWith("<value>",i)||data.startsWith("<value ",i)){ depth++; i=data.indexOf(">",i)+1; }
        else if (data.startsWith("</value>",i)){ depth--; if(depth===0){end=i;break;} i+=8; }
        else { i++; }
      }
      if (end===-1) break;
      items.push(parseXmlVal(data.slice(start+7,end)));
      pos = end+8;
    }
    return items;
  }
  if (s.startsWith("<struct>")) {
    const obj: Record<string,any> = {};
    let pos = 0;
    while (pos < s.length) {
      const memberStart = s.indexOf("<member>",pos);
      if (memberStart===-1) break;
      const nameOpen  = s.indexOf("<name>", memberStart);
      const nameClose = s.indexOf("</name>",nameOpen);
      if (nameOpen===-1||nameClose===-1) break;
      const name = s.slice(nameOpen+6,nameClose);
      const valOpen = s.indexOf("<value>",nameClose);
      if (valOpen===-1) break;
      let depth=0, i=valOpen, end=-1;
      while (i < s.length) {
        if (s.startsWith("<value>",i)||s.startsWith("<value ",i)){ depth++; i=s.indexOf(">",i)+1; }
        else if (s.startsWith("</value>",i)){ depth--; if(depth===0){end=i;break;} i+=8; }
        else { i++; }
      }
      if (end===-1) break;
      obj[name] = parseXmlVal(s.slice(valOpen+7,end));
      pos = end+8;
    }
    return obj;
  }
  return s;
}

function parseXmlResponse(xml: string): any {
  if (xml.includes("<fault>")) {
    const msg =
      xml.match(/<name>faultString<\/name>[\s\S]*?<string>([\s\S]*?)<\/string>/)?.[1]?.trim() ??
      xml.match(/<string>([\s\S]*?)<\/string>/)?.[1]?.trim() ?? "Odoo fault";
    throw new Error(msg);
  }
  const inner = xml.match(
    /<params>\s*<param>\s*<value>([\s\S]+?)<\/value>\s*<\/param>\s*<\/params>/
  )?.[1]?.trim();
  if (inner === undefined) throw new Error("Invalid XML-RPC response");
  return parseXmlVal(inner);
}

function httpsPost(urlStr: string, body: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const req = https.request({
      hostname: url.hostname,
      port:     url.port ? parseInt(url.port) : 443,
      path:     url.pathname + url.search,
      method:   "POST",
      headers:  { "Content-Type":"text/xml; charset=utf-8", "Content-Length": Buffer.byteLength(body,"utf-8") },
      rejectUnauthorized: false,
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", c => chunks.push(typeof c==="string"?Buffer.from(c):c));
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 400)
          reject(new Error(`Odoo HTTP ${res.statusCode}`));
        else resolve(Buffer.concat(chunks).toString("utf-8"));
      });
      res.on("error", reject);
    });
    req.on("error", reject);
    req.write(body,"utf-8");
    req.end();
  });
}

async function rpc(path: string, method: string, args: any[]): Promise<any> {
  const base = process.env.ODOO_URL?.replace(/\/$/,"");
  if (!base) throw new Error("ODOO_URL is not set");
  const text = await httpsPost(`${base}${path}`, buildXml(method, args));
  return parseXmlResponse(text);
}

// Authenticate dengan credentials tertentu (bukan hardcoded env)
async function getUidWith(username: string, apiKey: string): Promise<number> {
  const uid = await rpc("/xmlrpc/2/common", "authenticate", [
    process.env.ODOO_DB!, username, apiKey, {}
  ]);
  if (!uid || uid === false) throw new Error(`Autentikasi Odoo gagal untuk ${username}`);
  return uid as number;
}

// Eksekusi Odoo method dengan credentials tertentu
async function callWith(
  username: string, apiKey: string,
  model: string, method: string, args: any[], kwargs: any = {}
): Promise<any> {
  const uid = await getUidWith(username, apiKey);
  return rpc("/xmlrpc/2/object", "execute_kw", [
    process.env.ODOO_DB!, uid, apiKey, model, method, args, kwargs
  ]);
}

// ─────────────────────────────────────────────────────────────
// GET — baca stage tiket dari Odoo → kembalikan status string
// GET /api/odoo-status?ticketNumber=HT187081
//   Returns: { success, stageId, status, subject }
//   status: "OPEN" | "ON PROGRESS" | "PENDING" | "SOLVED" | "CANCEL"
// ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const ticketNumber = req.nextUrl.searchParams.get("ticketNumber");
  if (!ticketNumber?.trim()) {
    return NextResponse.json({ success: false, error: "ticketNumber diperlukan" }, { status: 400 });
  }
  try {
    // Gunakan default env credentials untuk read (tidak butuh per-team)
    const username = process.env.ODOO_USERNAME!;
    const apiKey   = process.env.ODOO_API_KEY!;

    // Cari ticket ID berdasarkan nomor (HTxxxxxx)
    const ids: number[] = await callWith(username, apiKey,
      "helpdesk.ticket", "search",
      [[["number", "=", ticketNumber.trim()]]]
    );
    if (!ids || ids.length === 0) {
      return NextResponse.json({ success: false, error: "Ticket tidak ditemukan di Odoo" }, { status: 404 });
    }

    // Baca stage_id dan subject
    const [ticket] = await callWith(username, apiKey,
      "helpdesk.ticket", "read",
      [[ids[0]]],
      { fields: ["number", "name", "stage_id"] }
    );

    // stage_id di Odoo XML-RPC bisa berupa [id, name] (many2one) atau integer
    const stageId: number = Array.isArray(ticket.stage_id)
      ? ticket.stage_id[0]
      : (ticket.stage_id ?? 1);

    const status = STAGE_REVERSE[stageId] ?? "OPEN";

    return NextResponse.json({
      success:  true,
      ticketId: ids[0],
      stageId,
      status,                         // "ON PROGRESS" | "PENDING" | "SOLVED" | "CANCEL" | "OPEN"
      subject:  ticket.name ?? "",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────
// PATCH — update ticket stage + optional log note
// body: { ticketNumber, status, logNote?, openedBy? }
//   openedBy = nilai kolom "Open Ticket" (mis: "NOC-Rio")
//   → dipakai untuk lookup credentials di odoo_credentials
//   → fallback ke env vars jika tidak ditemukan
// ─────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const { ticketNumber, status, logNote, openedBy } = (await req.json()) as {
      ticketNumber: string;
      status:       string;
      logNote?:     string;
      openedBy?:    string;   // nilai "Open Ticket" dari tiket
    };

    if (!ticketNumber?.trim()) {
      return NextResponse.json({ success: false, error: "ticketNumber wajib diisi" }, { status: 400 });
    }

    const stageId = STAGE[status];
    if (!stageId) {
      return NextResponse.json({ success: false, error: `Status "${status}" tidak dikenal` }, { status: 400 });
    }

    // ── Ambil credentials (per-team atau fallback default) ──
    const creds = await getCredsFor(openedBy);

    // ── 1. Cari ticket ID berdasarkan field "number" ───────
    const ids: number[] = await callWith(
      creds.username, creds.apiKey,
      "helpdesk.ticket", "search",
      [[["number", "=", ticketNumber.trim()]]]
    );
    if (!ids || ids.length === 0) {
      return NextResponse.json({ success: true, skipped: true, reason: "Ticket not found in Odoo" });
    }
    const ticketId = ids[0];

    // ── 2. Update stage ────────────────────────────────────
    await callWith(
      creds.username, creds.apiKey,
      "helpdesk.ticket", "write", [[ticketId], { stage_id: stageId }]
    );

    // ── 3. Post log note jika ada ─────────────────────────
    if (logNote?.trim()) {
      const bodyHtml = logNote
        .trim()
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/\n/g,"<br/>");
      await callWith(
        creds.username, creds.apiKey,
        "helpdesk.ticket", "message_post", [[ticketId]], {
          body:          `<pre style="font-family:monospace;white-space:pre-wrap">${bodyHtml}</pre>`,
          message_type:  "comment",
          subtype_xmlid: "mail.mt_note",
        }
      );
    }

    return NextResponse.json({ success: true, ticketId, stageId, status, usedAccount: creds.source });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
