/** @type {import('next').NextConfig} */
const isGithubPages = process.env.GITHUB_PAGES === "1";

const nextConfig = {
  reactStrictMode: true,
  output: "export",
  ...(isGithubPages
    ? {
        basePath: "/lihipdf",
        assetPrefix: "/lihipdf"
      }
    : {})
};

export default nextConfig;
