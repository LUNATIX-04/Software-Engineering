import type { Metadata } from "next"
import { Fredoka } from "next/font/google"
import "./globals.css"
import AppShell from "@/components/layout/AppShell"

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "ASAP - Student Event Planner",
  description: "Student Event Planner",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${fredoka.className} antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
