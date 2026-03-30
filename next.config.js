// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
    unoptimized: false,
  },
  // Ensure static files are served correctly
  trailingSlash: false,
  // Enable static optimization
  output: 'standalone',
  // Transpile design system (exports raw TS/TSX)
  transpilePackages: ['@challengerco/challenger-fitness-design-system'],
};

module.exports = nextConfig;
