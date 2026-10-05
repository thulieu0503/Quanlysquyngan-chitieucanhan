/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build gọn nhẹ cho Docker: chỉ copy .next/standalone vào image runtime.
  output: "standalone",
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8000";
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
};

export default nextConfig;
