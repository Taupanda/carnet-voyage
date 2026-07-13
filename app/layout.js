import "./globals.css";
import Nav from "./Nav";
import AuthProvider from "./AuthProvider";

export const metadata = {
  title: "Carnet de voyage — Mexique & Amérique centrale",
  description: "Un voyage en solo, raconté un jour à la fois.",
  manifest: "/manifest.json",
};

export const viewport = { themeColor: "#16111C" };

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Figtree:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        <AuthProvider>
          <Nav />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
