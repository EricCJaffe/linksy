/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Security headers
  async headers() {
    const sharedCspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https: *.supabase.co",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-src 'self' https://www.openstreetmap.org",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ]

    return [
      // Global headers — applied to all routes
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          {
            key: 'Content-Security-Policy',
            value: [...sharedCspDirectives, "frame-ancestors 'self'"].join('; '),
          },
        ],
      },
      // Widget embed pages — allow cross-origin iframe embedding by any host
      // CSP frame-ancestors takes priority over X-Frame-Options in all modern browsers.
      // The X-Frame-Options override below signals intent; CSP is the enforced policy.
      {
        source: '/find-help/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          {
            key: 'Content-Security-Policy',
            value: [...sharedCspDirectives, 'frame-ancestors *'].join('; '),
          },
        ],
      },
    ]
  },

  // Environment variable validation
  async rewrites() {
    // Validate required environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
    ]

    const missingEnvVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    )

    if (missingEnvVars.length > 0 && process.env.NODE_ENV !== 'test') {
      console.warn(
        '\x1b[33m%s\x1b[0m',
        '⚠️  Warning: Missing required environment variables:'
      )
      missingEnvVars.forEach((varName) => {
        console.warn('\x1b[33m%s\x1b[0m', `   - ${varName}`)
      })
      console.warn(
        '\x1b[33m%s\x1b[0m',
        '   Copy .env.example to .env.local and fill in the values.\n'
      )
    }

    return []
  },

  // TypeScript and ESLint configuration
  typescript: {
    // Re-enabled after fixing async/await type errors
    ignoreBuildErrors: false,
  },
  eslint: {
    // Set to true to allow production builds with ESLint errors (not recommended)
    ignoreDuringBuilds: false,
  },

  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Add any custom webpack config here
    if (!isServer) {
      // Don't resolve 'fs' module on the client to prevent errors
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    return config
  },

  // Output configuration for deployment
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,

  // Disable powered by header
  poweredByHeader: false,

  // Compression
  compress: true,

  // Production source maps (set to false to reduce bundle size)
  productionBrowserSourceMaps: false,

  // React strict mode
  reactStrictMode: true,

  // SWC minification (faster than Terser)
  swcMinify: true,
}

module.exports = nextConfig
