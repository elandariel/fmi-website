'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import {
  ShieldCheck, Users, Save, RotateCcw, CheckCircle2,
  XCircle, Minus, Loader2,
  AlertTriangle, Info, Crown, Sliders, UserCog,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ALL_PERMISSION_KEYS, PERMISSION_GROUPS,
  ROLE_LABELS, ROLE_COLORS, NON_SUPER_ROLES, buildRolePermissions,
  type Role, type PermissionKey,
} from '@/lib/permissions';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
interface RoleRecord {
  id: string;
  name: Role;
  display_name: string;
  permissions: Record<string, boolean>;
  updated_at: string;
}

interface UserRecord {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  permission_overrides: Record<string, boolean> | null;
}

type OverrideState = 'inherit' | 'allow' | 'deny';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function getDefaultBoolMap(role: Role): Record<string, boolean> {
  return buildRolePermissions(role);
}

function mergeWithDefaults(role: Role, dbPerms: Record<string, boolean>): Record<string, boolean> {
  const defaults = getDefaultBoolMap(role);
  return { ...defaults, ...dbPerms };
}

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

// Toggle switch
function Toggle({
  checked, onChange, disabled,
}: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-all duration-200 focus:outline-none ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
      }`}
      style={{
        // ON  = emerald-500 solid
        // OFF = slate-500 solid — visible in both dark & light mode
        background: checked ? '#10b981' : '#64748b',
        boxShadow: checked
          ? '0 0 0 1px rgba(16,185,129,0.3)'
          : '0 0 0 1px rgba(100,116,139,0.4)',
      }}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full shadow-md transition-transform duration-200 ${
          checked ? 'translate-x-[18px]' : 'translate-x-1'
        }`}
        style={{
          // ON  = white knob
          // OFF = light gray knob (tetap kontras di light mode)
          background: checked ? '#ffffff' : '#e2e8f0',
        }}
      />
    </button>
  );
}

