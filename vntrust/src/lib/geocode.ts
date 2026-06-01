// Phase 3 — Geocoding helper qua VietMap Search API
// Trial key của VietMap có Search/Geocode (đã test work)
// Dùng cho:
//   - Batch geocode tất cả DN có diaChi (POST /api/admin/geocode-dn)
//   - Auto geocode khi tạo/update DN với diaChi mới

// Key được expose qua NEXT_PUBLIC_VIETMAP_KEY (cả client + server đọc)
// Server-side cũng có thể dùng VIETMAP_KEY private nếu muốn
const VIETMAP_KEY = process.env.VIETMAP_KEY || process.env.NEXT_PUBLIC_VIETMAP_KEY || '';

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress?: string;
  source: 'vietmap_search' | 'vietmap_place' | 'cache' | 'fallback';
}

/**
 * Geocode 1 address → lat/lng dùng VietMap Search API
 * Returns null nếu không tìm thấy hoặc lỗi
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!VIETMAP_KEY) {
    console.warn('[geocode] VIETMAP_KEY missing');
    return null;
  }
  if (!address || !address.trim()) return null;

  const text = encodeURIComponent(address.trim().slice(0, 200));

  try {
    // Step 1: Search v3 — trả về ref_id + sometimes lat/lng
    const searchUrl = `https://maps.vietmap.vn/api/search/v3?apikey=${VIETMAP_KEY}&text=${text}&size=1`;
    const r = await fetch(searchUrl, {
      signal: AbortSignal.timeout(8000),
      headers: { 'Accept': 'application/json' },
    });
    if (!r.ok) {
      console.warn(`[geocode] Search ${r.status} for "${address.slice(0, 50)}"`);
      return null;
    }
    const data = await r.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const first = data[0];

    // Case A: Search trả thẳng lat/lng (rare)
    if (typeof first.lat === 'number' && typeof first.lng === 'number'
        && !isNaN(first.lat) && !isNaN(first.lng)) {
      return {
        lat: first.lat,
        lng: first.lng,
        formattedAddress: first.display || first.address || first.name,
        source: 'vietmap_search',
      };
    }

    // Case B: Search trả ref_id → gọi /place để lấy coords
    if (first.ref_id) {
      const placeUrl = `https://maps.vietmap.vn/api/place/v3?apikey=${VIETMAP_KEY}&refid=${encodeURIComponent(first.ref_id)}`;
      const r2 = await fetch(placeUrl, {
        signal: AbortSignal.timeout(8000),
        headers: { 'Accept': 'application/json' },
      });
      if (r2.ok) {
        const place = await r2.json();
        const lat = place.lat ?? place.latitude;
        const lng = place.lng ?? place.longitude ?? place.lon;
        if (typeof lat === 'number' && typeof lng === 'number'
            && !isNaN(lat) && !isNaN(lng)) {
          return {
            lat,
            lng,
            formattedAddress: place.display || place.address || place.name || first.display,
            source: 'vietmap_place',
          };
        }
      }
    }

    return null;
  } catch (e: any) {
    console.error('[geocode] error:', e?.message || e);
    return null;
  }
}

/**
 * Geocode batch — chạy tuần tự với delay để tránh rate limit
 * delayMs default 500ms (≈120 calls/min, under most quotas)
 */
export async function geocodeBatch(
  addresses: Array<{ id: string; address: string }>,
  delayMs = 500,
  onProgress?: (done: number, total: number, current?: string) => void
): Promise<Array<{ id: string; result: GeocodeResult | null }>> {
  const results: Array<{ id: string; result: GeocodeResult | null }> = [];
  for (let i = 0; i < addresses.length; i++) {
    const { id, address } = addresses[i];
    const result = await geocodeAddress(address);
    results.push({ id, result });
    if (onProgress) onProgress(i + 1, addresses.length, address);
    // Delay giữa các request (trừ request cuối)
    if (i < addresses.length - 1) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  return results;
}
