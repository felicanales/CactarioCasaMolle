'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import ImageCarousel from '@/components/ImageCarousel';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [welcomeText, setWelcomeText] = useState('Bienvenido al Cactario CasaMolle');
  const [carouselImages, setCarouselImages] = useState([]);
  const [sections, setSections] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadHomeContent();
  }, []);

  const loadHomeContent = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Obtener la URL de la API desde las variables de entorno
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cactariocasamolle-production.up.railway.app';
      
      const response = await fetch(`${API_URL}/home-content/public`);
      
      if (!response.ok) {
        throw new Error('Error al cargar el contenido del home');
      }
      
      const data = await response.json();
      
      setWelcomeText(data.welcome_text || 'Bienvenido al Cactario CasaMolle');
      
      // Procesar imágenes del carrusel
      const images = (data.carousel_images || []).map((img, index) => ({
        id: index + 1,
        url: img.url || img,
        alt: img.alt || `Imagen ${index + 1}`
      }));
      setCarouselImages(images);
      
      // Procesar secciones
      setSections(data.sections || []);
    } catch (err) {
      console.error('Error loading home content:', err);
      setError('No se pudo cargar el contenido. Mostrando contenido por defecto.');
      // Mantener valores por defecto
    } finally {
      setLoading(false);
    }
  };

  const renderSection = (section, index) => {
    if (section.type === 'text') {
      return (
        <div key={index} style={{ marginBottom: '24px' }}>
          {section.title && (
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: '600', 
              marginBottom: '12px',
              color: '#111827'
            }}>
              {section.title}
            </h2>
          )}
          {section.content && (
            <p style={{ 
              fontSize: '16px', 
              lineHeight: '1.6',
              color: '#374151',
              marginBottom: '16px'
            }}>
              {section.content}
            </p>
          )}
        </div>
      );
    }
    
    if (section.type === 'bullets') {
      return (
        <div key={index} style={{ marginBottom: '24px' }}>
          {section.title && (
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: '600', 
              marginBottom: '12px',
              color: '#111827'
            }}>
              {section.title}
            </h2>
          )}
          {section.bullets && section.bullets.length > 0 && (
            <ul style={{ 
              paddingLeft: '24px', 
              marginTop: '12px',
              listStyleType: 'disc'
            }}>
              {section.bullets.map((bullet, bulletIndex) => (
                <li key={bulletIndex} style={{ 
                  marginBottom: '8px',
                  fontSize: '16px',
                  lineHeight: '1.6',
                  color: '#374151'
                }}>
                  {bullet}
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }
    
    if (section.type === 'image') {
      return (
        <div key={index} style={{ marginBottom: '24px' }}>
          {section.title && (
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: '600', 
              marginBottom: '12px',
              color: '#111827'
            }}>
              {section.title}
            </h2>
          )}
          {section.imageUrl && (
            <img
              src={section.imageUrl}
              alt={section.title || `Imagen ${index + 1}`}
              style={{
                width: '100%',
                maxHeight: '400px',
                objectFit: 'cover',
                borderRadius: '8px',
                marginTop: '12px'
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          )}
        </div>
      );
    }
    
    return null;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <main className="main-content">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            minHeight: '200px'
          }}>
            <p style={{ color: '#6b7280' }}>Cargando...</p>
          </div>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <main className="main-content">
        <div>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: '700', 
            marginBottom: '24px',
            color: '#111827'
          }}>
            {welcomeText} 🌵
          </h1>
          
          {carouselImages.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <ImageCarousel 
                images={carouselImages} 
                placeholderText="Fotos de cactus"
                autoRotate={true}
                rotationInterval={5000}
              />
            </div>
          )}

          {error && (
            <div style={{
              backgroundColor: '#fef3c7',
              border: '1px solid #fbbf24',
              color: '#92400e',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '24px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          {sections.length > 0 ? (
            <div>
              {sections.map((section, index) => renderSection(section, index))}
            </div>
          ) : (
            <div style={{ marginTop: '24px' }}>
              <p style={{ 
                fontSize: '16px',
                color: '#6b7280',
                fontStyle: 'italic'
              }}>
                No hay contenido disponible en este momento.
              </p>
            </div>
          )}
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
}

