import "./globals.css";

export const metadata = {
  title: "Web3 Junkies Console",
  description: "Task and rewards console for the Web3 Junkies community.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body">{children}</body>
    </html>
  );
}
