/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { webpack }) => {
    // quicktype-core references Node's NodeIO (node:fs etc.) which we never use
    // in the browser. Rewrite the `node:` scheme and stub the modules out.
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
        resource.request = resource.request.replace(/^node:/, "");
      }),
    );
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      os: false,
      path: false,
      stream: false,
    };
    return config;
  },
};

export default nextConfig;
