// nextjs/src/app/layout.js
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import ConsoleSilencer from "../components/ConsoleSilencer";
import { ReactQueryProvider } from "../providers/query-client";

export const metadata = {
  title: "Cactario Casa Molle",
  description: "Sistema de gestiÃ³n de cactÃ¡ceas - Casa Molle",
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <ConsoleSilencer />
        <ReactQueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
