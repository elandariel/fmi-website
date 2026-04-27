import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/geocode?q=<address>
 * Proxy ke Nominatim (OpenStreetMap) — gratis, tanpa API key.
 * Rate limit server-side: dipanggil satu per satu dari komponen klien.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ error: "No query" }, { status: 400 });

  try {
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?q=${encodeURIComponent(q)}` +
      `&format=json&limit=1&countrycodes=id`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":       "NOC-Backbone-Monitor/1.0 (internal-noc-tool)",
        "Accept-Language":  "id",
        "Accept":           "application/json",
      },
      next: { revalidate: 86400 }, // cache 24 jam per query
    });

    if (!res.ok) {
      return NextResponse.json({ lat: null, lon: null, error: `Nominatim ${res.status}` });
    }

    const data = await res.json();
    if (!data.length) return NextResponse.json({ lat: null, lon: null });

    return NextResponse.json({
      lat:          parseFloat(data[0].lat),
      lon:          parseFloat(data[0].lon),
      display_name: data[0].display_name,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
