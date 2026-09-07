import './globals.css';
import BottomNav from './components/BottomNav';

export const metadata = {
  title: 'ログイン',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
