// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['firebasestorage.googleapis.com'],
    unoptimized: false,
  },
  // Ensure static files are served correctly
  trailingSlash: false,
  // Enable static optimization
  output: 'standalone',
};

module.exports = nextConfig;
