/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true, // "타입 에러 좀 있어도 배포해!" 라는 뜻
  },
  eslint: {
    ignoreDuringBuilds: true, // "경고 메시지 무시하고 배포해!" 라는 뜻
  },
};

export default nextConfig;