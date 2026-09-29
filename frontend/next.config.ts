import type { NextConfig } from 'next';

// Sent on every page. Only frame-ancestors from CSP: a full script/style policy would need to
// account for the inline theme boot script, KaTeX and the simulation embeds.
const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  transpilePackages: ['@scipal/ui', '@scipal/hooks', '@scipal/supabase', '@scipal/types'],
  // Exam authoring moved under Thi thử (/exam/manage); old links keep working.
  async redirects() {
    return [
      { source: '/teacher/exams', destination: '/exam/manage', permanent: true },
      { source: '/teacher/exams/:path*', destination: '/exam/manage/:path*', permanent: true },
    ];
  },
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
  webpack(config) {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.js', '.ts', '.tsx'],
    };
    return config;
  },
};

export default nextConfig;
