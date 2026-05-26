'use client';

import Image from 'next/image';
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

  const navItems = [
    {
      path: '/',
      label: 'Home',
      iconSrc: '/icon_1.png',
      shortLabel: 'Inicio'
    },
    {
      path: '/qr',
      label: 'QR lector',
      iconSrc: '/icon_2.png',
      shortLabel: 'QR'
    },
    {
      path: '/sectores',
      label: 'Sectores de cactus',
      iconSrc: '/icon_3.png',
      shortLabel: 'Sectores'
    },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const active = isActive(item.path);
        return (
          <button
            key={item.path}
            className={`nav-button ${active ? 'active' : ''}`}
            onClick={() => navigateTo(item.path)}
            aria-label={item.label}
          >
            <span className="nav-icon" aria-hidden="true">
              <Image
                src={item.iconSrc}
                alt=""
                width={24}
                height={24}
                className="nav-icon-image"
              />
            </span>
            <span className="nav-label">
              <span className="nav-label-full">{item.label}</span>
              <span className="nav-label-short">{item.shortLabel}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
