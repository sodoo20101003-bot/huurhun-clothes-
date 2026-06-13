import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LiveChatBubble from "@/components/LiveChatBubble";
import GoogleAnalytics from "@/components/GoogleAnalytics";

export const metadata = {
  title: "huurhun_clothes",
  description: "Монгол загварын дэлгүүр",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="mn">
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
