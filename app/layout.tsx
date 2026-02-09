import type React from "react"
import type { Metadata } from "next"
// import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { URQLProvider } from "@/lib/providers/urql-provider"
import { AuthProvider } from "@/lib/providers/auth-provider"
import { Toaster } from "@/components/ui/toaster"
import { ErrorBoundary } from "@/components/error-boundary"
import { AblyProvider } from "@/hooks/use-ably-chat"
import { RealTimeManager } from "@/components/real-time-manager"
import { LayoutWrapper } from "@/components/layout-wrapper"

// const _geist = Geist({ 
//   subsets: ["latin"],
//   display: "swap",
//   fallback: ["system-ui", "arial"]
// })
// const _geistMono = Geist_Mono({ 
//   subsets: ["latin"],
//   display: "swap",
//   fallback: ["monospace"]
// })

export const metadata: Metadata = {
  title: "BidForge - Construction Bid Management Platform",
  description:
    "Connect general contractors with qualified subcontractors. Streamline RFPs, compare bids in real-time, and award contracts with confidence.",
  generator: "v0.app",
  manifest: "/manifest.json",
  icons: {
    icon: [
      {
        url: "/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/favicon-96x96.png",
        sizes: "96x96",
        type: "image/png",
      },
      {
        url: "/favicon.ico",
        type: "image/x-icon",
      },
    ],
    apple: [
      {
        url: "/apple-icon-180x180.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        url: "/apple-icon-152x152.png",
        sizes: "152x152",
        type: "image/png",
      },
      {
        url: "/apple-icon-144x144.png",
        sizes: "144x144",
        type: "image/png",
      },
      {
        url: "/apple-icon-120x120.png",
        sizes: "120x120",
        type: "image/png",
      },
    ],
    other: [
      {
        rel: "android-chrome",
        url: "/android-icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <ErrorBoundary>
          <LayoutWrapper>
            <URQLProvider>{children}</URQLProvider>
          </LayoutWrapper>
          <Toaster />
          <Analytics />
        </ErrorBoundary>
      </body>
    </html>
  )
}
