'use client';

import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import ImageCarousel from '@/components/ImageCarousel';

export default function Home() {
  // Placeholder para imágenes del carrusel
  const carouselImages = [
    { id: 1, placeholder: true },
    { id: 2, placeholder: true },
    { id: 3, placeholder: true },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <main className="main-content">
        <div>
          <h1>texto de bienvenida 🌵</h1>
          
          <ImageCarousel images={carouselImages} placeholderText="Fotos de cactus" />

          <div style={{ marginTop: '24px' }}>
            <p>texto de de uso de la app o información complementaria</p>
            <ul style={{ paddingLeft: '20px', marginTop: '12px' }}>
              <li style={{ marginBottom: '8px' }}>Información sobre el cactuario</li>
              <li style={{ marginBottom: '8px' }}>Guía de uso de la aplicación</li>
              <li style={{ marginBottom: '8px' }}>Información adicional</li>
            </ul>
          </div>
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
}

