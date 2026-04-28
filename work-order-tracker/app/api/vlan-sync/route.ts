// VLAN-BUG-02 fix: server-side proxy ke Google Apps Script
// — tidak ada CORS restriction dari server, bisa baca response body
// — client TIDAK pakai mode:'no-cors' lagi

import { NextRequest, NextResponse } from 'next/server';

// URL Google Apps Script (hardcoded per permintaan user — VLAN-BUG-01 skip)
const SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwfOmI847h1PFaaO6FBJ52SLCORyOmIalhkVxcb_W0jYI9J31-jAY03CoQzcZ0DZxDP/exec';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      // Dari server tidak ada CORS — tidak perlu mode:'no-cors'
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(body),
    });

    const text = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Script error ${response.status}: ${text}` },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, data: text });
  } catch (err: any) {
    console.error('[vlan-sync] Proxy error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal error' },
      { status: 500 }
    );
  }
}
