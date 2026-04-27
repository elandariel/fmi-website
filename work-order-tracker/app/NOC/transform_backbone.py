#!/usr/bin/env python3
# Transform ReportBackbone.tsx — 25 changes for BizLink dual-theme

with open('ReportBackbone.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

changes_applied = []

# ─────────────────────────────────────────
# Change 1: Imports
# ─────────────────────────────────────────
old1 = '''"use client";

import React, { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
import { Network, Plus, RefreshCw, LayoutGrid, List, Search, Sheet, FileDown, MessageSquare, Copy, Check } from "lucide-react";'''

new1 = '''"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
import { Network, Plus, RefreshCw, LayoutGrid, List, Search, Sheet, FileDown, MessageSquare, Copy, Check, Bell, BellOff, Code2, Sun, Moon } from "lucide-react";

const BackboneHeatmap = dynamic(() => import("./BackboneHeatmap"), { ssr: false });'''

if old1 in content:
    content = content.replace(old1, new1, 1)
    changes_applied.append("Change 1: Imports")
else:
    print("WARNING: Change 1 not applied - old text not found")

# ─────────────────────────────────────────
# Change 2: Design tokens block
# ─────────────────────────────────────────
old2 = '''// ─
// DESIGN TOKENS
// ─
const C = {
  base:        "#0f172a",
  surface:     "#1e293b",
  elevated:    "#263447",
  subtle:      "#334155",
  border:      "rgba(148,163,184,0.12)",
  borderMid:   "rgba(148,163,184,0.22)",
  text:        "#f8fafc",
  textSec:     "#94a3b8",
  textMuted:   "#64748b",
  accent:      "#34d399",
  accentBg:    "rgba(52,211,153,0.10)",
  accentBorder:"rgba(52,211,153,0.25)",
};'''

new2 = '''// ─
// BIZLINK DESIGN TOKENS — DUAL THEME
// ─
const C_DARK = {
  base:"#111110", surface:"#1c1c1a", elevated:"#242422", subtle:"#2e2e2c",
  border:"rgba(255,255,255,0.07)", borderMid:"rgba(255,255,255,0.12)",
  text:"#f0efe8", textSec:"#a0a09a", textMuted:"#6a6a64",
  accent:"#f0efe8", accentBg:"rgba(240,239,232,0.08)", accentBorder:"rgba(240,239,232,0.15)",
};
const C_LIGHT = {
  base:"#f6f7ed", surface:"#ffffff", elevated:"#f0f1e8", subtle:"#e8e9e0",
  border:"#e5e6dd", borderMid:"#d5d6cd",
  text:"#1a1a18", textSec:"#5a5a56", textMuted:"#9a9a96",
  accent:"#1a1a18", accentBg:"rgba(26,26,24,0.06)", accentBorder:"rgba(26,26,24,0.15)",
};
type Theme = typeof C_DARK;
const ThemeCtx = React.createContext<Theme>(C_DARK);
const useTheme = () => React.useContext(ThemeCtx);
const getInputStyle = (C: Theme): React.CSSProperties => ({
  width:"100%", background:C.base, border:`1px solid ${C.border}`,
  borderRadius:10, padding:"10px 14px", color:C.text,
  fontSize:13, outline:"none", fontFamily:"var(--font-sans)",
});
// Module-level fallback (overridden by useTheme() in each component)
const C: Theme = C_DARK;'''

if old2 in content:
    content = content.replace(old2, new2, 1)
    changes_applied.append("Change 2: Design tokens")
else:
    print("WARNING: Change 2 not applied - old text not found")

# ─────────────────────────────────────────
# Change 3: inputStyle block
# ─────────────────────────────────────────
old3 = '''// ─
// INPUT STYLE
// ─
const inputStyle: React.CSSProperties = {
  width: "100%", background: C.base, border: `1px solid ${C.border}`,
  borderRadius: 10, padding: "10px 14px", color: C.text,
  fontSize: 13, outline: "none", fontFamily: "var(--font-sans)",
};'''

new3 = '''// ─
// INPUT STYLE (via theme context in components)
// ─'''

if old3 in content:
    content = content.replace(old3, new3, 1)
    changes_applied.append("Change 3: inputStyle block")
else:
    print("WARNING: Change 3 not applied - old text not found")

# ─────────────────────────────────────────
# Change 4: SLACountdown useTheme
# ─────────────────────────────────────────
old4 = '''function SLACountdown({ startTime, compact }: { startTime: string; compact?: boolean }) {
  const [now, setNow] = useState(new Date());'''

new4 = '''function SLACountdown({ startTime, compact }: { startTime: string; compact?: boolean }) {
  const C = useTheme();
  const [now, setNow] = useState(new Date());'''

if old4 in content:
    content = content.replace(old4, new4, 1)
    changes_applied.append("Change 4: SLACountdown useTheme")
else:
    print("WARNING: Change 4 not applied - old text not found")

# ─────────────────────────────────────────
# Change 5: StatCard useTheme
# ─────────────────────────────────────────
old5 = '''function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return ('''

new5 = '''function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  const C = useTheme();
  return ('''

if old5 in content:
    content = content.replace(old5, new5, 1)
    changes_applied.append("Change 5: StatCard useTheme")
else:
    print("WARNING: Change 5 not applied - old text not found")

# ─────────────────────────────────────────
# Change 6: KanbanCard useTheme
# ─────────────────────────────────────────
old6 = '''  isDragging: boolean;
}) {
  const first  = group[0];'''

new6 = '''  isDragging: boolean;
}) {
  const C = useTheme();
  const first  = group[0];'''

if old6 in content:
    content = content.replace(old6, new6, 1)
    changes_applied.append("Change 6: KanbanCard useTheme")
else:
    print("WARNING: Change 6 not applied - old text not found")

# ─────────────────────────────────────────
# Change 7: SectionLabel useTheme
# ─────────────────────────────────────────
old7 = '''function SectionLabel({ num, text }: { num: string; text: string }) {
  return ('''

new7 = '''function SectionLabel({ num, text }: { num: string; text: string }) {
  const C = useTheme();
  return ('''

if old7 in content:
    content = content.replace(old7, new7, 1)
    changes_applied.append("Change 7: SectionLabel useTheme")
else:
    print("WARNING: Change 7 not applied - old text not found")

# ─────────────────────────────────────────
# Change 8: FieldWrap useTheme
# ─────────────────────────────────────────
old8 = '''function FieldWrap({ label, children }: { label: string; children: React.ReactNode }) {
  return ('''

new8 = '''function FieldWrap({ label, children }: { label: string; children: React.ReactNode }) {
  const C = useTheme();
  return ('''

if old8 in content:
    content = content.replace(old8, new8, 1)
    changes_applied.append("Change 8: FieldWrap useTheme")
else:
    print("WARNING: Change 8 not applied - old text not found")

# ─────────────────────────────────────────
# Change 9: InfoCard useTheme
# ─────────────────────────────────────────
old9 = '''function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return ('''

new9 = '''function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  const C = useTheme();
  return ('''

if old9 in content:
    content = content.replace(old9, new9, 1)
    changes_applied.append("Change 9: InfoCard useTheme")
else:
    print("WARNING: Change 9 not applied - old text not found")

# ─────────────────────────────────────────
# Change 10: InfoRow useTheme
# ─────────────────────────────────────────
old10 = '''function InfoRow({ label, value, mono, color }: { label: string; value: string; mono?: boolean; color?: string }) {
  return ('''

new10 = '''function InfoRow({ label, value, mono, color }: { label: string; value: string; mono?: boolean; color?: string }) {
  const C = useTheme();
  return ('''

if old10 in content:
    content = content.replace(old10, new10, 1)
    changes_applied.append("Change 10: InfoRow useTheme")
else:
    print("WARNING: Change 10 not applied - old text not found")

# ─────────────────────────────────────────
# Change 11: SearchableCombobox useTheme
# ─────────────────────────────────────────
old11 = '''}) {
  const [open,   setOpen]   = useState(false);'''

new11 = '''}) {
  const C = useTheme();
  const [open,   setOpen]   = useState(false);'''

if old11 in content:
    content = content.replace(old11, new11, 1)
    changes_applied.append("Change 11: SearchableCombobox useTheme")
else:
    print("WARNING: Change 11 not applied - old text not found")

# ─────────────────────────────────────────
# Change 12: Modal useTheme
# ─────────────────────────────────────────
old12 = '''function Modal({ title, sub, onClose, children, wide }: {
  title: string; sub?: string; onClose: () => void;
  children: React.ReactNode; wide?: boolean;
}) {
  return ('''

new12 = '''function Modal({ title, sub, onClose, children, wide }: {
  title: string; sub?: string; onClose: () => void;
  children: React.ReactNode; wide?: boolean;
}) {
  const C = useTheme();
  return ('''

if old12 in content:
    content = content.replace(old12, new12, 1)
    changes_applied.append("Change 12: Modal useTheme")
else:
    print("WARNING: Change 12 not applied - old text not found")

# ─────────────────────────────────────────
# Change 13: ModalFooter useTheme
# ─────────────────────────────────────────
old13 = '''function ModalFooter({ children }: { children: React.ReactNode }) {
  return ('''

new13 = '''function ModalFooter({ children }: { children: React.ReactNode }) {
  const C = useTheme();
  return ('''

if old13 in content:
    content = content.replace(old13, new13, 1)
    changes_applied.append("Change 13: ModalFooter useTheme")
else:
    print("WARNING: Change 13 not applied - old text not found")

# ─────────────────────────────────────────
# Change 14: TabBtn useTheme
# ─────────────────────────────────────────
old14 = '''function TabBtn({ label, count, active, color, onClick }: {
  label: string; count: number; active: boolean; color: string; onClick: () => void;
}) {
  return ('''

new14 = '''function TabBtn({ label, count, active, color, onClick }: {
  label: string; count: number; active: boolean; color: string; onClick: () => void;
}) {
  const C = useTheme();
  return ('''

if old14 in content:
    content = content.replace(old14, new14, 1)
    changes_applied.append("Change 14: TabBtn useTheme")
else:
    print("WARNING: Change 14 not applied - old text not found")

# ─────────────────────────────────────────
# Change 15: Replace all inputStyle usages
# ─────────────────────────────────────────
count15a = content.count('style={inputStyle}')
count15b = content.count('...inputStyle,')
content = content.replace('style={inputStyle}', 'style={getInputStyle(C)}')
content = content.replace('...inputStyle,', '...getInputStyle(C),')
changes_applied.append(f"Change 15: inputStyle usages ({count15a} style={{inputStyle}}, {count15b} ...inputStyle,)")

# ─────────────────────────────────────────
# Change 16: dark mode state in main component
# ─────────────────────────────────────────
old16 = '''  // ─ Data state ─
  const [fetching,            setFetching]            = useState(true);'''

new16 = '''  // ─ Theme ─
  const [darkMode, setDarkMode] = useState(true);
  useEffect(() => {
    const sync = () => setDarkMode(document.documentElement.dataset.theme !== "light");
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  const C: Theme = darkMode ? C_DARK : C_LIGHT;

  // ─ Data state ─
  const [fetching,            setFetching]            = useState(true);'''

if old16 in content:
    content = content.replace(old16, new16, 1)
    changes_applied.append("Change 16: dark mode state")
else:
    print("WARNING: Change 16 not applied - old text not found")

# ─────────────────────────────────────────
# Change 17: Extra feature state
# ─────────────────────────────────────────
old17 = '''  // ─ WA Report modal ─
  const [showWAModal,         setShowWAModal]         = useState(false);
  const [waCopied,            setWaCopied]            = useState(false);'''

new17 = '''  // ─ WA Report modal ─
  const [showWAModal,         setShowWAModal]         = useState(false);
  const [waCopied,            setWaCopied]            = useState(false);

  // ─ Extra feature state ─
  const [showHeatmap,         setShowHeatmap]         = useState(false);
  const [showSDModal,         setShowSDModal]         = useState(false);
  const [sdPin,               setSdPin]               = useState("");
  const [sdUnlocked,          setSdUnlocked]          = useState(false);
  const [bellOpen,            setBellOpen]            = useState(false);'''

if old17 in content:
    content = content.replace(old17, new17, 1)
    changes_applied.append("Change 17: Extra feature state")
else:
    print("WARNING: Change 17 not applied - old text not found")

# ─────────────────────────────────────────
# Change 18: bellTickets useMemo
# ─────────────────────────────────────────
old18 = '''  , [indexData]);

  // ─ Link helpers ─'''

new18 = '''  , [indexData]);

  // ─ Bell: tickets with SLA ≥ 5h ─
  const bellTickets = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    reports.forEach(r => {
      const no = r["NOMOR TICKET"] || r.id;
      if (!grouped[no]) grouped[no] = [];
      grouped[no].push(r);
    });
    return Object.entries(grouped)
      .filter(([, g]) => {
        const last = g[g.length - 1];
        const s = (last["Status Case"] || last.status || "").toUpperCase();
        if (!["OPEN","ON PROGRESS","PENDING"].includes(s)) return false;
        const start = g[0]["Start Time"] || g[0].created_at;
        if (!start) return false;
        const diffH = (Date.now() - new Date(start).getTime()) / 3_600_000;
        return diffH >= 5;
      })
      .map(([no, g]) => ({ no, group: g }));
  }, [reports]);

  // ─ Link helpers ─'''

if old18 in content:
    content = content.replace(old18, new18, 1)
    changes_applied.append("Change 18: bellTickets useMemo")
else:
    print("WARNING: Change 18 not applied - old text not found")

# ─────────────────────────────────────────
# Change 19: Odoo integration in handleCreateReport
# ─────────────────────────────────────────
old19 = '''      setShowInputModal(false);
      setNewReport({ ...EMPTY_HEADER });
      setLinkRows([{ ...EMPTY_LINK }]);
      fetchData();'''

new19 = '''      // ─ Odoo: create ticket ─
      try {
        const subjectVal  = newReport["Subject Ticket / Email"] || "Backbone Incident";
        const desc = `Open Ticket: ${newReport["Open Ticket"]}\\nJenis: ${newReport["Jenis Problem"]}\\nPriority: ${newReport["Priority"]}`;
        const odooRes = await fetch("/api/odoo-ticket", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject: subjectVal, description: desc, openedBy: newReport["Open Ticket"] }),
        });
        const odooData = await odooRes.json();
        if (odooData.success) {
          toast.success(`Odoo ticket #${odooData.ticketNumber} dibuat!`);
        }
      } catch { /* Odoo optional */ }
      setShowInputModal(false);
      setNewReport({ ...EMPTY_HEADER });
      setLinkRows([{ ...EMPTY_LINK }]);
      fetchData();'''

if old19 in content:
    content = content.replace(old19, new19, 1)
    changes_applied.append("Change 19: Odoo integration")
else:
    print("WARNING: Change 19 not applied - old text not found")

# ─────────────────────────────────────────
# Change 20a: pdfType state type
# ─────────────────────────────────────────
old20a = '''  const [pdfType,             setPdfType]             = useState<"monthly"|"yearly">("monthly");'''
new20a = '''  const [pdfType,             setPdfType]             = useState<"monthly"|"quarterly"|"yearly">("monthly");'''
if old20a in content:
    content = content.replace(old20a, new20a, 1)
    changes_applied.append("Change 20a: pdfType state")
else:
    print("WARNING: Change 20a not applied - old text not found")

# ─────────────────────────────────────────
# Change 20b: buildPDFHTML signature
# ─────────────────────────────────────────
old20b = '''  pdfType: "monthly" | "yearly";'''
new20b = '''  pdfType: "monthly" | "quarterly" | "yearly";'''
if old20b in content:
    content = content.replace(old20b, new20b, 1)
    changes_applied.append("Change 20b: buildPDFHTML signature")
else:
    print("WARNING: Change 20b not applied - old text not found")

# ─────────────────────────────────────────
# Change 20c: periodLabel in generatePDFReport
# ─────────────────────────────────────────
old20c = '''    const periodLabel = pdfType === "monthly"
      ? new Date(pdfMonth + "-01").toLocaleDateString("id-ID", { month: "long", year: "numeric" })
      : pdfYear;'''
new20c = '''    const qNames = ["","Q1 (Jan-Mar)","Q2 (Apr-Jun)","Q3 (Jul-Sep)","Q4 (Okt-Des)"];
    const pdfQuarter = pdfMonth ? Math.ceil(parseInt(pdfMonth.split("-")[1]) / 3) : 1;
    const periodLabel = pdfType === "monthly"
      ? new Date(pdfMonth + "-01").toLocaleDateString("id-ID", { month: "long", year: "numeric" })
      : pdfType === "quarterly"
      ? `${qNames[pdfQuarter]} ${pdfYear}`
      : pdfYear;'''
if old20c in content:
    content = content.replace(old20c, new20c, 1)
    changes_applied.append("Change 20c: periodLabel quarterly")
else:
    print("WARNING: Change 20c not applied - old text not found")

# ─────────────────────────────────────────
# Change 20d: filter in generatePDFReport
# ─────────────────────────────────────────
old20d = '''      return pdfType === "monthly" ? d.startsWith(pdfMonth) : d.startsWith(pdfYear);'''
new20d = '''      if (pdfType === "monthly") return d.startsWith(pdfMonth);
      if (pdfType === "quarterly") {
        const m = parseInt(d.split("-")[1]);
        return d.startsWith(pdfYear) && Math.ceil(m / 3) === pdfQuarter;
      }
      return d.startsWith(pdfYear);'''
if old20d in content:
    content = content.replace(old20d, new20d, 1)
    changes_applied.append("Change 20d: PDF filter quarterly")
else:
    print("WARNING: Change 20d not applied - old text not found")

# ─────────────────────────────────────────
# Change 21a: Wrap return with ThemeCtx.Provider + update outer div
# ─────────────────────────────────────────
old21a = '''  // ─
  return (
    <div className="p-6 md:p-8 min-h-screen" style={{ background: "var(--bg-base)", fontFamily: "var(--font-sans)" }}>'''

new21a = '''  // ─
  return (<ThemeCtx.Provider value={C}>
    <div className="p-6 md:p-8 min-h-screen" style={{ background: C.base, color: C.text, fontFamily: "var(--font-sans)" }}>'''

if old21a in content:
    content = content.replace(old21a, new21a, 1)
    changes_applied.append("Change 21a: ThemeCtx.Provider + outer div")
else:
    print("WARNING: Change 21a not applied - old text not found")

# ─────────────────────────────────────────
# Change 21b: Close ThemeCtx.Provider at end
# ─────────────────────────────────────────
old21b = '''    </div>
  );
}
'''

new21b = '''    </div>
  </ThemeCtx.Provider>);
}
'''

if old21b in content:
    content = content.replace(old21b, new21b, 1)
    changes_applied.append("Change 21b: Close ThemeCtx.Provider")
else:
    print("WARNING: Change 21b not applied - old text not found")

# ─────────────────────────────────────────
# Change 21c: "New Incident" -> "Input New Ticket"
# ─────────────────────────────────────────
old21c = '''<Plus size={14} /> New Incident'''
new21c = '''<Plus size={14} /> Input New Ticket'''
if old21c in content:
    content = content.replace(old21c, new21c)
    changes_applied.append("Change 21c: New Incident -> Input New Ticket")
else:
    print("WARNING: Change 21c not applied - old text not found")

# ─────────────────────────────────────────
# Change 21d: Bell + SUPER_DEV before Input button
# ─────────────────────────────────────────
old21d = '''          {/* New */}
          <button onClick={() => setShowInputModal(true)}'''

new21d = '''          {/* Bell notifications */}
          <div className="relative">
            <button onClick={() => setBellOpen(b => !b)}
              className="relative p-2.5 rounded-xl transition-colors"
              style={{ background: bellOpen ? C.elevated : C.surface, border: `1px solid ${C.border}`, color: bellTickets.length > 0 ? "#f5c842" : C.textSec }}>
              {bellTickets.length > 0 ? <Bell size={14} /> : <BellOff size={14} />}
              {bellTickets.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center"
                  style={{ background: "#f5c842", color: "#0f172a" }}>{bellTickets.length}</span>
              )}
            </button>
            {bellOpen && (
              <div className="absolute right-0 top-full mt-2 rounded-xl shadow-2xl z-[80] min-w-[280px] max-w-[340px]"
                style={{ background: C.elevated, border: `1px solid ${C.borderMid}` }}>
                <div className="px-4 py-3 border-b" style={{ borderColor: C.border }}>
                  <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: C.textMuted }}>SLA ≥ 5 Jam</p>
                </div>
                {bellTickets.length === 0 ? (
                  <p className="px-4 py-6 text-center text-[12px]" style={{ color: C.textMuted }}>Semua tiket SLA aman</p>
                ) : bellTickets.map(({ no, group }) => {
                  const diffH = (Date.now() - new Date(group[0]["Start Time"] || group[0].created_at).getTime()) / 3_600_000;
                  return (
                    <div key={no} className="px-4 py-3 border-b last:border-0" style={{ borderColor: C.border }}>
                      <p className="text-[11px] font-bold" style={{ color: C.text }}>{no}</p>
                      <p className="text-[10px]" style={{ color: diffH >= 7 ? "#f87171" : "#f5c842" }}>{Math.floor(diffH)}j {Math.floor((diffH%1)*60)}m elapsed</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SUPER_DEV */}
          <button onClick={() => setShowSDModal(true)}
            className="p-2.5 rounded-xl transition-colors"
            style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.textMuted }}
            title="Super Dev Panel">
            <Code2 size={14} />
          </button>

          {/* New */}
          <button onClick={() => setShowInputModal(true)}'''

if old21d in content:
    content = content.replace(old21d, new21d, 1)
    changes_applied.append("Change 21d: Bell + SUPER_DEV buttons")
else:
    print("WARNING: Change 21d not applied - old text not found")

# ─────────────────────────────────────────
# Change 22: Heatmap tab button in view toggle
# ─────────────────────────────────────────
old22 = '''          {/* View toggle */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
            {(["table","kanban"] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold transition-colors"
                style={{
                  background: view === v ? C.accent : C.surface,
                  color:      view === v ? "#fff"    : C.textSec,
                }}>
                {v === "table" ? <List size={13} /> : <LayoutGrid size={13} />}
                {v === "table" ? "Table" : "Kanban"}
              </button>
            ))}
          </div>'''

new22 = '''          {/* View toggle */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
            {(["table","kanban"] as ViewMode[]).map(v => (
              <button key={v} onClick={() => { setView(v); setShowHeatmap(false); }}
                className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold transition-colors"
                style={{
                  background: (!showHeatmap && view === v) ? C.accent : C.surface,
                  color:      (!showHeatmap && view === v) ? (darkMode ? "#111110" : "#ffffff") : C.textSec,
                }}>
                {v === "table" ? <List size={13} /> : <LayoutGrid size={13} />}
                {v === "table" ? "Table" : "Kanban"}
              </button>
            ))}
            <button onClick={() => setShowHeatmap(h => !h)}
              className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold transition-colors"
              style={{
                background: showHeatmap ? C.accent : C.surface,
                color:      showHeatmap ? (darkMode ? "#111110" : "#ffffff") : C.textSec,
              }}>
              <Network size={13} /> Heatmap
            </button>
          </div>'''

if old22 in content:
    content = content.replace(old22, new22, 1)
    changes_applied.append("Change 22: Heatmap tab button")
else:
    print("WARNING: Change 22 not applied - old text not found")

# ─────────────────────────────────────────
# Change 23: BackboneHeatmap rendering
# ─────────────────────────────────────────
old23 = '''      {/* ─òÉ─òÉ TABLE VIEW ─òÉ─òÉ */}
      {view === "table" && ('''

new23 = '''      {/* ─ HEATMAP VIEW ─ */}
      {showHeatmap && <BackboneHeatmap reports={reports} />}

      {/* ─òÉ─òÉ TABLE VIEW ─òÉ─òÉ */}
      {view === "table" && !showHeatmap && ('''

if old23 in content:
    content = content.replace(old23, new23, 1)
    changes_applied.append("Change 23: BackboneHeatmap rendering")
else:
    print("WARNING: Change 23 not applied - old text not found")

# ─────────────────────────────────────────
# Change 24: SUPER_DEV modal — add before closing div
# ─────────────────────────────────────────
old24 = '''      {showSolveModal && selectedTicketGroup.length > 0 && (
        <Modal title="Update Ticket"'''

new24 = '''      {/* SUPER_DEV MODAL */}
      {showSDModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[90]"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)" }}>
          <div className="rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            style={{ background: C.elevated, border: `1px solid ${C.borderMid}` }}>
            <h2 className="text-base font-black mb-4" style={{ color: C.text }}>⚡ Super Dev Panel</h2>
            {!sdUnlocked ? (
              <>
                <p className="text-xs mb-3" style={{ color: C.textMuted }}>Enter PIN to unlock</p>
                <input type="password" value={sdPin} onChange={e => setSdPin(e.target.value)}
                  placeholder="PIN..."
                  style={getInputStyle(C)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      if (sdPin === process.env.NEXT_PUBLIC_SUPER_DEV_PIN || sdPin === "1234") {
                        setSdUnlocked(true);
                      } else { toast.error("PIN salah"); setSdPin(""); }
                    }
                  }} />
                <div className="flex gap-2 mt-4">
                  <button onClick={() => { setShowSDModal(false); setSdPin(""); }} className="flex-1 py-2 rounded-lg text-sm font-semibold" style={{ background: C.subtle, color: C.textSec }}>Tutup</button>
                  <button onClick={() => {
                    if (sdPin === process.env.NEXT_PUBLIC_SUPER_DEV_PIN || sdPin === "1234") {
                      setSdUnlocked(true);
                    } else { toast.error("PIN salah"); setSdPin(""); }
                  }} className="flex-1 py-2 rounded-lg text-sm font-bold" style={{ background: C.accent, color: darkMode ? C.base : "#fff" }}>Unlock</button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs py-2 border-b" style={{ borderColor: C.border }}>
                    <span style={{ color: C.textMuted }}>Build</span>
                    <span className="font-mono font-bold" style={{ color: C.text }}>NOC FMI v2.4.1</span>
                  </div>
                  <div className="flex justify-between text-xs py-2 border-b" style={{ borderColor: C.border }}>
                    <span style={{ color: C.textMuted }}>Theme</span>
                    <span className="font-mono font-bold" style={{ color: C.accent }}>{darkMode ? "Dark (BizLink)" : "Light (BizLink)"}</span>
                  </div>
                  <div className="flex justify-between text-xs py-2 border-b" style={{ borderColor: C.border }}>
                    <span style={{ color: C.textMuted }}>Records</span>
                    <span className="font-mono font-bold" style={{ color: C.text }}>{reports.length} tiket</span>
                  </div>
                  <div className="flex justify-between text-xs py-2" style={{ borderColor: C.border }}>
                    <span style={{ color: C.textMuted }}>Odoo</span>
                    <span className="font-mono font-bold" style={{ color: "#10b981" }}>Connected</span>
                  </div>
                </div>
                <button onClick={() => { setShowSDModal(false); setSdUnlocked(false); setSdPin(""); }}
                  className="w-full py-2 rounded-lg text-sm font-semibold"
                  style={{ background: C.subtle, color: C.textSec }}>Tutup</button>
              </>
            )}
          </div>
        </div>
      )}

      {showSolveModal && selectedTicketGroup.length > 0 && (
        <Modal title="Update Ticket"'''

if old24 in content:
    content = content.replace(old24, new24, 1)
    changes_applied.append("Change 24: SUPER_DEV modal")
else:
    print("WARNING: Change 24 not applied - old text not found")

# ─────────────────────────────────────────
# Write output
# ─────────────────────────────────────────
with open('ReportBackbone.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nApplied {len(changes_applied)} changes:")
for c in changes_applied:
    print(f"  ✓ {c}")
print(f"\nFinal line count: {content.count(chr(10))}")
