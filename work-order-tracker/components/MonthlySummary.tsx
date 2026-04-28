'use client';

import { useEffect, useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import dynamic from 'next/dynamic';
import * as XLSX from 'xlsx';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

// Nama bulan Indonesia untuk ilike query dan tampilan
const BULAN_ID = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
];

// Konversi "yyyy-MM" → "April 2026"
function formatPeriod(yyyyMM: string): string {
  const [year, month] = yyyyMM.split('-');
  return `${BULAN_ID[parseInt(month, 10) - 1]} ${year}`;
}

// ── Custom tooltip helpers (inline styles — kebal terhadap dark mode body color) ──
const mkTipSlice = (label: string, color: string, value: number) =>
  `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;
               box-shadow:0 4px 16px rgba(0,0,0,0.12);min-width:140px;font-family:inherit;">
    <div style="display:flex;align-items:center;gap:7px;">
      <span style="width:9px;height:9px;border-radius:50%;background:${color};display:inline-block;flex-shrink:0;"></span>
      <span style="color:#374151;font-size:11px;">${label}:&nbsp;<strong style="color:#1e293b;">${value} WO</strong></span>
    </div>
  </div>`;

const mkTipBar = (label: string, series: number[][], dataPointIndex: number, colors: string[], names: string[]) => {
  const rows = series.map((s, i) =>
    `<div style="display:flex;align-items:center;gap:6px;margin-top:${i > 0 ? 4 : 0}px;">
      <span style="width:8px;height:8px;border-radius:50%;background:${colors[i]};display:inline-block;flex-shrink:0;"></span>
      <span style="color:#374151;font-size:11px;">${names[i]}:&nbsp;<strong style="color:#1e293b;">${s[dataPointIndex]} WO</strong></span>
    </div>`
  ).join('');
  return `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;
                      box-shadow:0 4px 16px rgba(0,0,0,0.12);min-width:150px;font-family:inherit;">
    <div style="color:#374151;font-size:11px;font-weight:700;margin-bottom:5px;
                padding-bottom:4px;border-bottom:1px solid #f1f5f9;">${label}</div>
    ${rows}
  </div>`;
};

