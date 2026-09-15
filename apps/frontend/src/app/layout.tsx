import './global.css';
import { Nunito } from 'next/font/google';
import { StoreProvider } from './Redux/storeProvider';
import QueryProvider from './providers/QueryProvider';
import AppLoaderProvider from './providers/AppLoaderProvider';
import AuthBootstrap from './providers/AuthBootstrap';
import IdleLogout from './providers/IdleLogout';
import PermissionProvider from './providers/PermissionProvider';
import { AppToastProvider } from '../components/toast/AppToast';
import { NotificationsSocketProvider } from './providers/NotificationsSocketProvider';

export const metadata = {
  title: 'EPC CRM',
  description: 'EPC CRM',
};

const poppins = Nunito({
  style: ['normal'],
  weight: ['200', '300', '400', '500', '600', '700', '800', '900'],
  subsets: ['latin'],
  variable: '--poppins',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="icon"
          type="image/png"
          href="/images/favicon/favicon-96x96.png"
          sizes="96x96"
        />
        <link
          rel="icon"
          type="image/svg+xml"
          href="/images/favicon/favicon.svg"
        />
        <link rel="shortcut icon" href="/images/favicon/favicon.ico" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/images/favicon/apple-touch-icon.png"
        />
        <meta name="apple-mobile-web-app-title" content="MyWebSite" />
        <link rel="manifest" href="images/favicon/site.webmanifest" />
      </head>
      <body className={`${poppins.variable} bg-white min-h-dvh`}>
        <StoreProvider>
          <AuthBootstrap>
            <QueryProvider>
              <AppLoaderProvider>
                <PermissionProvider>
                  <IdleLogout />
                  <NotificationsSocketProvider>
                    {children}
                  </NotificationsSocketProvider>
                  <AppToastProvider />
                </PermissionProvider>
              </AppLoaderProvider>
            </QueryProvider>
          </AuthBootstrap>
        </StoreProvider>
      </body>
    </html>
  );
}
