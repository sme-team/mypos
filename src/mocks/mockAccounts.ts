/**
 * src/mocks/mockAccounts.ts
 *
 * Tài khoản giả lập – dùng để đăng nhập OFFLINE, không cần kết nối BE.
 *
 * ┌─────────────────┬──────────────┬────────────────────────────┐
 * │ Username        │ Password     │ BusinessType               │
 * ├─────────────────┼──────────────┼────────────────────────────┤
 * │ demo_sale       │ demo123      │ sale (POS bán hàng)        │
 * │ demo_hotel      │ demo123      │ accommodation (Lưu trú)    │
 * │ demo_both       │ demo123      │ sale + accommodation       │
 * └─────────────────┴──────────────┴────────────────────────────┘
 *
 * JWT được tạo sẵn với exp = 9999999999 (không hết hạn).
 * Vì app chỉ dùng decodeJwt() để đọc claims (không verify chữ ký),
 * các token này hoạt động hoàn toàn bình thường.
 */

export interface MockAccount {
  username: string;
  password: string;
  /** JWT đã encode sẵn, chứa đầy đủ claims */
  accessToken: string;
  /** Mô tả ngắn để dễ nhận biết */
  description: string;
}

/**
 * JWT payload cho từng account (để tham khảo):
 *
 * demo_sale:
 *   { sub, username, role: "owner", shopId: "shop-001",
 *     businessTypes: "sale", shopSetupDone: true }
 *
 * demo_hotel:
 *   { sub, username, role: "owner", shopId: "shop-002",
 *     businessTypes: "accommodation", shopSetupDone: true }
 *
 * demo_both:
 *   { sub, username, role: "owner", shopId: "shop-003",
 *     businessTypes: "sale,accommodation", shopSetupDone: true }
 */

export const MOCK_ACCOUNTS: MockAccount[] = [
  {
    username: 'demo_sale',
    password: 'demo123',
    description: 'POS bán hàng (sale only)',
    accessToken:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
      '.eyJzdWIiOiJtb2NrLXVzZXItMDAxIiwidXNlcm5hbWUiOiJkZW1vX3NhbGUiLCJyb2xlIjoib3duZXIiLCJzaG9wSWQiOiJzaG9wLTAwMSIsImJ1c2luZXNzVHlwZXMiOiJzYWxlIiwic2hvcFNldHVwRG9uZSI6dHJ1ZSwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjk5OTk5OTk5OTl9' +
      '.mock_signature_not_verified',
  },
  {
    username: 'demo_hotel',
    password: 'demo123',
    description: 'Lưu trú (accommodation only)',
    accessToken:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
      '.eyJzdWIiOiJtb2NrLXVzZXItMDAyIiwidXNlcm5hbWUiOiJkZW1vX2hvdGVsIiwicm9sZSI6Im93bmVyIiwic2hvcElkIjoic2hvcC0wMDIiLCJidXNpbmVzc1R5cGVzIjoiYWNjb21tb2RhdGlvbiIsInNob3BTZXR1cERvbmUiOnRydWUsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjo5OTk5OTk5OTk5fQ' +
      '.mock_signature_not_verified',
  },
  {
    username: 'demo_both',
    password: 'demo123',
    description: 'POS + Lưu trú (sale & accommodation)',
    accessToken:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
      '.eyJzdWIiOiJtb2NrLXVzZXItMDAzIiwidXNlcm5hbWUiOiJkZW1vX2JvdGgiLCJyb2xlIjoib3duZXIiLCJzaG9wSWQiOiJzaG9wLTAwMyIsImJ1c2luZXNzVHlwZXMiOiJzYWxlLGFjY29tbW9kYXRpb24iLCJzaG9wU2V0dXBEb25lIjp0cnVlLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6OTk5OTk5OTk5OX0' +
      '.mock_signature_not_verified',
  },
];

/**
 * Tra cứu mock account theo username + password.
 * Trả về account nếu khớp, null nếu không tìm thấy.
 */
export function findMockAccount(
  username: string,
  password: string,
): MockAccount | null {
  const u = username.trim().toLowerCase();
  const p = password.trim();
  return (
    MOCK_ACCOUNTS.find(
      a => a.username.toLowerCase() === u && a.password === p,
    ) ?? null
  );
}
