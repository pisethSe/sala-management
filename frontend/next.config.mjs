/** @type {import('next').NextConfig} */
// The app is 100% client-side (no API routes, no SSR data fetching), so it
// ships as a fully static site — hosted on a CDN (Render static site), it
// never sleeps and needs no Node server in production.
// The API, Supabase Auth and PostgreSQL do all the server work.
const nextConfig = {
  output: 'export',
  // Each route exports as a directory (out/fees/index.html) so direct loads
  // and refreshes on sub-routes resolve on any static host.
  trailingSlash: true,
};

export default nextConfig;
