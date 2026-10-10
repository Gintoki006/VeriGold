import { DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["600", "700", "800"],
  display: "swap",
});

export const metadata = {
  title: "VeriGold — Verify Before You Lend",
  description:
    "India's privacy-preserving cross-lender gold loan registry. Check borrower exposure across lenders without seeing their data.",
  openGraph: {
    title: "VeriGold — Verify Before You Lend",
    description:
      "Privacy-preserving cross-lender gold loan registry powered by blockchain, AI risk scoring, and zero-knowledge proofs.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${playfair.variable}`}>
      <body>{children}</body>
    </html>
  );
}
