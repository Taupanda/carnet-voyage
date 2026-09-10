import "./globals.css";
import Nav from "./Nav";
import AuthProvider from "./AuthProvider";
import ModeProvider from "./ModeProvider";
import ProfileRedirect from "./ProfileRedirect";
import ServiceWorkerRegister from "./ServiceWorkerRegister";
import BarreAdmin from "./BarreAdmin";
import ArriveeAdmin from "./ArriveeAdmin";
import SuiviVisites from "./SuiviVisites";

export const metadata = {
  title: "Les aventures de Maxou — Mexique & Amérique centrale",
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
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        <AuthProvider>
          <ModeProvider>
            <div className="shell">
              <Nav />
              <div className="shell-main">
                <BarreAdmin />
                {children}
              </div>
            </div>
            <ArriveeAdmin />
            <SuiviVisites />
            <ProfileRedirect />
            <ServiceWorkerRegister />
          </ModeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
