import "./globals.css";

export const metadata = {
  title: "Carnet de voyage — Mexique & Amérique centrale",
  description: "100 jours de voyage, un jour à la fois.",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#1E2340",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
