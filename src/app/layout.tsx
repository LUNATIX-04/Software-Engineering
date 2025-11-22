import type { Metadata } from "next"
import { Fredoka } from "next/font/google"
import Script from "next/script"

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          id="asap-theme-init"
          strategy="beforeInteractive"
        >{`(function(){try{var key="asap:theme-preference";var theme=localStorage.getItem(key);var valid=["standard","light","dark","red","blue"];var root=document.documentElement;var body=document.body;if(body)body.setAttribute("data-theme-init","pending");if(theme&&valid.indexOf(theme)!==-1){if(theme==="standard"){if(body)body.removeAttribute("data-theme");root.removeAttribute("data-theme");}else{if(body)body.setAttribute("data-theme",theme);root.setAttribute("data-theme",theme);}root.classList.toggle("dark",theme==="dark");if(body)body.removeAttribute("data-theme-init");}}catch(e){var b=document.body;if(b)b.removeAttribute("data-theme-init");}})();`}</Script>
      </head>
      <body
        className={`${fredoka.className} antialiased overflow-hidden`}
        data-theme-init="pending"
        suppressHydrationWarning
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
