import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/context/UserContext";
import { MeetingProvider } from "@/context/MeetingContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/context/ThemeContext";
import GlobalNameSetup from "@/components/layout/GlobalNameSetup";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Zoom",
  description: "Video conferencing for modern teams",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn("h-full", "font-sans", geist.variable)}>
      <body className="min-h-full">
        <ThemeProvider>
          <UserProvider>
            <MeetingProvider>
              <TooltipProvider delay={300}>
                <GlobalNameSetup>{children}</GlobalNameSetup>
              </TooltipProvider>
            </MeetingProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
