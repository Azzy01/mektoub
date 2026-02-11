import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@electric-sql/pglite'],
  output: 'export',
  images: { unoptimized: true },
}

export default nextConfig
