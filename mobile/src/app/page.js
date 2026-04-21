'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import ImageCarousel from '@/components/ImageCarousel';
import { resolvePhotoUrl } from '@/utils/images';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [welcomeText, setWelcomeText] = useState('Bienvenido al Cactario CasaMolle');
  const [carouselImages, setCarouselImages] = useState([]);
  const [sections, setSections] = useState([]);
  const [error, setError] = useState(null);
  const [language, setLanguage] = useState('es'); // 'es' o 'en'

  // Detectar idioma y cargar contenido en un solo efecto — evita el waterfall
  // donde el segundo useEffect esperaba el cambio de estado del primero.
  useEffect(() => {
    const saved = localStorage.getItem('cactario_language');
    let lang = 'es';
    if (saved === 'es' || saved === 'en') {
      lang = saved;
    } else {
      lang = (navigator.language || navigator.userLanguage || '').startsWith('en') ? 'en' : 'es';
      localStorage.setItem('cactario_language', lang);
    }
    setLanguage(lang);
    loadHomeContent(lang); // fetch inmediato con el idioma ya resuelto
  }, []);

  const loadHomeContent = async (lang = language) => {
    try {
      setLoading(true);
      setError(null);

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cactariocasamolle-production.up.railway.app';
      const response = await fetch(`${API_URL}/home-content/public?lang=${lang}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar el contenido del home');
      }
      
      const data = await response.json();
      
      setWelcomeText(data.welcome_text || (lang === 'es' ? 'Bienvenido al Cactario CasaMolle' : 'Welcome to Cactario CasaMolle'));

      const images = (data.carousel_images || []).map((img, index) => ({
        id: index + 1,
        url: img.url || img,
        alt: img.alt || `Imagen ${index + 1}`
      }));
      setCarouselImages(images);
      setSections(data.sections || []);
    } catch (err) {
      console.error('Error loading home content:', err);
      setError(lang === 'es'
        ? 'No se pudo cargar el contenido. Mostrando contenido por defecto.'
        : 'Could not load content. Showing default content.');
      // Mantener valores por defecto
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => {
    const newLang = language === 'es' ? 'en' : 'es';
    setLanguage(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cactario_language', newLang);
    }
  };

  const renderSection = (section, index, totalSections) => {
    // Nueva estructura: secciÃ³n con tÃ­tulo y array de items
    if (section.title || (section.items && section.items.length > 0)) {
      return (
        <div key={index}>
          <div style={{ 
            marginBottom: '32px',
            padding: '20px',
            backgroundColor: 'var(--color-card)',
            borderRadius: '12px',
            border: '2px solid var(--color-border)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
          }}>
            {section.title && (
              <h2 style={{ 
                fontSize: '22px', 
                fontWeight: '700', 
                marginBottom: '20px',
                color: 'var(--color-brown-dark)',
                paddingBottom: '12px',
                borderBottom: '3px solid var(--color-accent)',
                display: 'inline-block',
                width: '100%'
              }}>
                {section.title}
              </h2>
            )}
          
          {/* Renderizar items (pÃ¡rrafos e imÃ¡genes intercalados) */}
          {section.items && section.items.length > 0 && (
            <div>
              {section.items.map((item, itemIndex) => {
                if (item.type === 'paragraph') {
                  return (
                    <div key={itemIndex} style={{ marginBottom: '16px' }}>
                      {item.content && (
                        <p style={{ 
                          fontSize: '16px', 
                          lineHeight: '1.6',
                          color: 'var(--color-black)',
                          marginBottom: '16px',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {item.content}
                        </p>
                      )}
                    </div>
                  );
                }
                
                if (item.type === 'image') {
                  return (
                    <div key={itemIndex} style={{ marginBottom: '16px' }}>
                      {item.imageUrl && (
                        <Image
                          src={resolvePhotoUrl(item)}
                          alt={item.alt || section.title || `Imagen ${itemIndex + 1}`}
                          width={240}
                          height={160}
                          style={{
                            width: '100%',
                            maxWidth: '240px',
                            height: 'auto',
                            borderRadius: '8px',
                            margin: '0 auto 16px',
                            display: 'block'
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                    </div>
                  );
                }
                
                return null;
              })}
            </div>
          )}
          </div>
        </div>
      );
    }
    
    // Compatibilidad hacia atrÃ¡s: estructura antigua (type: text, bullets, image)
    if (section.type === 'text') {
      return (
        <div key={index}>
          <div style={{ 
            marginBottom: '32px',
            padding: '20px',
            backgroundColor: 'var(--color-card)',
            borderRadius: '12px',
            border: '2px solid var(--color-border)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
          }}>
            {section.title && (
              <h2 style={{ 
                fontSize: '22px', 
                fontWeight: '700', 
                marginBottom: '20px',
                color: 'var(--color-brown-dark)',
                paddingBottom: '12px',
                borderBottom: '3px solid var(--color-accent)',
                display: 'inline-block',
                width: '100%'
              }}>
                {section.title}
              </h2>
            )}
            {section.content && (
              <p style={{ 
                fontSize: '16px', 
                lineHeight: '1.6',
                color: 'var(--color-black)',
                marginBottom: '16px',
                whiteSpace: 'pre-wrap'
              }}>
                {section.content}
              </p>
            )}
          </div>
        </div>
      );
    }
    
    if (section.type === 'bullets') {
      return (
        <div key={index}>
          <div style={{ 
            marginBottom: '32px',
            padding: '20px',
            backgroundColor: 'var(--color-card)',
            borderRadius: '12px',
            border: '2px solid var(--color-border)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
          }}>
            {section.title && (
              <h2 style={{ 
                fontSize: '22px', 
                fontWeight: '700', 
                marginBottom: '20px',
                color: 'var(--color-brown-dark)',
                paddingBottom: '12px',
                borderBottom: '3px solid var(--color-accent)',
                display: 'inline-block',
                width: '100%'
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
                    color: 'var(--color-black)'
                  }}>
                    {bullet}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      );
    }
    
    if (section.type === 'image') {
      return (
        <div key={index}>
          <div style={{ 
            marginBottom: '32px',
            padding: '20px',
            backgroundColor: 'var(--color-card)',
            borderRadius: '12px',
            border: '2px solid var(--color-border)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
          }}>
            {section.title && (
              <h2 style={{ 
                fontSize: '22px', 
                fontWeight: '700', 
                marginBottom: '20px',
                color: 'var(--color-brown-dark)',
                paddingBottom: '12px',
                borderBottom: '3px solid var(--color-accent)',
                display: 'inline-block',
                width: '100%'
              }}>
                {section.title}
              </h2>
            )}
            {section.imageUrl && (
              <Image
                src={resolvePhotoUrl(section)}
                alt={section.title || `Imagen ${index + 1}`}
                width={240}
                height={160}
                style={{
                  width: '100%',
                  maxWidth: '240px',
                  height: 'auto',
                  borderRadius: '8px',
                  margin: '12px auto 0',
                  display: 'block'
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
          </div>
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
            <p style={{ color: 'var(--color-black)' }}>Cargando...</p>
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
        <div className="home-layout">
          <section className="home-main">
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h1 style={{ 
                fontSize: '32px', 
                fontWeight: '700', 
                margin: 0,
                color: 'var(--color-brown-dark)'
              }}>
                {welcomeText}
              </h1>
              <button
                onClick={toggleLanguage}
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'var(--color-brown-medium)',
                  color: 'var(--color-white)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {language === 'es' ? 'EN' : 'ES'}
              </button>
            </div>
            
            {carouselImages.length > 0 && (
              <div className="home-carousel" style={{ marginBottom: '32px' }}>
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
                backgroundColor: 'var(--color-beige-soft)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-brown-dark)',
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
                {sections.map((section, index) => renderSection(section, index, sections.length))}
              </div>
            ) : (
            <div style={{ marginTop: '24px' }}>
                <p style={{ 
                  fontSize: '16px',
                  color: 'var(--color-black)',
                  fontStyle: 'italic'
                }}>
                  No hay contenido disponible en este momento.
                </p>
            </div>
            )}
          </section>
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
}

