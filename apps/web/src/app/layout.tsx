import type { Metadata } from 'next';
import { Roboto_Mono } from 'next/font/google';
import './globals.css';
import Layout from '@/components/local/Layout';
import { ThemeProvider } from '@/components/theme-provider';
import { getNotificationPermission } from '@chat/notifications';

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'P2P Chat',
  description: 'Fuck chat control',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // (async () => {
  //   const notificationsPermission = await getNotificationPermission();
  //   console.log(notificationsPermission);
  // })();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${robotoMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Layout>{children}</Layout>
        </ThemeProvider>
      </body>
    </html>
  );
}
