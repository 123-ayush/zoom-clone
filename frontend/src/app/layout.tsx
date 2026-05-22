import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/context/UserContext";
import { MeetingProvider } from "@/context/MeetingContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Zoom",
  description: "Video conferencing for modern teams",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} min-h-full`}>
        <UserProvider>
          <MeetingProvider>{children}</MeetingProvider>
        </UserProvider>
      </body>
    </html>
  );
}
