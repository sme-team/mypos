declare module '@env' {
  /** URL Backend API (NestJS). VD: http://192.168.1.103:3001 */
  export const AUTH_API_BASE: string;
  /** URL Web App (Next.js). Dùng để mở change-password trong browser. VD: http://192.168.1.103:3000 */
  export const WEB_BASE_URL: string;

  export  const WEB_LANDING_URL : string;
}
