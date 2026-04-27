"use client";

/**
 * CalendarHeatmap — GitHub-style incident frequency calendar
 *
 * Props:
 *   reports  : raw row array dari Supabase ("Report Backbone")
 *   darkMode : boolean untuk color scheme
 *
 * Features:
 *  - Full-year grid (Jan–Dec, 7-row weekday lanes)
 *  - Color scale: 0 = empty / 1 = light / 2-3 = mid / 4-6 = deep / 7+ = max
 *  - Tooltip on hover: tanggal + jumlah insiden + daftar tiket
 *  - Year selector (back to earliest data)
 *  - Month summary bar chart di bawah grid
 *  - Status breakdown per-hari (warna stacked)
 *  - Responsive scroll horizontal pada layar kecil
 */

import React, { useMemo, useState, useRef } from "react";

// ── Indonesian month / day names ──────────────────────────────
const BULAN_SHORT = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
const HARI_SHORT  = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"];

// ── Status colors (consistent with main app) ─────────────────
const STATUS_COLOR: Record<string, string> = {
  "OPEN":        "#f5c842",
  "ON PROGRESS": "#60a5fa",
  "PENDING":     "#fb923c",
  "UNSOLVED":    "#f87171",
  "SOLVED":      "#10b981",
  "CANCEL":      "#9496a8",
};

// ── Heatmap intensity palette (green tones, 5 levels) ────────
function heatColor(count: number, dark: boolean): string {
  if (count === 0) return dark ? "#2a2a28" : "#e8e9e0";
  if (count === 1) return dark ? "#0d4429" : "#9be9a8";
  if (count <= 3)  return dark ? "#006d32" : "#40c463";
  if (count <= 6)  return dark ? "#26a641" : "#30a14e";
  return                         dark ? "#39d353" : "#216e39";
}

// ── Date helpers ──────────────────────────────────────────────
const BULAN_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli",
                  "Agustus","September","Oktober","November","Desember"];

