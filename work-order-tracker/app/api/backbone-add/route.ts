import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

// ─────────────────────────────────────────────────────────────
// POST /api/backbone-add
// body: { action: "request", nama, requestedBy }
//       { action: "approve", id, pin }
//       { action: "reject",  id, pin, reason? }
//       { action: "pending", pin }   ← GET pending list
// ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // ── CREATE REQUEST (anyone can do this) ──────────────────
    if (action === "request") {
      const { nama, requestedBy } = body as {
        nama: string; requestedBy: string;
      };
      if (!nama?.trim())        return err("Nama backbone wajib diisi", 400);
      if (!requestedBy?.trim()) return err("Nama pemohon wajib diisi",  400);

      const supabase = sb();

      // Cek duplikasi nama di Index NOC
      const { data: existing } = await supabase
        .from("Index NOC")
        .select("KODE BACKBONE")
        .ilike("KODE BACKBONE", `%/${nama.trim()}`)
        .limit(1);
      if (existing && existing.length > 0)
        return err(`Nama "${nama.trim()}" sudah ada di Index NOC (${existing[0]["KODE BACKBONE"]})`, 409);

      // Cek duplikasi di requests yang PENDING
      const { data: dupReq } = await supabase
        .from("backbone_requests")
        .select("id, nama_backbone")
        .ilike("nama_backbone", nama.trim())
        .eq("status", "PENDING")
        .limit(1);
      if (dupReq && dupReq.length > 0)
        return err(`Request untuk "${nama.trim()}" sudah ada dan menunggu persetujuan`, 409);

      const { data, error } = await supabase
        .from("backbone_requests")
        .insert({ nama_backbone: nama.trim(), requested_by: requestedBy.trim(), status: "PENDING" })
        .select("id")
        .single();
      if (error) throw new Error(error.message);

      return ok({ id: data.id, message: "Request berhasil dikirim, menunggu persetujuan SUPER_DEV" });
    }

    // ── LIST PENDING (SUPER_DEV only) ────────────────────────
    if (action === "pending") {
      const { pin } = body;
      if (!checkPin(pin)) return err("PIN SUPER_DEV salah", 403);

      const { data, error } = await sb()
        .from("backbone_requests")
        .select("*")
        .eq("status", "PENDING")
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);

      return ok({ requests: data ?? [] });
    }

    // ── APPROVE (SUPER_DEV only) ─────────────────────────────
    if (action === "approve") {
      const { id, pin, reviewedBy } = body;
      if (!checkPin(pin)) return err("PIN SUPER_DEV salah", 403);

      const supabase = sb();

      // Get request
      const { data: req2, error: reqErr } = await supabase
        .from("backbone_requests")
        .select("*")
        .eq("id", id)
        .single();
      if (reqErr || !req2) return err("Request tidak ditemukan", 404);
      if (req2.status !== "PENDING") return err("Request sudah diproses sebelumnya", 400);

      // Compute next KODE ID from Index NOC
      const { data: indexRows } = await supabase
        .from("Index NOC")
        .select("id");
      const ids = (indexRows ?? [])
        .map((r: any) => parseInt(r.id ?? "0", 10))
        .filter((n: number) => !isNaN(n) && n > 0);
      const maxId  = ids.length > 0 ? Math.max(...ids) : 0;
      const kodeId = String(maxId + 1).padStart(5, "0");
      const kodeBB = `${kodeId}/${req2.nama_backbone}`;

      // Insert into Index NOC
      const { error: insErr } = await supabase
        .from("Index NOC")
        .insert({ id: kodeId, "KODE BACKBONE": kodeBB });
      if (insErr) throw new Error("Gagal insert ke Index NOC: " + insErr.message);

      // Update request status
      await supabase
        .from("backbone_requests")
        .update({ status: "APPROVED", reviewed_by: reviewedBy ?? "SUPER_DEV",
                  reviewed_at: new Date().toISOString(), kode_backbone: kodeBB })
        .eq("id", id);

      return ok({ kodeBB, message: `Backbone ${kodeBB} berhasil ditambahkan!` });
    }

    // ── REJECT (SUPER_DEV only) ──────────────────────────────
    if (action === "reject") {
      const { id, pin, reason, reviewedBy } = body;
      if (!checkPin(pin)) return err("PIN SUPER_DEV salah", 403);

      const supabase = sb();
      const { data: req2 } = await supabase
        .from("backbone_requests").select("status").eq("id", id).single();
      if (!req2) return err("Request tidak ditemukan", 404);
      if (req2.status !== "PENDING") return err("Request sudah diproses sebelumnya", 400);

      await supabase
        .from("backbone_requests")
        .update({ status: "REJECTED", reviewed_by: reviewedBy ?? "SUPER_DEV",
                  reviewed_at: new Date().toISOString(), reject_reason: reason ?? "" })
        .eq("id", id);

      return ok({ message: "Request ditolak" });
    }

    return err("action tidak dikenal", 400);

  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

function ok(data: object) {
  return NextResponse.json({ success: true, ...data });
}
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: msg }, { status });
}
