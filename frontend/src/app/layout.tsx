import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "割り勘ドライブ",
  description: "経路検索 ＋ ETC対応 ＋ 傾斜計算",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
