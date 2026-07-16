import "./globals.css";
import Nav from "./Nav";
import AuthProvider from "./AuthProvider";
import ProfileRedirect from "./ProfileRedirect";

export const metadata = {
  title: "Carnet de voyage — Mexique & Amérique centrale",
  description: "Un voyage en solo, raconté un jour à la fois.",
  manifest: "/manifest.json",
};

export const viewport = { themeColor: "#F5F0E8" };

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Figtree:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        <AuthProvider>
          <div className="shell">
            <Nav />
            <div className="shell-main">{children}</div>
          </div>
          <ProfileRedirect />
        </AuthProvider>
      </body>
    </html>
  );
}
