// nextjs/src/app/layout.js
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import ConsoleSilencer from "../components/ConsoleSilencer";
import { ReactQueryProvider } from "../providers/query-client";

export const metadata = {
  title: "Cactario Casa Molle",
  description: "Sistema de gestión de cactáceas - Casa Molle",
  icons: {
    icon: '/favicon.ico',
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
