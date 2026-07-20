import type { NextConfig } from "next";
import path from "path";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const apiPrefixes = [
  'items',
  'auth',
  'custom-fields',
  'batches',
  'categories',
  'tags',
  'logs',
  'pull-out-requests',
  'internal-requests',
  'staff-inventory',
  'products',
  'locations',
  'users',
  'reports',
  'stock-notifications',
  'budget-requests',
  'rsq',
  'system-analytics',
];

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async rewrites() {
    return apiPrefixes.flatMap((prefix) => [
      {
        source: `/${prefix}`,
        destination: `${API_URL}/${prefix}`,
      },
      {
        source: `/${prefix}/:path*`,
        destination: `${API_URL}/${prefix}/:path*`,
      },
    ]);
  },
};

export default nextConfig;


