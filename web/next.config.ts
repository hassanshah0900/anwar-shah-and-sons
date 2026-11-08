import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Also write .next/standalone: a server with only the files it needs, for the Docker image.
  output: 'standalone',
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Product images are served from /media (proxied from the API); site photos live in
    // public/images. Allow only those.
    localPatterns: [
      { pathname: '/media/**', search: '' },
      { pathname: '/images/**', search: '' },
    ],
  },
  experimental: {
    serverActions: {
      // Product images may be up to 5 MB; leave room for multipart overhead.
      bodySizeLimit: '6mb',
    },
  },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
