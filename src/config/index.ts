import { AUTH_API_BASE, WEB_BASE_URL, WEB_LANDING_URL } from '@env';

// ─── Tất cả URL của app lấy từ đây ──────────────────────────────────────────
// Để đổi IP: chỉ sửa file .env, KHÔNG sửa code
//
// .env example:
//   AUTH_API_BASE=http://192.168.1.120/api
//   WEB_BASE_URL=http://192.168.1.120
//   WEB_LANDING_URL=http://192.168.1.120
// ─────────────────────────────────────────────────────────────────────────────

const _API_BASE    = AUTH_API_BASE   ?? 'http://192.168.1.120/api';
const _WEB_BASE    = WEB_BASE_URL    ?? 'http://192.168.1.120';
const _WEB_LANDING = WEB_LANDING_URL ?? 'http://192.168.1.120';

export const Config = {
  /** Base URL của Backend API — đã bao gồm /api  */
  API_BASE:    _API_BASE,

  /** API có version /v1  (ví dụ: /api/v1/users/me) */
  API_V1:      `${_API_BASE}/v1`,

  /** Web App (Next.js) — dùng cho change-password, register... */
  WEB_BASE:    _WEB_BASE,

  /** Landing Page */
  WEB_LANDING: _WEB_LANDING,
} as const;
