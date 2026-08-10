import type { Metadata } from "next"
import type { PropsWithChildren } from "react"

import { QueryProvider } from "./_providers/query-provider"
import "./globals.css"

export const metadata: Metadata = {
  title: "Чат с консультантом",
  description: "Тестовое задание на Next.js",
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="ru">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
