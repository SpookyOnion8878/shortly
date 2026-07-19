/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // `node:sqlite` is not used; we rely on a pluggable store (file system or Redis).
  // Setting `output: "standalone"` produces a smaller, self-contained server build
  // which is convenient for Docker / self-hosting.
  output: "standalone",
  experimental: {
    // Allow server actions / route handlers to run on the Node runtime by default.
    serverActions: {
      bodySizeLimit: "1mb"
    }
  }
};

export default nextConfig;
