import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@electric-sql/pglite'],
  images: { unoptimized: true },
}

export default nextConfig
