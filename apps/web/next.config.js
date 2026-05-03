/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@disease-prediction/shared"],
};

module.exports = nextConfig;
