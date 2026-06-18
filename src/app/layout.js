import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LiveChatBubble from "@/components/LiveChatBubble";
import GoogleAnalytics from "@/components/GoogleAnalytics";

export const metadata = {
  metadataBase: new URL("https://huurhunclothes.com"),
  title: {
    default: "huurhun_clothes — Хөөрхөн загварын дэлгүүр",
    template: "%s | huurhun_clothes",
  },
  description: "Манай хөөрхөн дэлгүүрийн албан ёсны вэбсайтад тавтай морилно уу. Загварлаг, чанартай хувцас + хурдан хүргэлт.",
  keywords: ["хувцас", "гутал", "пүүз", "загвар", "online shop", "huurhun_clothes", "Mongolia"],
  authors: [{ name: "huurhun_clothes" }],
  creator: "huurhun_clothes",
  publisher: "huurhun_clothes",
  icons: {
    icon: [
      { url: "/logo.jpg", type: "image/jpeg" },
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/logo.jpg",
    apple: [
      { url: "/apple-touch-icon.png" },
      { url: "/logo.jpg", sizes: "180x180", type: "image/jpeg" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "mn_MN",
    url: "https://huurhunclothes.com",
    title: "huurhun_clothes — Хөөрхөн загварын дэлгүүр",
    description: "Манай хөөрхөн дэлгүүрийн албан ёсны вэбсайтад тавтай морилно уу.",
    siteName: "huurhun_clothes",
    images: [
      {
        url: "/logo.jpg",
        width: 512,
        height: 512,
        alt: "huurhun_clothes",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "huurhun_clothes",
    description: "Манай хөөрхөн дэлгүүрийн албан ёсны вэбсайтад тавтай морилно уу.",
    images: ["/logo.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  verification: {
    // Google Search Console тохируулсны дараа энд token нэмж болно
    // google: "your-verification-token",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="mn">
      <head>
        <link rel="icon" type="image/jpeg" href="/logo.jpg" />
        <link rel="shortcut icon" type="image/jpeg" href="/logo.jpg" />
        <link rel="apple-touch-icon" href="/logo.jpg" />
      </head>
      <body className="font-sans min-h-screen flex flex-col">
        <FavoritesProvider>
          <CartProvider>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
            <LiveChatBubble />
          </CartProvider>
        </FavoritesProvider>
        <GoogleAnalytics />
      </body>
    </html>
  );
}
