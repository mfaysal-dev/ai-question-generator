import type { Metadata } from "next";
import { Figtree, Fraunces } from "next/font/google";
import "./globals.css";

const sans = Figtree({
  subsets: ["latin"],
  variable: "--font-sans",
});

const heading = Fraunces({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "Quizwright — AI question generator",
  description:
    "Write multiple-choice questions for a class. Set the topic, difficulty, length, and student level.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${heading.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
