import "./globals.css";
import ConsoleSilencer from "@/components/ConsoleSilencer";

export const metadata = {
  title: "Cactuario CasaMolle",
  description: "Aplicación móvil para explorar el Cactuario CasaMolle",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#6f5f50" />
      </head>
      <body>
        <ConsoleSilencer />
        {children}
      </body>
    </html>
  );
}
