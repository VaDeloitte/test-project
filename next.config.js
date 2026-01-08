// next.config.js
const path = require('path');
// const { i18n } = require('./next-i18next.config');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // i18n,
  // Ensure proper runtime behavior for i18next (prevents edge fs errors)
  output: 'standalone', // optional: better for production builds

  webpack(config, { isServer }) {
    // 
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname, '.'),
      '@components': path.resolve(__dirname, 'components'),
      '@utils': path.resolve(__dirname, 'utils'),
      '@services': path.resolve(__dirname, 'services'),
      '@context': path.resolve(__dirname, 'context'),
      '@types': path.resolve(__dirname, 'types'),
      '@hooks': path.resolve(__dirname, 'hooks'),
      '@store': path.resolve(__dirname, 'store'),
    };

    // ✅ Keep existing experiments (fine)
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // ✅ Add rule for SVG imports
    config.module.rules.push({
      test: /\.svg$/,
      issuer: /\.[jt]sx?$/,
      use: ['@svgr/webpack'],
    });

    // ✅ Only include next-i18next server-side
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        os: false,
      };
    }

    return config;
  },
};

module.exports = nextConfig;
