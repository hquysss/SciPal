import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@scipal/ui', '@scipal/hooks', '@scipal/supabase', '@scipal/types'],
  webpack(config) {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.js', '.ts', '.tsx'],
    };
    return config;
  },
};

export default nextConfig;
