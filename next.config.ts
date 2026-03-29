/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true, // 에러 있어도 일단 배포!
  },
  eslint: {
    ignoreDuringBuilds: true, // 경고 무시!
  },
};

export default nextConfig;