// ─── MonthlySummary ───────────────────────────────────────────
// BUG-05 fix (rev2): TANGGAL disimpan dalam format teks Indonesia
//   ("Rabu, 27 April 2026"), bukan ISO — query pakai ilike('%Bulan Tahun%')
// BUG-06 + FITUR-08 fix: daftar tim diambil dinamis dari tabel Index
// BUG-07 fix: export PDF membuka window baru dgn konten ringkasan
// UX-05  fix: semua tooltip chart berubah ke 'light'
// ─────────────────────────────────────────────────────────────
const MonthlySummary = forwardRef(({ selectedMonth }: { selectedMonth: string }, ref) => {
  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // FITUR-08: teams dari database, fallback jika gagal
  const [teams, setTeams] = useState<string[]>(['Ilham', 'Shidiq', 'Andi', 'Anan']);

  // UX-05 / BUG-09: supabase stabil, tidak dibuat ulang tiap render
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  ), []);

  // FITUR-08: ambil daftar tim dari tabel Index kolom Team
  useEffect(() => {
    supabase.from('Index').select('Team')
      .then(({ data: rows }) => {
        if (rows && rows.length > 0) {
          const unique = [...new Set(rows.map((r: any) => r.Team).filter(Boolean))] as string[];
          if (unique.length > 0) setTeams(unique);
        }
      });
  }, [supabase]);

  // ── Export Excel ──────────────────────────────────────────
  const exportToExcel = () => {
    if (!data) return;
    const { utils, writeFile } = XLSX;
    const periodLabel = formatPeriod(selectedMonth);
    const summaryRows = [
      ['LAPORAN RINGKASAN BULANAN (MONTHLY SUMMARY)'],
      [`Periode Laporan: ${periodLabel}`],
      [''],
      ['KATEGORI STATUS', 'JUMLAH WO', 'KETERANGAN'],
      ['Berlangganan (Pasang Baru)', data.counts.berlangganan, 'Aktif'],
      ['Berhenti Sementara (Cuti)', data.counts.sementara, 'Suspend'],
      ['Berhenti Berlangganan (Putus)', data.counts.berhenti, 'Terminate'],
      ['Upgrade Speed', data.counts.upgrade, 'Naik Paket'],
      ['Downgrade Speed', data.counts.downgrade, 'Turun Paket'],
      [''],
      ['TOTAL SELURUH WORK ORDER',
        data.counts.berlangganan + data.counts.sementara + data.counts.berhenti + data.counts.upgrade + data.counts.downgrade,
        ''],
    ];
    const teamRows: any[] = [
      ['DETAIL PERFORMA PRODUKTIVITAS TIM'], [''],
      ['NAMA TIM', 'PASANG', 'CUTI', 'PUTUS', 'UPGRADE', 'DOWNGRADE', 'TOTAL WO'],
    ];
    data.teamStats.forEach((t: any) => {
      teamRows.push([t.name.toUpperCase(), t.pasang, t.cuti, t.putus, t.up, t.down,
        t.pasang + t.cuti + t.putus + t.up + t.down]);
    });
    const wb = utils.book_new();
    const wsSummary = utils.aoa_to_sheet(summaryRows);
    const wsTeam    = utils.aoa_to_sheet(teamRows);
    wsSummary['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 20 }];
    wsTeam['!cols']    = [{ wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 15 }];
    utils.book_append_sheet(wb, wsSummary, 'Ringkasan Umum');
    utils.book_append_sheet(wb, wsTeam,    'Performa Tim');
    writeFile(wb, `Monthly_Report_${periodLabel}.xlsx`);
  };

  // ── Export PDF — BUG-07 fix: bukan window.print() semua halaman ──
  const exportToPdf = () => {
    if (!data) return;
    const { counts, teamStats } = data;
    const periodLabel = formatPeriod(selectedMonth);
    const total = counts.berlangganan + counts.sementara + counts.berhenti + counts.upgrade + counts.downgrade;
    const teamRows = teamStats.map((t: any) => `
      <tr>
        <td>${t.name.toUpperCase()}</td>
        <td style="text-align:center;color:#10b981">${t.pasang}</td>
        <td style="text-align:center;color:#f59e0b">${t.cuti}</td>
        <td style="text-align:center;color:#ef4444">${t.putus}</td>
        <td style="text-align:center;color:#3b82f6">${t.up}</td>
        <td style="text-align:center;color:#f43f5e">${t.down}</td>
        <td style="text-align:center;font-weight:700">${t.pasang + t.cuti + t.putus + t.up + t.down}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <title>Monthly Report ${periodLabel}</title>
      <style>
        body{font-family:sans-serif;padding:24px;color:#1e293b;font-size:13px}
        h1{font-size:18px;font-weight:bold;margin-bottom:4px}
        .period{color:#64748b;font-size:12px;margin-bottom:20px}
        .grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:20px}
        .card{border:1px solid #e2e8f0;border-radius:10px;padding:10px;text-align:center}
        .card .label{font-size:10px;text-transform:uppercase;font-weight:700;color:#64748b;margin-bottom:4px}
        .card .value{font-size:22px;font-weight:800}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th{background:#f8fafc;border:1px solid #e2e8f0;padding:7px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b}
        td{border:1px solid #e2e8f0;padding:7px 10px}
        h2{font-size:14px;font-weight:700;margin:18px 0 8px}
        @media print{body{padding:12px}}
      </style>
    </head><body>
      <h1>Laporan Ringkasan Bulanan</h1>
      <p class="period">Periode: ${periodLabel} &nbsp;|&nbsp; Total WO: ${total}</p>
      <div class="grid">
        <div class="card"><div class="label">Berlangganan</div><div class="value" style="color:#10b981">${counts.berlangganan}</div></div>
        <div class="card"><div class="label">Berhenti Smtr</div><div class="value" style="color:#f59e0b">${counts.sementara}</div></div>
        <div class="card"><div class="label">Berhenti</div><div class="value" style="color:#ef4444">${counts.berhenti}</div></div>
        <div class="card"><div class="label">Upgrade</div><div class="value" style="color:#3b82f6">${counts.upgrade}</div></div>
        <div class="card"><div class="label">Downgrade</div><div class="value" style="color:#f43f5e">${counts.downgrade}</div></div>
      </div>
      <h2>Performa Tim</h2>
      <table>
        <thead><tr><th>Tim</th><th>Pasang</th><th>Cuti</th><th>Putus</th><th>Upgrade</th><th>Downgrade</th><th>Total WO</th></tr></thead>
        <tbody>${teamRows}</tbody>
      </table>
    </body></html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { alert('Popup diblokir. Izinkan popup untuk melanjutkan.'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  useImperativeHandle(ref, () => ({
    handleExport:    exportToExcel,
    handlePdfExport: exportToPdf,
  }));

  // ── Fetch data summary ────────────────────────────────────
  useEffect(() => {
    async function getSummary() {
      if (!selectedMonth) return;
      setLoading(true);

      // BUG-05 rev2: TANGGAL tersimpan sebagai teks Indonesia ("Rabu, 27 April 2026")
      // sehingga query ISO gte/lt tidak cocok — gunakan ilike dengan nama bulan Indonesia
      const [year, month] = selectedMonth.split('-');
      const bulan = BULAN_ID[parseInt(month, 10) - 1]; // "April"
      const monthPattern = `%${bulan} ${year}%`;        // "%April 2026%"

      const categories = [
        { key: 'pasang', table: 'Berlangganan 2026' },
        { key: 'putus',  table: 'Berhenti Berlangganan 2026' },
        { key: 'cuti',   table: 'Berhenti Sementara 2026' },
        { key: 'up',     table: 'Upgrade 2026' },
        { key: 'down',   table: 'Downgrade 2026' },
      ];

      const results = await Promise.all(
        categories.map(cat =>
          supabase.from(cat.table).select('*').ilike('TANGGAL', monthPattern)
        )
      );

      const [pasang, putus, cuti, up, down] = results.map(r => r.data || []);

      // FITUR-08: gunakan daftar tim dinamis dari state `teams`
      setData({
        counts: {
          berlangganan: pasang.length,
          sementara:    cuti.length,
          berhenti:     putus.length,
          upgrade:      up.length,
          downgrade:    down.length,
        },
        teamStats: teams.map(t => ({
          name:  t,
          pasang: pasang.filter((d: any) => d.TEAM?.toLowerCase().includes(t.toLowerCase())).length,
          putus:  putus.filter((d: any) => d.TEAM?.toLowerCase().includes(t.toLowerCase())).length,
          cuti:   cuti.filter((d: any) => d.TEAM?.toLowerCase().includes(t.toLowerCase())).length,
          up:     up.filter((d: any) => d.TEAM?.toLowerCase().includes(t.toLowerCase())).length,
          down:   down.filter((d: any) => d.TEAM?.toLowerCase().includes(t.toLowerCase())).length,
        })),
      });
      setLoading(false);
    }
    getSummary();
  }, [selectedMonth, supabase, teams]);

  if (loading || !data) {
    return <div className="p-10 text-center font-bold text-slate-400">Mengolah Data Summary...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

      {/* Donut Status Berlangganan */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h4 className="font-bold text-slate-700 mb-4 text-center">Status Berlangganan</h4>
        <ReactApexChart
          type="donut"
          height={300}
          series={[data.counts.berlangganan, data.counts.sementara, data.counts.berhenti]}
          options={{
            labels: ['Berlangganan', 'Berhenti Sementara', 'Berhenti Berlangganan'],
            colors: ['#10b981', '#f59e0b', '#ef4444'],
            legend: { position: 'bottom' },
            tooltip: {
              custom: ({ series, seriesIndex, w }: any) =>
                mkTipSlice(w.globals.labels[seriesIndex], w.globals.colors[seriesIndex], series[seriesIndex])
            },
          }}
        />
      </div>

      {/* Pie Upgrade & Downgrade */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h4 className="font-bold text-slate-700 mb-4 text-center">Upgrade &amp; Downgrade</h4>
        <ReactApexChart
          type="pie"
          height={300}
          series={[data.counts.upgrade, data.counts.downgrade]}
          options={{
            labels: ['Upgrade', 'Downgrade'],
            colors: ['#3b82f6', '#f43f5e'],
            legend: { position: 'bottom' },
            tooltip: {
              custom: ({ series, seriesIndex, w }: any) =>
                mkTipSlice(w.globals.labels[seriesIndex], w.globals.colors[seriesIndex], series[seriesIndex])
            },
          }}
        />
      </div>

      {/* Bar Aktivasi Per Team */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h4 className="font-bold text-slate-700 mb-4 text-center">Aktivasi Per Team</h4>
        <ReactApexChart
          type="bar"
          height={350}
          series={[
            { name: 'Berlangganan',         data: data.teamStats.map((t: any) => t.pasang) },
            { name: 'Berhenti Sementara',   data: data.teamStats.map((t: any) => t.cuti) },
            { name: 'Berhenti Berlangganan',data: data.teamStats.map((t: any) => t.putus) },
            { name: 'Upgrade',              data: data.teamStats.map((t: any) => t.up) },
            { name: 'Downgrade',            data: data.teamStats.map((t: any) => t.down) },
          ]}
          options={{
            chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
            plotOptions: {
              bar: { horizontal: false, columnWidth: '70%', borderRadius: 4,
                dataLabels: { position: 'top' } },
            },
            colors: ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#f43f5e'],
            dataLabels: {
              enabled: true,
              offsetY: -20,
              style: { fontSize: '10px', colors: ['#64748b'] },
            },
            stroke: { show: true, width: 2, colors: ['transparent'] },
            xaxis: {
              categories: data.teamStats.map((t: any) => t.name),
              labels: { style: { fontWeight: 600 } },
            },
            yaxis: { title: { text: 'Total Work Order', style: { color: '#64748b' } } },
            fill: { opacity: 1 },
            legend: { position: 'bottom', horizontalAlign: 'center', fontSize: '12px' },
            tooltip: {
              custom: ({ series, seriesIndex, dataPointIndex, w }: any) =>
                mkTipBar(
                  w.globals.labels[dataPointIndex],
                  series, dataPointIndex,
                  w.globals.colors,
                  w.globals.seriesNames
                )
            },
            grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
          }}
        />
      </div>

    </div>
  );
});

MonthlySummary.displayName = 'MonthlySummary';
export default MonthlySummary;
