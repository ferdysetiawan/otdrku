import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "OTDRKU",
  title: {
    default: "OTDRKU | Analisis File SOR",
    template: "%s | OTDRKU",
  },
  description:
    "Buka, visualisasikan, dan analisis file trace Bellcore/Telcordia .SOR langsung di browser.",
  keywords: [
    "OTDR",
    "SOR",
    "Bellcore",
    "Telcordia",
    "analisis serat optik",
    "fiber optic",
  ],
  category: "Utilities",
  icons: {
    icon: "/media/icondark.png",
    apple: "/media/icondark.png",
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "OTDRKU",
    title: "OTDRKU | Analisis File SOR",
    description:
      "Buka, visualisasikan, dan analisis file trace Bellcore/Telcordia .SOR langsung di browser.",
    images: [
      {
        url: "/media/og-image.png",
        width: 1200,
        height: 675,
        alt: "OTDRKU, aplikasi analisis file SOR",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OTDRKU | Analisis File SOR",
    description:
      "Buka, visualisasikan, dan analisis file trace Bellcore/Telcordia .SOR langsung di browser.",
    images: ["/media/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased bg-[#F5F7FA] text-[#1E293B]">
        {children}
      </body>
    </html>
  );
}
