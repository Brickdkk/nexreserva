import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NexReserva — Sistema de Agendamiento para Chile",
  description:
    "Automatiza las reservas, reduce inasistencias y gestiona cancelaciones en tiempo real para tu barbería, salón o clínica.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? "https://nexreserva.cl"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-white text-gray-900 font-sans antialiased">{children}</body>
    </html>
  );
}
