/** @type {import('next').NextConfig} */
const nextConfig = {
  // Silence warnings
  // https://github.com/WalletConnect/walletconnect-monorepo/issues/1908
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    
    config.externals.push("pino-pretty", "lokijs", "encoding");

    // Configure web worker handling
    config.module.rules.push({
      test: /-worker\.(js|ts)$/,
      use: [
        {
          loader: 'worker-loader',
          options: {
            filename: 'static/[hash].worker.js',
            publicPath: '/_next/',
          },
        },
      ],
    });

    return config;
  },
};

export default nextConfig;
