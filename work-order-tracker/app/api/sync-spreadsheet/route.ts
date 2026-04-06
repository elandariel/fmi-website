import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { tableTarget, sheetName, spreadsheetId, googleScriptUrl } = await req.json();

    // 1. Ambil data terbaru dari Supabase
    const { data: dbData, error } = await supabase
      .from(tableTarget)
      .select('*', { count: 'exact' })
      .order('id', { ascending: true })
      .range(0, 5000);

    if (error) throw error;

    // 2. Kirim data ke Google Apps Script Central Gateway
    const response = await fetch(googleScriptUrl, {
      method: 'POST',
      body: JSON.stringify({
        spreadsheetId: spreadsheetId,
        sheetName: sheetName, // Ini akan mengirim "2026" untuk Report Bulanan
        rows: dbData
      }),
    });

    const result = await response.text();
    if (!response.ok || result.includes("Error")) {
      throw new Error(result || "Gagal mengirim data ke Google Sheets");
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("API Route Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}