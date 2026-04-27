/**
 * src/services/profile.service.ts
 *
 * Service gọi API lấy và cập nhật thông tin profile của user đang đăng nhập.
 * Endpoints:
 *   GET  /api/v1/users/me          → lấy profile
 *   PUT  /api/v1/users/me          → cập nhật fullName, phone, email
 *   PUT  /api/v1/users/me/avatar   → cập nhật avatar (upload base64 hoặc URL)
 */

import axios from 'axios';
import { Config } from '../config'; // ← dùng Config thay vì import rải rác
import { tokenManager } from './token-manager';

// Config.API_V1 = "http://192.168.1.120/api/v1"  (đã đúng, không cộng thêm /api nữa)
const API_V1 = Config.API_V1;

function authHeaders() {
  const token = tokenManager.getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface UserProfile {
  _id: string;
  username: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  role: string;
  businessType: string[];
  shopSetupDone: boolean;
  createdAt?: string;
}

export interface UpdateProfileDto {
  fullName: string;
  phone?: string;
  email?: string;
}

// ── GET /api/v1/users/me ──────────────────────────────────────────────────────
export async function getMyProfile(): Promise<UserProfile> {
  const res = await axios.get(`${API_V1}/users/me`, {
    headers: authHeaders(),
    timeout: 15000,
  });
  return res.data.user as UserProfile;
}

// ── PUT /api/v1/users/me ──────────────────────────────────────────────────────
export async function updateMyProfile(dto: UpdateProfileDto): Promise<UserProfile> {
  const res = await axios.put(`${API_V1}/users/me`, dto, {
    headers: authHeaders(),
    timeout: 15000,
  });
  return res.data.user as UserProfile;
}

// ── PUT /api/v1/users/me/avatar ───────────────────────────────────────────────
export async function updateAvatar(avatarUrl: string): Promise<UserProfile> {
  const res = await axios.put(
    `${API_V1}/users/me/avatar`,
    { avatarUrl },
    { headers: authHeaders(), timeout: 15000 },
  );
  return res.data.user as UserProfile;
}