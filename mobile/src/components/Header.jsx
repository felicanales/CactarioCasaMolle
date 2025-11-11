'use client';

import Image from 'next/image';

export default function Header() {
  return (
    <header className="header">
      <div className="header-logo-container">
        <div className="header-logo">
          <Image src="/logo.png" alt="Cactuario CasaMolle" width={48} height={48} priority />
        </div>
        <div className="header-title">Cactuario CasaMolle</div>
      </div>
      <div className="header-cactus">🌵</div>
    </header>
  );
}
