import { NextRequest, NextResponse } from "next/server";

/**
 * /api/odoo-credentials
 *
 * Dipakai oleh SUPER_DEV modal di ReportBackbone.tsx untuk verifikasi PIN.
 * Credentials management (list/upsert/delete) sudah dipindah ke:
 *   - Per-user  : /api/my-odoo-key  (user input API key sendiri)
 *   - Admin view: /manage-users → tab "Integrasi Odoo"
 */

function checkPin(pin: string): boolean {
  const valid = process.env.SUPER_DEV_PIN;
  if (!valid) return false;
  return pin?.trim() === valid.trim();
}

// POST /api/odoo-credentials
//   body: { action: "verify", pin }
//   → 200 jika PIN benar, 403 jika salah
export async function POST(req: NextRequest) {
  try {
    const { pin } = (await req.json()) as { pin?: string };

    if (!checkPin(pin ?? "")) {
      return NextResponse.json(
        { success: false, error: "PIN SUPER_DEV salah" },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
