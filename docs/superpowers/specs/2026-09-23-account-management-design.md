# SciPal Account Management System — Design Spec

**Date:** 2026-09-23  
**Author:** Antigravity (brainstorming session)  
**Status:** Approved by user — ready for implementation plan

---

## 1. Mục tiêu & Bối cảnh

Xây dựng hệ thống quản lý tài khoản cho SciPal, mô hình theo Katha (`D:\Code\Katha\frontend\src\features\accounts`), gồm hai phần:

1. **Admin Dashboard** (`/admin/accounts`) — Admin tạo, liệt kê, đổi role và xóa tài khoản người dùng.
2. **Profile Self-Edit** — Người dùng tự chỉnh sửa `display_name` và `avatar_url` ngay từ trang `/profile` hiện có (S8).

### Ràng buộc cốt lõi (Core Invariants — từ AGENTS.md)
- **Server-Authoritative**: `app_role` chỉ được set/đọc bởi backend Fastify qua `SUPABASE_SERVICE_ROLE_KEY`. Client không bao giờ tự ghi role.
- **Secret Isolation**: `SUPABASE_SERVICE_ROLE_KEY` chỉ tồn tại trong `backend/.env`.
- **Bilingual First-Class**: Mọi nội dung UI có cấu trúc `{ en: string, vi: string }` qua `useLanguage()`.
- **No Hard-coded Subject Colors**: Không áp dụng trực tiếp ở đây, nhưng accent đọc từ `--accent`.

---

## 2. Lưu trữ Role Admin

**Lựa chọn:** Supabase `auth.users.app_metadata.app_role`

```json
// app_metadata (set bởi Supabase Admin API, không thể bị user tự sửa)
{
  "app_role": "admin" | "student" | "teacher"
}
```

**Lý do:**
- `app_metadata` chỉ có thể ghi qua `service_role` key — không thể bị client tamper.
- JWT claim `app_metadata.app_role` có sẵn trong Supabase session phía client để guard check mà không cần round-trip.
- Tách biệt hoàn toàn khỏi `profiles.role` (dành cho logic học tập: student/teacher perspective).

**profiles.role** vẫn giữ nguyên (`student | teacher`) — dùng cho logic hiển thị bài giảng, lớp học. `app_metadata.app_role` là auth-level role cho phân quyền hệ thống.

---

## 3. Kiến trúc Tổng thể

```
┌─────────────────────────────────────────────────┐
│  Frontend (Next.js 15)                          │
│                                                 │
│  /admin/accounts  ←── RequireAdmin guard        │
│  ├── AdminAccountsPage                          │
│  │   ├── CreateAccountForm (left panel)         │
│  │   └── AccountList (right panel)              │
│  │       └── AccountRow (role badge + actions)  │
│  │                                              │
│  /profile (S8 — existing)                       │
│  └── AccountSettings → "Chỉnh sửa hồ sơ" btn   │
│      └── ProfileEditModal (display_name + avatar)│
│                                                 │
│  features/admin/                                │
│  ├── RequireAdmin.tsx     (guard)               │
│  ├── AdminAccountsPage.tsx                      │
│  └── accountsApi.ts       (fetch wrappers)      │
└──────────────────┬──────────────────────────────┘
                   │  fetch (Authorization: Bearer <JWT>)
                   ▼
┌─────────────────────────────────────────────────┐
│  Backend Fastify 4                              │
│                                                 │
│  routes/accounts.ts                             │
│  ├── GET    /api/auth/accounts     (admin only) │
│  ├── POST   /api/auth/accounts     (admin only) │
│  ├── PATCH  /api/auth/accounts/:id/role (admin) │
│  ├── DELETE /api/auth/accounts/:id  (admin)     │
│  └── PATCH  /api/auth/profile       (self)      │
│                                                 │
│  preHandler hook: verifyAdmin()                 │
│  → decode JWT → check app_metadata.app_role     │
└──────────────────┬──────────────────────────────┘
                   │  SUPABASE_SERVICE_ROLE_KEY
                   ▼
┌─────────────────────────────────────────────────┐
│  Supabase Postgres                              │
│  auth.users.app_metadata.app_role               │
│  public.profiles (display_name, avatar_url)     │
└─────────────────────────────────────────────────┘
```

---

## 4. Backend — `routes/accounts.ts`

### 4.1 Auth Middleware

```typescript
// preHandler: verifyAdmin(request, reply)
// 1. Extract Bearer token từ Authorization header
// 2. Gọi supabase.auth.getUser(token) để verify JWT
// 3. Kiểm tra user.app_metadata.app_role === 'admin'
// 4. Nếu không phải admin → reply 403 Forbidden
```

### 4.2 Endpoints

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| `GET` | `/api/auth/accounts` | admin | List tất cả users từ Supabase Admin API |
| `POST` | `/api/auth/accounts` | admin | Tạo user mới với email/password/role |
| `PATCH` | `/api/auth/accounts/:id/role` | admin | Đổi `app_metadata.app_role` |
| `DELETE` | `/api/auth/accounts/:id` | admin | Xóa user (không tự xóa chính mình) |
| `PATCH` | `/api/auth/profile` | self (any auth) | Cập nhật display_name + avatar_url |

### 4.3 Request/Response Shapes

