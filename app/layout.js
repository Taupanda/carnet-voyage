import "./globals.css";

export const metadata = {
  title: "Carnet de voyage — Mexique & Amérique centrale",
  description: "100 jours de voyage, un jour à la fois.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