function extractISODate(s: string): string | null {
  if (!s) return null;
  // "DD MMMM YYYY"
  const id = s.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/);
  if (id) {
    const mi = BULAN_ID.findIndex(m => m.toLowerCase() === id[2].toLowerCase());
    if (mi >= 0) return `${id[3]}-${String(mi + 1).padStart(2,"0")}-${id[1].padStart(2,"0")}`;
  }
  // "YYYY-MM-DD"
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  // "DD/MM/YYYY"
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,"0")}-${dmy[1].padStart(2,"0")}`;
  return null;
}

function daysInYear(year: number): number {
  return (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 366 : 365;
}

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

// ── Types ─────────────────────────────────────────────────────
interface DayData {
  iso:      string;
  date:     Date;
  count:    number;
  tickets:  { no: string; status: string }[];
  statuses: Record<string, number>;
}

interface CalendarHeatmapProps {
  reports:  any[];
  darkMode: boolean;
}

// ── Tooltip ───────────────────────────────────────────────────
function Tooltip({ day, x, y, dark }: { day: DayData; x: number; y: number; dark: boolean }) {
  const bg     = dark ? "#1c1c1a" : "#ffffff";
  const border = dark ? "rgba(255,255,255,0.12)" : "#d5d6cd";
  const text   = dark ? "#f0efe8" : "#1a1a18";
  const muted  = dark ? "#909088" : "#585856";

  const [d, m, yr] = [
    day.date.getDate(),
    BULAN_ID[day.date.getMonth()],
    day.date.getFullYear(),
  ];
  const maxVisible = 5;
  const shown = day.tickets.slice(0, maxVisible);
  const extra = day.tickets.length - maxVisible;

  return (
    <div
      style={{
        position: "fixed",
        left: x + 12,
        top:  y - 10,
        zIndex: 9999,
        pointerEvents: "none",
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 10,
        padding: "10px 13px",
        minWidth: 180,
        maxWidth: 260,
        boxShadow: dark
          ? "0 8px 24px rgba(0,0,0,0.6)"
          : "0 8px 24px rgba(0,0,0,0.12)",
      }}
    >
      <p style={{ color: text, fontWeight: 800, fontSize: 12, marginBottom: 4 }}>
        {d} {m} {yr}
      </p>
      <p style={{ color: muted, fontSize: 11, marginBottom: day.count > 0 ? 8 : 0 }}>
        {day.count === 0 ? "Tidak ada insiden" : `${day.count} insiden`}
      </p>

      {/* Status breakdown */}
      {day.count > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
          {Object.entries(day.statuses).map(([st, cnt]) => (
            <span key={st} style={{
              fontSize: 9, fontWeight: 700, padding: "2px 6px",
              borderRadius: 5, letterSpacing: "0.04em",
              background: `${STATUS_COLOR[st] ?? "#888"}28`,
              color: STATUS_COLOR[st] ?? "#888",
              border: `1px solid ${STATUS_COLOR[st] ?? "#888"}40`,
            }}>
              {st} ×{cnt}
            </span>
          ))}
        </div>
      )}

      {/* Ticket list */}
      {shown.map(({ no, status }) => (
        <div key={no} style={{
          display: "flex", alignItems: "center", gap: 6, marginBottom: 3,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
            background: STATUS_COLOR[status] ?? "#888",
          }} />
          <span style={{ fontFamily: "monospace", fontSize: 11, color: text }}>{no}</span>
          <span style={{ fontSize: 10, color: muted, marginLeft: "auto" }}>{status}</span>
        </div>
      ))}
      {extra > 0 && (
        <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>+{extra} tiket lainnya</p>
      )}
    </div>
  );
}

// ── Bar chart (monthly summary) ───────────────────────────────
function MonthlyBar({ monthCounts, maxCount, dark }: {
  monthCounts: number[];
  maxCount:    number;
  dark:        boolean;
}) {
  const text  = dark ? "#909088" : "#585856";
  const bar   = dark ? "#39d353" : "#216e39";
  const barBg = dark ? "#2a2a28" : "#e8e9e0";

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 50 }}>
      {monthCounts.map((cnt, i) => {
        const pct = maxCount > 0 ? (cnt / maxCount) : 0;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 9, color: text, fontWeight: 700 }}>{cnt || ""}</span>
            <div style={{
              width: "100%", height: 32, background: barBg,
              borderRadius: 4, overflow: "hidden",
              display: "flex", flexDirection: "column", justifyContent: "flex-end",
            }}>
              <div style={{
                width: "100%", height: `${Math.max(pct * 100, cnt > 0 ? 8 : 0)}%`,
                background: bar, borderRadius: 4,
                transition: "height 0.3s ease",
              }} />
            </div>
            <span style={{ fontSize: 9, color: text }}>{BULAN_SHORT[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export default function CalendarHeatmap({ reports, darkMode: dark }: CalendarHeatmapProps) {
  const bg     = dark ? "#111110" : "#f6f7ed";
  const surface= dark ? "#1c1c1a" : "#ffffff";
  const border = dark ? "rgba(255,255,255,0.07)" : "#e5e6dd";
  const text   = dark ? "#f0efe8" : "#1a1a18";
  const muted  = dark ? "#909088" : "#585856";
  const subtle = dark ? "#2a2a28" : "#e8e9e0";

  // ── Available years from data ─────────────────────────────
  const availableYears = useMemo(() => {
    const ys = new Set<number>();
    reports.forEach(r => {
      const iso = extractISODate(r["Hari dan Tanggal Report"] || "");
      if (iso) ys.add(parseInt(iso.slice(0, 4)));
    });
    const sorted = [...ys].sort((a, b) => b - a);
    if (sorted.length === 0) sorted.push(new Date().getFullYear());
    return sorted;
  }, [reports]);

  const [selYear, setSelYear] = useState<number>(() => new Date().getFullYear());

  // Clamp to available
  const year = availableYears.includes(selYear) ? selYear : (availableYears[0] ?? new Date().getFullYear());

  // ── Build day map ─────────────────────────────────────────
  const dayMap = useMemo<Record<string, DayData>>(() => {
    const map: Record<string, DayData> = {};
    // Pre-populate every day of the year
    const start = new Date(year, 0, 1);
    const total = daysInYear(year);
    for (let i = 0; i < total; i++) {
      const d   = addDays(start, i);
      const iso = toISO(d);
      map[iso]  = { iso, date: d, count: 0, tickets: [], statuses: {} };
    }
    // Fill with report data
    reports.forEach(r => {
      const iso = extractISODate(r["Hari dan Tanggal Report"] || "");
      if (!iso || !iso.startsWith(String(year))) return;
      if (!map[iso]) return; // outside range
      const no     = r["NOMOR TICKET"] || "—";
      const status = (r["Status Case"] || "OPEN").toUpperCase();
      map[iso].count++;
      // Deduplicate by ticket number per day
      if (!map[iso].tickets.find(t => t.no === no)) {
        map[iso].tickets.push({ no, status });
      }
      map[iso].statuses[status] = (map[iso].statuses[status] ?? 0) + 1;
    });
    return map;
  }, [reports, year]);

  // ── Build weekly grid ─────────────────────────────────────
  // Start from Mon of the week containing Jan 1
  const gridData = useMemo(() => {
    const jan1    = new Date(year, 0, 1);
    const dow     = jan1.getDay(); // 0=Sun
    // Offset so grid starts on Sunday of that week
    const gridStart = addDays(jan1, -dow);

    const weeks: (DayData | null)[][] = [];
    let cur = new Date(gridStart);

    while (cur.getFullYear() <= year || cur <= new Date(year, 11, 31)) {
      const week: (DayData | null)[] = [];
      for (let d = 0; d < 7; d++) {
        const iso = toISO(cur);
        week.push(cur.getFullYear() === year ? (dayMap[iso] ?? null) : null);
        cur = addDays(cur, 1);
      }
      weeks.push(week);
      if (cur.getFullYear() > year && cur.getMonth() > 0) break;
      if (cur.getFullYear() > year && addDays(cur, -7) > new Date(year, 11, 31)) break;
    }
    return weeks;
  }, [year, dayMap]);

  // ── Month label positions ─────────────────────────────────
  const monthLabels = useMemo(() => {
    const labels: { month: number; weekIdx: number }[] = [];
    gridData.forEach((week, wi) => {
      week.forEach(day => {
        if (day && day.date.getDate() === 1) {
          labels.push({ month: day.date.getMonth(), weekIdx: wi });
        }
      });
    });
    return labels;
  }, [gridData]);

  // ── Monthly totals for bar chart ─────────────────────────
  const monthlyTotals = useMemo(() => {
    const arr = new Array(12).fill(0);
    Object.values(dayMap).forEach(d => {
      arr[d.date.getMonth()] += d.count;
    });
    return arr;
  }, [dayMap]);
  const maxMonthly = Math.max(...monthlyTotals, 1);

  // ── Stats ─────────────────────────────────────────────────
  const totalIncidents = useMemo(() => Object.values(dayMap).reduce((s, d) => s + d.count, 0), [dayMap]);
  const activeDays     = useMemo(() => Object.values(dayMap).filter(d => d.count > 0).length, [dayMap]);
  const peakDay        = useMemo(() => {
    let best: DayData | null = null;
    Object.values(dayMap).forEach(d => { if (!best || d.count > best.count) best = d; });
    return best;
  }, [dayMap]);
  const longestStreak  = useMemo(() => {
    let max = 0, cur = 0;
    const sorted = Object.values(dayMap).sort((a,b) => a.iso.localeCompare(b.iso));
    sorted.forEach(d => { if (d.count > 0) { cur++; max = Math.max(max, cur); } else cur = 0; });
    return max;
  }, [dayMap]);

  // ── Tooltip state ─────────────────────────────────────────
  const [tooltip, setTooltip] = useState<{ day: DayData; x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Cell size ─────────────────────────────────────────────
  const CELL = 13;
  const GAP  = 2;

  return (
    <div style={{
      background: bg, color: text, fontFamily: "var(--font-sans, system-ui)",
      height: "100%", display: "flex", flexDirection: "column",
      padding: "20px 24px", gap: 20, overflowY: "auto",
    }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 900, color: text, margin: 0 }}>
            Kalender Insiden
          </h3>
          <p style={{ fontSize: 11, color: muted, marginTop: 3 }}>
            Frekuensi insiden per hari · klik sel untuk detail
          </p>
        </div>

        {/* Year selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={() => {
              const idx = availableYears.indexOf(selYear);
              if (idx < availableYears.length - 1) setSelYear(availableYears[idx + 1]);
            }}
            disabled={availableYears.indexOf(selYear) >= availableYears.length - 1}
            style={{
              width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center",
              justifyContent: "center", border: `1px solid ${border}`, background: surface,
              color: muted, fontSize: 16, cursor: "pointer", opacity:
                availableYears.indexOf(selYear) >= availableYears.length - 1 ? 0.35 : 1,
            }}
          >‹</button>

          <span style={{
            fontSize: 18, fontWeight: 900, color: text,
            minWidth: 52, textAlign: "center", letterSpacing: "-0.5px",
          }}>{year}</span>

          <button
            onClick={() => {
              const idx = availableYears.indexOf(selYear);
              if (idx > 0) setSelYear(availableYears[idx - 1]);
            }}
            disabled={availableYears.indexOf(selYear) <= 0}
            style={{
              width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center",
              justifyContent: "center", border: `1px solid ${border}`, background: surface,
              color: muted, fontSize: 16, cursor: "pointer", opacity:
                availableYears.indexOf(selYear) <= 0 ? 0.35 : 1,
            }}
          >›</button>
        </div>
      </div>

      {/* ── Stat pills ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {[
          { label: "Total Insiden",    value: totalIncidents,  accent: "#39d353" },
          { label: "Hari Aktif",       value: activeDays,      accent: "#60a5fa" },
          { label: "Streak Terpanjang",value: `${longestStreak} hari`, accent: "#f5c842" },
          { label: "Hari Tersibuk",    value: peakDay ? `${peakDay.count} insiden` : "—", accent: "#fb923c" },
        ].map(({ label, value, accent }) => (
          <div key={label} style={{
            background: surface, border: `1px solid ${border}`,
            borderRadius: 12, padding: "8px 14px",
            display: "flex", flexDirection: "column", gap: 2, minWidth: 120,
          }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {label}
            </span>
            <span style={{ fontSize: 20, fontWeight: 900, color: accent, letterSpacing: "-0.5px" }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* ── Grid ── */}
      <div style={{
        background: surface, border: `1px solid ${border}`,
        borderRadius: 14, padding: "18px 20px", overflowX: "auto",
      }} ref={containerRef}>

        {/* Month labels */}
        <div style={{
          display: "flex", paddingLeft: 28, marginBottom: 4,
          position: "relative", height: 16,
        }}>
          {monthLabels.map(({ month, weekIdx }) => (
            <span key={`${month}-${weekIdx}`} style={{
              position: "absolute",
              left: 28 + weekIdx * (CELL + GAP),
              fontSize: 10, fontWeight: 700, color: muted,
              whiteSpace: "nowrap",
            }}>
              {BULAN_SHORT[month]}
            </span>
          ))}
        </div>

        {/* Day labels + grid */}
        <div style={{ display: "flex", gap: GAP }}>

          {/* Day-of-week labels */}
          <div style={{
            display: "flex", flexDirection: "column",
            gap: GAP, paddingTop: 0, width: 24, flexShrink: 0,
          }}>
            {[0,1,2,3,4,5,6].map(i => (
              <div key={i} style={{
                height: CELL, display: "flex", alignItems: "center",
                fontSize: 9, color: muted, fontWeight: 600,
                justifyContent: "flex-end", paddingRight: 4,
              }}>
                {/* Show only Mon, Wed, Fri */}
                {[1,3,5].includes(i) ? HARI_SHORT[i] : ""}
              </div>
            ))}
          </div>

          {/* Weeks */}
          <div style={{ display: "flex", gap: GAP, overflowX: "auto" }}>
            {gridData.map((week, wi) => (
              <div key={wi} style={{ display: "flex", flexDirection: "column", gap: GAP }}>
                {week.map((day, di) => {
                  if (!day) {
                    return (
                      <div key={di} style={{
                        width: CELL, height: CELL, borderRadius: 3,
                        background: "transparent",
                      }} />
                    );
                  }
                  const fill = heatColor(day.count, dark);
                  return (
                    <div
                      key={di}
                      style={{
                        width: CELL, height: CELL, borderRadius: 3,
                        background: fill,
                        cursor: day.count > 0 ? "pointer" : "default",
                        transition: "transform 0.1s, opacity 0.1s",
                        outline: tooltip?.day.iso === day.iso ? `2px solid ${dark ? "#fff" : "#333"}` : "none",
                        outlineOffset: 1,
                      }}
                      onMouseEnter={e => {
                        const rect = (e.target as HTMLElement).getBoundingClientRect();
                        setTooltip({ day, x: rect.right, y: rect.top });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          marginTop: 14, justifyContent: "flex-end",
        }}>
          <span style={{ fontSize: 10, color: muted }}>Sedikit</span>
          {[0,1,2,4,7].map(n => (
            <div key={n} style={{
              width: CELL, height: CELL, borderRadius: 3,
              background: heatColor(n, dark),
              border: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
            }} />
          ))}
          <span style={{ fontSize: 10, color: muted }}>Banyak</span>
        </div>
      </div>

      {/* ── Monthly bar chart ── */}
      <div style={{
        background: surface, border: `1px solid ${border}`,
        borderRadius: 14, padding: "16px 20px",
      }}>
        <p style={{ fontSize: 11, fontWeight: 800, color: muted, marginBottom: 12,
                    textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Distribusi Bulanan {year}
        </p>
        <MonthlyBar monthCounts={monthlyTotals} maxCount={maxMonthly} dark={dark} />
      </div>

      {/* ── Day-of-week analysis ── */}
      <div style={{
        background: surface, border: `1px solid ${border}`,
        borderRadius: 14, padding: "16px 20px",
      }}>
        <p style={{ fontSize: 11, fontWeight: 800, color: muted, marginBottom: 12,
                    textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Distribusi Hari {year}
        </p>
        <DayOfWeekChart dayMap={dayMap} dark={dark} />
      </div>

      {/* Tooltip (portal-like fixed positioning) */}
      {tooltip && <Tooltip day={tooltip.day} x={tooltip.x} y={tooltip.y} dark={dark} />}
    </div>
  );
}

// ── Day-of-week breakdown chart ───────────────────────────────
function DayOfWeekChart({ dayMap, dark }: { dayMap: Record<string, DayData>; dark: boolean }) {
  const text  = dark ? "#f0efe8" : "#1a1a18";
  const muted = dark ? "#909088" : "#585856";
  const barBg = dark ? "#2a2a28" : "#e8e9e0";

  const dowCounts = useMemo(() => {
    const arr = new Array(7).fill(0);
    Object.values(dayMap).forEach(d => { arr[d.date.getDay()] += d.count; });
    return arr;
  }, [dayMap]);
  const maxDow = Math.max(...dowCounts, 1);
  const dowColors = ["#f87171","#fb923c","#f5c842","#10b981","#60a5fa","#a78bfa","#f0efe8"];

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 60 }}>
      {["Min","Sen","Sel","Rab","Kam","Jum","Sab"].map((day, i) => {
        const pct = dowCounts[i] / maxDow;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 9, color: muted, fontWeight: 700 }}>{dowCounts[i] || ""}</span>
            <div style={{
              width: "100%", height: 36, background: barBg,
              borderRadius: 5, overflow: "hidden",
              display: "flex", flexDirection: "column", justifyContent: "flex-end",
            }}>
              <div style={{
                width: "100%", height: `${Math.max(pct * 100, dowCounts[i] > 0 ? 8 : 0)}%`,
                background: dowColors[i], borderRadius: 5,
                transition: "height 0.3s ease",
              }} />
            </div>
            <span style={{ fontSize: 10, color: text, fontWeight: 700 }}>{day}</span>
          </div>
        );
      })}
    </div>
  );
}
