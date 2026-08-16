import type { Metadata } from "next"
import type { PropsWithChildren } from "react"

import { QueryProvider } from "./_providers/query-provider"
import "./globals.css"

export const metadata: Metadata = {
  title: "Чат с консультантом"
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-screen font-retro text-green [color-scheme:dark] [text-shadow:0_0_7px_rgba(114,247,126,0.32)]">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
