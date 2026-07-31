import "./globals.css";

export const metadata = {
  title: "lihiPDF 單一表單 MVP",
  description: "太陽能送審單一表單 PDF 產生工具"
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
