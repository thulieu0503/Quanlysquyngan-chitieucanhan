/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build gọn nhẹ cho Docker: chỉ copy .next/standalone vào image runtime.
  output: "standalone",
};

export default nextConfig;
