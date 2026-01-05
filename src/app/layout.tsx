import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "A股AI交易模拟平台",
  description: "集成多AI模型的A股交易模拟回测平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
