import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@scipal/ui', '@scipal/hooks', '@scipal/supabase', '@scipal/types'],
};

export default nextConfig;
