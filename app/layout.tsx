export const metadata = {
  title: 'PlayUp – Find Your Game',
  description: 'Book lessons and find players near you in Melbourne',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
