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
  const [language, setLanguage] = useState('es'); // 'es' o 'en'

  // Detectar idioma del navegador al cargar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Intentar obtener idioma guardado en localStorage
      const savedLang = localStorage.getItem('cactario_language');
      if (savedLang && (savedLang === 'es' || savedLang === 'en')) {
        setLanguage(savedLang);
      } else {
        // Detectar idioma del navegador
        const browserLang = navigator.language || navigator.userLanguage;
        const lang = browserLang.startsWith('en') ? 'en' : 'es';
        setLanguage(lang);
        localStorage.setItem('cactario_language', lang);
      }
    }
  }, []);

  useEffect(() => {
    if (language) {
      loadHomeContent();
    }
  }, [language]);

  const loadHomeContent = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Obtener la URL de la API desde las variables de entorno
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cactariocasamolle-production.up.railway.app';
      
      // Pasar el parámetro de idioma
      const response = await fetch(`${API_URL}/home-content/public?lang=${language}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar el contenido del home');
      }
      
      const data = await response.json();
      
      setWelcomeText(data.welcome_text || (language === 'es' ? 'Bienvenido al Cactario CasaMolle' : 'Welcome to Cactario CasaMolle'));
      
      // Procesar imágenes del carrusel con alt text según idioma
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
      setError(language === 'es' 
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
    // Nueva estructura: sección con título y array de items
    if (section.title || (section.items && section.items.length > 0)) {
      return (
        <div key={index}>
          <div style={{ 
            marginBottom: '32px',
            padding: '20px',
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            border: '2px solid #e5e7eb',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
          }}>
            {section.title && (
              <h2 style={{ 
                fontSize: '22px', 
                fontWeight: '700', 
                marginBottom: '20px',
                color: '#111827',
                paddingBottom: '12px',
                borderBottom: '3px solid #5a6b3d',
                display: 'inline-block',
                width: '100%'
              }}>
                {section.title}
              </h2>
            )}
          
          {/* Renderizar items (párrafos e imágenes intercalados) */}
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
                          color: '#374151',
                          marginBottom: '16px'
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
                        <img
                          src={item.imageUrl}
                          alt={item.alt || section.title || `Imagen ${itemIndex + 1}`}
                          style={{
                            width: '100%',
                            maxHeight: '400px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            marginBottom: '16px'
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
              })}
            </div>
          )}
          </div>
        </div>
      );
    }
    
    // Compatibilidad hacia atrás: estructura antigua (type: text, bullets, image)
    if (section.type === 'text') {
      return (
        <div key={index}>
          <div style={{ 
            marginBottom: '32px',
            padding: '20px',
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            border: '2px solid #e5e7eb',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
          }}>
            {section.title && (
              <h2 style={{ 
                fontSize: '22px', 
                fontWeight: '700', 
                marginBottom: '20px',
                color: '#111827',
                paddingBottom: '12px',
                borderBottom: '3px solid #5a6b3d',
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
                color: '#374151',
                marginBottom: '16px'
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
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            border: '2px solid #e5e7eb',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
          }}>
            {section.title && (
              <h2 style={{ 
                fontSize: '22px', 
                fontWeight: '700', 
                marginBottom: '20px',
                color: '#111827',
                paddingBottom: '12px',
                borderBottom: '3px solid #5a6b3d',
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
                    color: '#374151'
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
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            border: '2px solid #e5e7eb',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
          }}>
            {section.title && (
              <h2 style={{ 
                fontSize: '22px', 
                fontWeight: '700', 
                marginBottom: '20px',
                color: '#111827',
                paddingBottom: '12px',
                borderBottom: '3px solid #5a6b3d',
                display: 'inline-block',
                width: '100%'
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
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '24px'
          }}>
            <h1 style={{ 
              fontSize: '24px', 
              fontWeight: '700', 
              margin: 0,
              color: '#111827'
            }}>
              {welcomeText} 🌵
            </h1>
            <button
              onClick={toggleLanguage}
              style={{
                padding: '8px 12px',
                backgroundColor: '#5a6b3d',
                color: 'white',
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
              {sections.map((section, index) => renderSection(section, index, sections.length))}
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

