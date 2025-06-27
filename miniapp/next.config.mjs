/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Silence warnings for certain WalletConnect deps
    config.externals.push("pino-pretty", "lokijs", "encoding");

    // Fix build crash on ES module worker
    config.module.rules.push({
      test: /HeartbeatWorker\.js$/,
      type: 'javascript/esm',
    });

    return config;
  },
};

export default nextConfig;
