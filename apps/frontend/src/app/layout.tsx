import './global.css';
import { Poppins } from 'next/font/google';
import { StoreProvider } from './Redux/storeProvider';
import QueryProvider from './providers/QueryProvider';
import AppLoaderProvider from './providers/AppLoaderProvider';
import AuthBootstrap from './providers/AuthBootstrap';
import PermissionProvider from './providers/PermissionProvider';
import { AppToastProvider } from '../components/toast/AppToast';

export const metadata = {
  title: 'Harper Help Desk',
  description: 'Harper Help Desk',
};

const poppins = Poppins({
  style: ['normal'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
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
      <link
        rel="icon"
        type="image/png"
        href="images/favicon/favicon-96x96.png"
        sizes="96x96"
      />
      <link rel="icon" type="image/svg+xml" href="images/favicon/favicon.svg" />
      <link rel="shortcut icon" href="images/favicon/favicon.ico" />
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href="images/favicon/apple-touch-icon.png"
      />
      <meta name="apple-mobile-web-app-title" content="MyWebSite" />
      <link rel="manifest" href="images/favicon/site.webmanifest" />
      <body className={`${poppins.variable} bg-white min-h-dvh`}>
        <StoreProvider>
          <QueryProvider>
            <AppLoaderProvider>
              <PermissionProvider>
                <AuthBootstrap />
                {children}
                <AppToastProvider />
              </PermissionProvider>
            </AppLoaderProvider>
          </QueryProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