// Override badge — 3 states: inherit, allow, deny
function OverridePill({
  state,
  onChange,
  disabled,
}: { state: OverrideState; onChange: (s: OverrideState) => void; disabled?: boolean }) {
  const cycle: OverrideState[] = ['inherit', 'allow', 'deny'];
  const next = cycle[(cycle.indexOf(state) + 1) % 3];

  const styles: Record<OverrideState, string> = {
    inherit: 'bg-white/6 border-white/10 text-slate-500',
    allow:   'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
    deny:    'bg-rose-500/15 border-rose-500/30 text-rose-400',
  };
  const icons: Record<OverrideState, React.ReactNode> = {
    inherit: <Minus size={11} />,
    allow:   <CheckCircle2 size={11} />,
    deny:    <XCircle size={11} />,
  };
  const labels: Record<OverrideState, string> = {
    inherit: 'Ikuti Role',
    allow:   'Izinkan',
    deny:    'Blokir',
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange(next)}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'
      } ${styles[state]}`}
    >
      {icons[state]}
      {labels[state]}
    </button>
  );
}

// Permission group — always expanded, no collapse/expand.
// Header uses <div> (not <button>) to prevent nested-button hydration error.
function PermissionGroup({
  group,
  permissions,
  onToggle,
  disabled,
}: {
  group: (typeof PERMISSION_GROUPS)[number];
  permissions: Record<string, boolean>;
  onToggle: (key: PermissionKey) => void;
  disabled?: boolean;
}) {
  const activeCount = group.keys.filter(k => Boolean(permissions[k])).length;
  const allOn = activeCount === group.keys.length;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--border-mid)' }}
    >
      {/* Section label header — never clickable/collapsible */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid var(--border-mid)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-black uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            {group.label}
          </span>
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              allOn
                ? 'bg-emerald-500/15 text-emerald-400'
                : activeCount > 0
                ? 'bg-amber-500/15 text-amber-400'
                : 'bg-white/6 text-slate-500'
            }`}
          >
            {activeCount}/{group.keys.length}
          </span>
        </div>

        {/* Toggle-all button: standalone <button>, NOT nested in another button */}
        {!disabled && (
          <button
            type="button"
            onClick={() => {
              group.keys.forEach(k => {
                if (Boolean(permissions[k]) !== !allOn) onToggle(k);
              });
            }}
            className="text-[10px] font-semibold px-2 py-1 rounded-lg transition-colors"
            style={{ color: allOn ? '#f87171' : '#34d399' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            {allOn ? '— Matikan semua' : '+ Aktifkan semua'}
          </button>
        )}
      </div>

      {/* Permission rows — always visible */}
      {group.keys.map((key, i) => {
        const active = Boolean(permissions[key]);
        return (
          <div
            key={key}
            className="flex items-center justify-between px-4 py-2"
            style={{
              background: 'var(--bg-surface)',
              borderBottom: i < group.keys.length - 1 ? '1px solid var(--border-subtle, rgba(255,255,255,0.04))' : 'none',
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: active ? '#10b981' : 'rgba(255,255,255,0.12)' }}
              />
              <div>
                <p className="text-[13px] font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {group.keyLabels[i]}
                </p>
                <p className="text-[10px] font-mono leading-tight mt-0.5" style={{ color: 'rgba(100,116,139,0.7)' }}>
                  {key}
                </p>
              </div>
            </div>
            <Toggle
              checked={active}
              onChange={() => onToggle(key)}
              disabled={disabled}
            />
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// USER OVERRIDES SECTION
// ─────────────────────────────────────────────
function UserOverridesTab({
  users,
  rolePermsMap,
  supabaseToken,
}: {
  users: UserRecord[];
  rolePermsMap: Record<string, Record<string, boolean>>;
  supabaseToken: string;
}) {
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [overrides, setOverrides] = useState<Record<string, OverrideState>>({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const nonSuperUsers = users.filter(u => u.role !== 'SUPER_DEV');
  const filtered = nonSuperUsers.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()),
  );

  function selectUser(u: UserRecord) {
    setSelectedUser(u);
    // Build override state from existing overrides
    const init: Record<string, OverrideState> = {};
    const existing = u.permission_overrides || {};
    for (const key of ALL_PERMISSION_KEYS) {
      if (key in existing) {
        init[key] = existing[key] ? 'allow' : 'deny';
      } else {
        init[key] = 'inherit';
      }
    }
    setOverrides(init);
  }

  async function handleSave() {
    if (!selectedUser) return;
    setSaving(true);

    // Build the overrides object — only non-inherit keys
    const result: Record<string, boolean> = {};
    for (const [key, state] of Object.entries(overrides)) {
      if (state === 'allow') result[key] = true;
      if (state === 'deny')  result[key] = false;
    }

    try {
      const res = await fetch('/api/admin/user-overrides', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseToken}`,
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          overrides: Object.keys(result).length > 0 ? result : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success('Override permissions disimpan!');
    } catch (err: any) {
      toast.error('Gagal menyimpan', { description: err.message });
    } finally {
      setSaving(false);
    }
  }

  function resetOverrides() {
    if (!selectedUser) return;
    const init: Record<string, OverrideState> = {};
    for (const key of ALL_PERMISSION_KEYS) init[key] = 'inherit';
    setOverrides(init);
  }

  // What the role actually gives this user
  const roleEffective = useMemo(() => {
    if (!selectedUser) return {};
    const rolePerms = rolePermsMap[selectedUser.role];
    if (!rolePerms) return getDefaultBoolMap(selectedUser.role);
    return mergeWithDefaults(selectedUser.role, rolePerms);
  }, [selectedUser, rolePermsMap]);

  const hasChanges = selectedUser
    ? ALL_PERMISSION_KEYS.some(k => {
        const existing = (selectedUser.permission_overrides || {})[k];
        const cur = overrides[k];
        const curBool = cur === 'inherit' ? undefined : cur === 'allow';
        return existing !== curBool;
      })
    : false;

  return (
    <div className="flex gap-6 items-start">
      {/* User list — sticky */}
      <div className="w-64 shrink-0 flex flex-col gap-3 sticky top-0">
        <input
          type="text"
          placeholder="Cari user..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-3 py-2 rounded-xl text-sm outline-none border transition-all"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-mid)',
            color: 'var(--text-primary)',
          }}
        />
        <div className="flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {filtered.map(u => {
            const rc = ROLE_COLORS[u.role] || ROLE_COLORS['CS'];
            const hasOverride = u.permission_overrides && Object.keys(u.permission_overrides).length > 0;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => selectUser(u)}
                className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all border ${
                  selectedUser?.id === u.id
                    ? 'border-blue-500/40'
                    : 'border-transparent hover:border-white/10'
                }`}
                style={{
                  background: selectedUser?.id === u.id ? 'rgba(59,130,246,0.1)' : 'var(--bg-surface)',
                }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                  style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.border}` }}
                >
                  {u.full_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {u.full_name || u.email}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: rc.bg, color: rc.text }}
                    >
                      {u.role}
                    </span>
                    {hasOverride && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400">
                        override
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-secondary)' }}>
              Tidak ada user ditemukan
            </p>
          )}
        </div>
      </div>

      {/* Override editor */}
      <div className="flex-1 min-w-0">
        {!selectedUser ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
            <UserCog size={40} className="text-slate-600" />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Pilih user untuk mengatur override permissions
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* User header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                  {selectedUser.full_name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {selectedUser.email} · Role: <span className="font-semibold">{selectedUser.role}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetOverrides}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-mid)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <RotateCcw size={13} /> Reset semua
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: hasChanges ? 'var(--primary)' : 'var(--bg-surface)',
                    color: hasChanges ? '#fff' : 'var(--text-secondary)',
                    border: hasChanges ? 'none' : '1px solid var(--border-mid)',
                    cursor: saving || !hasChanges ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Simpan Override
                </button>
              </div>
            </div>

            {/* Legend */}
            <div
              className="flex items-center gap-4 px-3 py-2.5 rounded-xl text-xs"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-mid)', color: 'var(--text-secondary)' }}
            >
              <Info size={13} className="shrink-0 text-blue-400" />
              <span><strong className="text-slate-400">Ikuti Role</strong> = mengikuti default role | </span>
              <span><strong className="text-emerald-400">Izinkan</strong> = paksa aktifkan | </span>
              <span><strong className="text-rose-400">Blokir</strong> = paksa nonaktifkan</span>
            </div>

            {/* Permission groups — no maxHeight, scroll naturally via page */}
            <div className="flex flex-col gap-2 pb-6">
              {PERMISSION_GROUPS.map(group => (
                <div
                  key={group.label}
                  className="rounded-2xl overflow-hidden"
                  style={{ border: '1px solid var(--border-mid)' }}
                >
                  {/* Group header */}
                  <div
                    className="px-4 py-2.5"
                    style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid var(--border-mid)' }}
                  >
                    <p className="text-[12px] font-black uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                      {group.label}
                    </p>
                  </div>
                  {/* Rows */}
                  {group.keys.map((key, i) => {
                    const roleHas = Boolean(roleEffective[key]);
                    const overrideState = overrides[key] || 'inherit';
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between px-4 py-2"
                        style={{
                          background: 'var(--bg-surface)',
                          borderBottom: i < group.keys.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        }}
                      >
                        <div>
                          <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                            {group.keyLabels[i]}
                          </p>
                          <p className="text-[10px] font-mono mt-0.5">
                            <span style={{ color: 'rgba(100,116,139,0.6)' }}>Role default: </span>
                            <span className={roleHas ? 'text-emerald-500' : 'text-rose-500'}>
                              {roleHas ? '✓ Diizinkan' : '✗ Diblokir'}
                            </span>
                          </p>
                        </div>
                        <OverridePill
                          state={overrideState}
                          onChange={s => setOverrides(prev => ({ ...prev, [key]: s }))}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
export default function ManageRolesPage() {
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  ), []);

  const [tab, setTab]           = useState<'roles' | 'users'>('roles');
  const [roles, setRoles]       = useState<RoleRecord[]>([]);
  const [users, setUsers]       = useState<UserRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [seeding, setSeeding]   = useState(false);
  const [needsSeed, setNeedsSeed] = useState(false);
  const [token, setToken]       = useState('');

  // Selected role + local permission edits
  const [selectedRole, setSelectedRole]   = useState<RoleRecord | null>(null);
  const [editPerms, setEditPerms]         = useState<Record<string, boolean>>({});
  const [saving, setSaving]               = useState(false);

  // ── Fetch data on load ──
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, usersRes] = await Promise.all([
        fetch('/api/admin/roles'),
        fetch('/api/admin/user-overrides'),
      ]);
      const rolesJson = await rolesRes.json();
      const usersJson = await usersRes.json();

      if (rolesJson.roles && rolesJson.roles.length > 0) {
        const loaded: RoleRecord[] = rolesJson.roles;
        setRoles(loaded);
        setNeedsSeed(false);
        // Auto-select first role so toggles are immediately visible
        setSelectedRole(prev => {
          if (prev) {
            // refresh the record if it already exists
            const refreshed = loaded.find(r => r.name === prev.name);
            if (refreshed) {
              setEditPerms(mergeWithDefaults(refreshed.name, refreshed.permissions));
              return refreshed;
            }
          }
          // First load — auto-select NOC
          const first = loaded.find(r => r.name === 'NOC') || loaded[0];
          if (first) setEditPerms(mergeWithDefaults(first.name, first.permissions));
          return first || null;
        });
      } else {
        setNeedsSeed(true);
      }

      if (usersJson.users) setUsers(usersJson.users);
    } catch {
      toast.error('Gagal memuat data permissions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) setToken(session.access_token);
    });
    fetchAll();
  }, [fetchAll, supabase]);

  // ── Seed default roles ──
  async function handleSeedRoles() {
    setSeeding(true);
    try {
      const seeds = NON_SUPER_ROLES.map(role => ({
        name: role,
        display_name: {
          NOC: 'NOC Engineer', AKTIVATOR: 'Aktivator',
          ADMIN: 'Administrator', CS: 'Customer Service',
        }[role],
        permissions: buildRolePermissions(role),
      }));

      for (const seed of seeds) {
        const res = await fetch('/api/admin/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(seed),
        });
        if (!res.ok) {
          const j = await res.json();
          throw new Error(j.error);
        }
      }
      toast.success('Default roles berhasil di-seed!');
      fetchAll();
    } catch (err: any) {
      toast.error('Seed gagal', { description: err.message });
    } finally {
      setSeeding(false);
    }
  }

  // ── Select a role to edit ──
  function handleSelectRole(r: RoleRecord) {
    setSelectedRole(r);
    setEditPerms(mergeWithDefaults(r.name, r.permissions));
  }

  function togglePerm(key: PermissionKey) {
    setEditPerms(prev => ({ ...prev, [key]: !prev[key] }));
  }

  // ── Check if there are unsaved changes ──
  const hasChanges = useMemo(() => {
    if (!selectedRole) return false;
    const merged = mergeWithDefaults(selectedRole.name, selectedRole.permissions);
    return ALL_PERMISSION_KEYS.some(k => editPerms[k] !== merged[k]);
  }, [selectedRole, editPerms]);

  // ── Save role permissions ──
  async function handleSave() {
    if (!selectedRole) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: selectedRole.name, permissions: editPerms }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success('Permissions berhasil disimpan!');
      // Update local state
      setRoles(prev => prev.map(r =>
        r.name === selectedRole.name
          ? { ...r, permissions: editPerms }
          : r,
      ));
      setSelectedRole(prev => prev ? { ...prev, permissions: editPerms } : prev);
    } catch (err: any) {
      toast.error('Gagal menyimpan', { description: err.message });
    } finally {
      setSaving(false);
    }
  }

  // ── Reset to default matrix ──
  function handleResetToDefault() {
    if (!selectedRole) return;
    setEditPerms(buildRolePermissions(selectedRole.name));
  }

  // ── Role permissions map (for UserOverrides) ──
  const rolePermsMap = useMemo(() => {
    const map: Record<string, Record<string, boolean>> = {};
    for (const r of roles) map[r.name] = r.permissions;
    return map;
  }, [roles]);

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.25)' }}
          >
            <Sliders size={20} style={{ color: '#c084fc' }} />
          </div>
          <div>
            <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>
              Role & Permission Management
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Atur akses setiap role dan override per-user · SUPER_DEV only
            </p>
          </div>
        </div>
      </div>

      {/* SUPER_DEV Notice */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-6 text-sm"
        style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', color: '#c084fc' }}
      >
        <Crown size={16} />
        <span>
          Panel ini hanya dapat diakses oleh <strong>SUPER_DEV</strong>. Perubahan berlaku langsung untuk semua user di role tersebut.
        </span>
      </div>

      {/* Needs seed warning */}
      {needsSeed && !loading && (
        <div
          className="flex items-center gap-4 px-4 py-4 rounded-2xl mb-6"
          style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}
        >
          <AlertTriangle size={20} style={{ color: '#fbbf24' }} className="shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: '#fbbf24' }}>
              Tabel roles belum memiliki data
            </p>
            <p className="text-xs mt-0.5 text-amber-300/70">
              Klik tombol di samping untuk mengisi default permissions berdasarkan matrix yang sudah didefinisikan.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSeedRoles}
            disabled={seeding}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
            style={{ background: '#d97706', color: '#fff', cursor: seeding ? 'not-allowed' : 'pointer' }}
          >
            {seeding ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
            Seed Default Roles
          </button>
        </div>
      )}

      {/* Tabs */}
      <div
        className="flex items-center gap-1 p-1 rounded-2xl mb-6 w-fit"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-mid)' }}
      >
        {([
          { id: 'roles', icon: <ShieldCheck size={14} />, label: 'Role Permissions' },
          { id: 'users', icon: <Users size={14} />, label: 'User Overrides' },
        ] as const).map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: tab === t.id ? 'var(--primary)' : 'transparent',
              color: tab === t.id ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 size={22} className="animate-spin text-blue-400" />
          <p style={{ color: 'var(--text-secondary)' }}>Memuat data permissions...</p>
        </div>
      ) : tab === 'roles' ? (
        /* ════════════════════════════════════════
           TAB: ROLE PERMISSIONS
           ════════════════════════════════════════ */
        <div className="flex gap-6 items-start">

          {/* Role list sidebar — sticky so it stays visible while scrolling permissions */}
          <div className="w-52 shrink-0 sticky top-0 pt-0">
            <p className="text-[11px] font-bold uppercase tracking-widest mb-3 px-1" style={{ color: 'var(--text-secondary)' }}>
              Pilih Role
            </p>

            {/* SUPER_DEV card (non-selectable, always all-access) */}
            <div
              className="flex items-center gap-2.5 px-3 py-3 rounded-xl mb-2 border"
              style={{
                background: 'rgba(168,85,247,0.08)',
                border: '1px solid rgba(168,85,247,0.2)',
              }}
            >
              <Crown size={16} style={{ color: '#c084fc' }} />
              <div>
                <p className="text-[13px] font-bold" style={{ color: '#c084fc' }}>SUPER_DEV</p>
                <p className="text-[10px] text-violet-400/60 mt-0.5">All access · tidak dapat diubah</p>
              </div>
            </div>

            {/* Other roles */}
            {NON_SUPER_ROLES.map(roleName => {
              const record = roles.find(r => r.name === roleName);
              const rc = ROLE_COLORS[roleName];
              const isSelected = selectedRole?.name === roleName;
              return (
                <button
                  key={roleName}
                  type="button"
                  disabled={!record}
                  onClick={() => record && handleSelectRole(record)}
                  className={`w-full flex items-center gap-2.5 px-3 py-3 rounded-xl mb-1.5 border text-left transition-all ${
                    isSelected ? '' : !record ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90'
                  }`}
                  style={{
                    background: isSelected ? rc.bg : 'var(--bg-surface)',
                    borderColor: isSelected ? rc.border : 'var(--border-mid)',
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shrink-0"
                    style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.border}` }}
                  >
                    {roleName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold truncate" style={{ color: isSelected ? rc.text : 'var(--text-primary)' }}>
                      {roleName}
                    </p>
                    <p className="text-[10px] truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {ROLE_LABELS[roleName]}
                    </p>
                  </div>
                </button>
              );
            })}

            {needsSeed && (
              <p className="text-[11px] text-amber-400/70 mt-2 px-1 text-center">
                ↑ Seed roles dulu
              </p>
            )}
          </div>

          {/* Permission editor */}
          <div className="flex-1 min-w-0">
            {!selectedRole ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
                <ShieldCheck size={40} className="text-slate-600" />
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Pilih role untuk mengedit permissions
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Role header + actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>
                          {selectedRole.name}
                        </h2>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: ROLE_COLORS[selectedRole.name].bg,
                            color: ROLE_COLORS[selectedRole.name].text,
                            border: `1px solid ${ROLE_COLORS[selectedRole.name].border}`,
                          }}
                        >
                          {ROLE_LABELS[selectedRole.name]}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {ALL_PERMISSION_KEYS.filter(k => editPerms[k]).length} dari {ALL_PERMISSION_KEYS.length} permissions aktif
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetToDefault}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all"
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-mid)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <RotateCcw size={13} /> Reset Default
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving || !hasChanges}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-bold transition-all"
                      style={{
                        background: hasChanges ? 'var(--primary)' : 'var(--bg-surface)',
                        color: hasChanges ? '#fff' : 'var(--text-secondary)',
                        border: hasChanges ? 'none' : '1px solid var(--border-mid)',
                        cursor: saving || !hasChanges ? 'not-allowed' : 'pointer',
                        opacity: saving ? 0.7 : 1,
                      }}
                    >
                      {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                      {hasChanges ? 'Simpan Perubahan' : 'Tersimpan'}
                    </button>
                  </div>
                </div>

                {/* Groups — no maxHeight, scroll via page */}
                <div className="flex flex-col gap-2 pb-6">
                  {PERMISSION_GROUPS.map(group => (
                    <PermissionGroup
                      key={group.label}
                      group={group}
                      permissions={editPerms}
                      onToggle={togglePerm}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ════════════════════════════════════════
           TAB: USER OVERRIDES
           ════════════════════════════════════════ */
        <UserOverridesTab
          users={users}
          rolePermsMap={rolePermsMap}
          supabaseToken={token}
        />
      )}
    </div>
  );
}
