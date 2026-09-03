import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import './styles.css'

export const metadata: Metadata = {
  title: 'AgenAuto',
  description: 'Comparer, comprendre et choisir un véhicule neuf au Cameroun.',
}

export default function FrontendLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
