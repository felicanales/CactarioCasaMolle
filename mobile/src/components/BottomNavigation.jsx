'use client';

import { useRouter, usePathname } from 'next/navigation';

export default function BottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (path) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(path);
  };

  const navigateTo = (path) => {
    router.push(path);
  };

  return (
    <nav className="bottom-nav">
      <button
        className={`nav-button ${isActive('/') ? 'active' : ''}`}
        onClick={() => navigateTo('/')}
      >
        Home
      </button>
      <button
        className={`nav-button ${isActive('/qr') ? 'active' : ''}`}
        onClick={() => navigateTo('/qr')}
      >
        QR lector
      </button>
      <button
        className={`nav-button ${isActive('/sectores') ? 'active' : ''}`}
        onClick={() => navigateTo('/sectores')}
      >
        Sectores<br />de cactus
      </button>
    </nav>
  );
}

