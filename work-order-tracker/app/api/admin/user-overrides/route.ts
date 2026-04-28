// app/api/admin/user-overrides/route.ts
// Manages per-user permission_overrides stored in the `profiles` table.
// All mutations require the caller to be SUPER_DEV.

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } },
);

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

// ── GET /api/admin/user-overrides?userId=xxx ─────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    // Return all users with their overrides (for the list)
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, role, permission_overrides')
      .order('full_name');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ users: data });
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, role, permission_overrides')
    .eq('id', userId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ user: data });
}

// ── PUT /api/admin/user-overrides — update user's overrides ──
export async function PUT(request: Request) {
  const auth = await verifySuperDev(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 403 });

  try {
    const body = await request.json();
    const { userId, overrides } = body as {
      userId: string;
      overrides: Record<string, boolean> | null;
    };

    if (!userId) {
      return NextResponse.json({ error: 'userId wajib diisi' }, { status: 400 });
    }

    // overrides = null means "clear all overrides (follow role defaults)"
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        permission_overrides: overrides && Object.keys(overrides).length > 0 ? overrides : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) throw error;

    return NextResponse.json({ message: 'Override permissions berhasil diperbarui' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
