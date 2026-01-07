/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Note: 'standalone' output has issues with static file serving in Next.js 15
  // Use 'npm run start' for production instead of standalone server
  // output:'standalone'
}

module.exports = nextConfig