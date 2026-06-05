/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage-аас зураг үзүүлэхэд зориулсан. <PROJECT> хэсгийг өөрийн project ID-р солино.
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};
export default nextConfig;
