// nextjs/src/app/layout.js
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";

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
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
