// Sign-up and sign-in helpers shared by the login page and /auth/callback. Self-made accounts are
// always students: handle_new_user gives every new profile the student role, and the app role
// lives in app_metadata, which only the server can set.

export type Bilingual = { vi: string; en: string };

export const PASSWORD_MIN = 8;

/** A path on this site to return to after signing in; anything else goes home. */
export function safeRedirect(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  // Going back to the sign-in page or the callback would loop.
  if (/^\/(login|auth)(\/|\?|$)/.test(value)) return '/';
  return value;
}

/** Where Supabase sends the browser after Google or the confirmation e-mail. */
export function callbackUrl(origin: string, redirect: string | null | undefined): string {
  return `${origin}/auth/callback?redirect=${encodeURIComponent(safeRedirect(redirect))}`;
}

export type AuthSettings = { google: boolean; signupOpen: boolean };

/** The public GoTrue /auth/v1/settings answer: which providers are switched on. */
export function readAuthSettings(body: unknown): AuthSettings | null {
  if (!body || typeof body !== 'object') return null;
  const { external, disable_signup } = body as { external?: unknown; disable_signup?: unknown };
  if (!external || typeof external !== 'object') return null;
  const on = external as Record<string, unknown>;
  return { google: on.google === true, signupOpen: disable_signup !== true };
}

export type SignUpFields = { name: string; email: string; password: string; confirm: string };
export type SignUpErrors = Partial<Record<keyof SignUpFields, Bilingual>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSignUp({ name, email, password, confirm }: SignUpFields): SignUpErrors {
  const errors: SignUpErrors = {};
  if (!name.trim()) errors.name = { vi: 'Nhập họ tên của bạn.', en: 'Enter your name.' };
  if (!EMAIL.test(email.trim())) errors.email = { vi: 'Email chưa hợp lệ (vd: name@gmail.com).', en: 'Invalid email (e.g. name@gmail.com).' };
  if (password.length < PASSWORD_MIN) {
    errors.password = { vi: `Mật khẩu cần ít nhất ${PASSWORD_MIN} ký tự.`, en: `Use at least ${PASSWORD_MIN} characters.` };
  }
  if (confirm !== password) errors.confirm = { vi: 'Mật khẩu nhập lại không khớp.', en: 'The passwords do not match.' };
  return errors;
}

export function authErrorText(message: string, status?: number, code?: string): Bilingual {
  if (/already registered|already been registered|user_already_exists/i.test(`${message} ${code ?? ''}`)) {
    return { vi: 'Email này đã có tài khoản. Hãy đăng nhập hoặc dùng email khác.', en: 'This email already has an account. Sign in or use another email.' };
  }
  if (code === 'weak_password' || /password should|weak password/i.test(message)) {
    return { vi: `Mật khẩu quá yếu. Dùng ít nhất ${PASSWORD_MIN} ký tự, trộn chữ và số.`, en: `Password too weak. Use at least ${PASSWORD_MIN} characters with letters and numbers.` };
  }
  // SIGNUP_CLOSED: the admin closed sign-up (site_settings); the auth server reports it as a database error.
  if (/signups? not allowed|signup.*disabled|SIGNUP_CLOSED|database error saving new user/i.test(message)) {
    return { vi: 'SciPal đang tạm đóng đăng ký mới. Bạn quay lại sau nhé.', en: 'SciPal is not taking new sign-ups right now. Please come back later.' };
  }
  if (status === 429 || /rate limit/i.test(message)) {
    return { vi: 'Bạn thao tác quá nhanh. Thử lại sau ít phút nhé.', en: 'Too many attempts. Please try again in a few minutes.' };
  }
  if (/failed to fetch|fetch failed|network/i.test(message)) {
    return { vi: 'Không kết nối được. Kiểm tra mạng rồi thử lại nhé.', en: 'Cannot connect. Please check your connection and try again.' };
  }
  return { vi: `Chưa tạo được tài khoản: ${message}`, en: `Could not create the account: ${message}` };
}
