import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'VaaniDoc — Indian Language Document Accessibility',
  description:
    'Convert Hindi and regional language PDFs and images to natural speech. Powered by Sarvam AI.',
  keywords: ['Hindi TTS', 'Indian language OCR', 'PDF to speech', 'accessibility', 'Sarvam AI'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
