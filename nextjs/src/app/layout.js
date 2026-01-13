// nextjs/src/app/layout.js
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import ConsoleSilencer from "../components/ConsoleSilencer";

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
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
