// nextjs/src/app/layout.js
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";

export const metadata = {
  title: "Cactario Casa Molle",
  description: "Sistema Cactario",
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
