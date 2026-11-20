// acme-backend/src/public/constants.ts
//
// Rate limit `GET /public/projects` (fase-3-pelaporan-publikasi.md §2.6,
// master §7.1) — endpoint publik tanpa auth, jadi limitnya lebih longgar
// daripada `/auth/login` (bandingkan `auth/constants.ts`), tapi tetap ada.
export const PUBLIC_THROTTLE_LIMIT = 100;
export const PUBLIC_THROTTLE_TTL_MS = 60_000;