```typescript
// Account (response)
interface Account {
  id: string;
  display_name: string | null;
  email: string | null;
  app_role: 'admin' | 'student' | 'teacher';
  created_at: string | null;
  last_sign_in_at: string | null;
}

// POST /api/auth/accounts (body)
interface CreateAccountInput {
  display_name: string;   // required, non-empty
  email: string;          // required, valid email
  password: string;       // required, min 8 chars
  app_role: 'student' | 'teacher';  // admin không tạo được admin khác
}

// PATCH /api/auth/accounts/:id/role (body)
interface UpdateRoleInput {
  app_role: 'student' | 'teacher';
}

// PATCH /api/auth/profile (body)
interface UpdateProfileInput {
  display_name?: string;
  avatar_url?: string;
}
```

### 4.4 Error Codes

| Status | Reason |
|--------|--------|
| `400` | Dữ liệu không hợp lệ |
| `403` | Không đủ quyền (không phải admin, hoặc tự xóa mình) |
| `404` | User không tồn tại |
| `409` | Email đã tồn tại |
| `503` | Supabase Admin API không khả dụng |

---

## 5. Frontend

### 5.1 `RequireAdmin` Guard

```typescript
// frontend/features/admin/RequireAdmin.tsx
// - Đọc user từ Supabase session
// - Kiểm tra user.app_metadata?.app_role === 'admin'
// - Nếu loading → SciPal loading screen
// - Nếu không phải admin → hiển thị "Access Denied" screen với nút Sign Out
// - Nếu unauthenticated → redirect /login?next=/admin/accounts
```

### 5.2 `AdminAccountsPage`

Layout giống Katha `ReaderAccountsPage.tsx` — 2 cột:
- **Trái (≤ 0.8fr):** Form tạo tài khoản mới
  - Trường: display_name, email, password, confirm_password
  - Role selector: Student | Teacher (radio pill buttons)
  - Submit button với loading state
  - Feedback success/error inline
- **Phải (≥ 1.4fr):** Danh sách tài khoản
  - Header với số lượng + nút refresh
  - Mỗi row: avatar placeholder, display_name, email, role badge, created_at, last_sign_in, nút Đổi role + Xóa
  - Confirm dialog trước khi xóa
  - Loading/error state đầy đủ

**Styling:** Science lab aesthetic — dùng CSS variables `--accent`, bilingual labels qua `useLanguage()`.

### 5.3 `ProfileEditModal`

- Mở từ nút "Chỉnh sửa hồ sơ" trong `AccountSettings.tsx`
- Form: display_name (text input), avatar_url (URL input + live preview)
- Gọi `PATCH /api/auth/profile`
- Sau khi lưu → router.refresh() để hydrate lại `ProfileCard`

### 5.4 `accountsApi.ts`

```typescript
// frontend/features/admin/accountsApi.ts
export function listAccounts(signal?: AbortSignal): Promise<Account[]>
export function createAccount(input: CreateAccountInput): Promise<Account>
export function updateAccountRole(id: string, role: 'student' | 'teacher'): Promise<Account>
export function deleteAccount(id: string): Promise<void>
export function updateSelfProfile(input: UpdateProfileInput): Promise<void>
```

---

## 6. Seed Admin Script

**File:** `backend/scripts/seed-admin.ts`

Chạy một lần bởi developer/admin để gán `app_role: 'admin'` cho account đầu tiên:

```typescript
// Usage: pnpm --filter @scipal/api tsx scripts/seed-admin.ts <user_id_hoac_email>
// Dùng SUPABASE_SERVICE_ROLE_KEY để gọi Admin API
// updateUserById({ app_metadata: { app_role: 'admin' } })
```

Không seed trong migration SQL — email admin là thông tin nhạy cảm.

---

## 7. NavBar Integration

Thêm link "Quản lý TK" vào `NavBar.tsx` chỉ hiển thị khi `app_role === 'admin'`:

```tsx
{user?.app_metadata?.app_role === 'admin' && (
  <Link href="/admin/accounts">Quản lý TK</Link>
)}
```

---

## 8. Test Strategy

### Unit Tests (Vitest)
- `backend/src/routes/accounts.test.ts` — mock Supabase Admin API, test tất cả error codes
- `frontend/features/admin/AdminAccountsPage.test.tsx` — render với mock data, form validation
- `frontend/features/admin/RequireAdmin.test.tsx` — guard redirect/access denied behavior

### Build Verification
- `pnpm typecheck` — 0 TypeScript errors
- `pnpm test` — tất cả unit tests pass
- `pnpm build` (frontend) — Next.js build thành công với route mới

---

## 9. Files Affected

### Mới hoàn toàn
- `backend/src/routes/accounts.ts`
- `backend/scripts/seed-admin.ts`
- `frontend/app/admin/accounts/page.tsx`
- `frontend/features/admin/RequireAdmin.tsx`
- `frontend/features/admin/AdminAccountsPage.tsx`
- `frontend/features/admin/accountsApi.ts`
- `frontend/features/profile/ProfileEditModal.tsx`

### Cập nhật
- `backend/src/index.ts` — register `accountsRoutes`
- `frontend/features/profile/AccountSettings.tsx` — thêm nút "Chỉnh sửa hồ sơ"
- `frontend/components/nav/NavBar.tsx` — thêm admin nav link conditional
- `PROJECT_STATE.md` — cập nhật current task

### Không thay đổi
- Supabase migrations (không cần SQL mới — app_metadata có sẵn)
- `packages/` — không cần thay đổi shared packages
- Tất cả 12 màn hình hiện tại (S1–S12) — không bị ảnh hưởng
