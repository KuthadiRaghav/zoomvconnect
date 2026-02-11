import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@livekit/components-styles";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "ZoomVconnect - Video Conferencing",
    description: "Enterprise video conferencing platform",
};

export const viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark">
            <body className={inter.className}>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
