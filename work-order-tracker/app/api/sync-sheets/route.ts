import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/sync-sheets
 * Proxy ke Google Apps Script — upsert by id (tanpa delete baris, tanpa ubah format).
 *
 * Apps Script menerima:
 *   { spreadsheetId, sheetName, headers: string[], rows: object[] }
 *
 * Logika Apps Script:
 *   - Baris header (row 1) diisi jika kosong, tidak diubah jika sudah ada
 *   - Cari kolom "id" dari header row
 *   - Build map: id → rowIndex dari data yang sudah ada
 *   - Untuk setiap row masukan:
 *     - id tidak ada di sheet → INSERT di akhir
 *     - id sudah ada & ada perubahan → UPDATE baris tersebut (setValues only)
 *     - id sudah ada & sama → IGNORE
 *   - Baris di sheet yang tidak ada di data → DIBIARKAN (tidak dihapus)
 */

// Urutan kolom yang akan ditulis ke sheet (harus cocok dengan header di Apps Script)
const SHEET_HEADERS = [
  "id",
  "Hari dan Tanggal Report",
  "Open Ticket",
  "NOMOR TICKET",
  "Subject Ticket / Email",
  "Jenis Problem",
  "Status Case",
  "Priority",
  "Start Time",
  "Nama Link",
  "Kode Backbone",
  "Closed Ticket",
  "Near End",
  "Far End",
  "Problem",
  "Problem & Action",
  "Titik Kordinat Cut / Bending",
  "Alamat Problem",
  "Regional",
  "Hari dan Tanggal Closed",
  "End Time",
  "MTTR",
  "SLA",
  "Cancel Reason",
];

export async function POST(req: NextRequest) {
  const url = process.env.APPS_SCRIPT_URL;

  if (!url) {
    return NextResponse.json(
      { success: false, error: "APPS_SCRIPT_URL belum diset di .env.local" },
      { status: 500 }
    );
  }

  try {
    const rows: any[] = await req.json();

    // Sort by id ascending
    const sorted = [...rows].sort((a, b) => Number(a.id) - Number(b.id));

    const payload = {
      spreadsheetId:
        process.env.SHEETS_SPREADSHEET_ID ||
        "1eiyU-VJSZzMvN8C1S-yxJCtWaVLi45GeDYtMzqa0_mw",
      sheetName: "Report Backbone",
      headers:   SHEET_HEADERS,
      rows:      sorted,
    };

    const res = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body:    JSON.stringify(payload),
    });

    const text = await res.text();

    try {
      return NextResponse.json(JSON.parse(text));
    } catch {
      // Apps Script redirect / plain-text response → anggap sukses
      return NextResponse.json({ success: true, added: sorted.length, updated: 0 });
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
