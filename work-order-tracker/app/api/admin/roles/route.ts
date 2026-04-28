// app/api/admin/roles/route.ts
// Manages role-level permissions stored in the `roles` Supabase table.
// All mutations require the caller to be SUPER_DEV.

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// ── Verify the caller is SUPER_DEV ──────────────────────
async function verifySuperDev(request: Request): Promise<{ ok: boolean; error?: string }> {
  const auth = request.headers.get('authorization') || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return { ok: false, error: 'Unauthorized' };

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return { ok: false, error: 'Invalid session' };

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'SUPER_DEV') {
    return { ok: false, error: 'Akses ditolak: hanya SUPER_DEV' };
  }
  return { ok: true };
}

// ── GET /api/admin/roles — fetch all roles ───────────────
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('roles')
    .select('id, name, display_name, permissions, updated_at')
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ roles: data });
}

// ── PUT /api/admin/roles — update one role's permissions ─
export async function PUT(request: Request) {
  const auth = await verifySuperDev(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 403 });

  try {
    const body = await request.json();
    const { name, permissions } = body as { name: string; permissions: Record<string, boolean> };

    if (!name || !permissions) {
      return NextResponse.json({ error: 'name dan permissions wajib diisi' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('roles')
      .update({ permissions, updated_at: new Date().toISOString() })
      .eq('name', name);

    if (error) throw error;

    return NextResponse.json({ message: `Permissions untuk role ${name} berhasil diperbarui` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST /api/admin/roles — seed / create a role ────────
export async function POST(request: Request) {
  const auth = await verifySuperDev(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 403 });

  try {
    const body = await request.json();
    const { name, display_name, permissions } = body;

    const { error } = await supabaseAdmin
      .from('roles')
      .upsert({ name, display_name, permissions }, { onConflict: 'name' });

    if (error) throw error;

    return NextResponse.json({ message: `Role ${name} berhasil disimpan` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
