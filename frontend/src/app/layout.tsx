import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/context/UserContext";
import { MeetingProvider } from "@/context/MeetingContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Zoom",
  description: "Video conferencing for modern teams",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn("h-full", "font-sans", geist.variable)}>
      <body className={`${inter.className} min-h-full`}>
        <UserProvider>
          <MeetingProvider>
            <TooltipProvider delay={300}>{children}</TooltipProvider>
          </MeetingProvider>
        </UserProvider>
      </body>
    </html>
  );
}
