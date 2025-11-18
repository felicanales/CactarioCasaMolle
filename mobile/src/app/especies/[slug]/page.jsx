'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import AuthenticatedImage from '@/components/AuthenticatedImage';
import { speciesApi } from '@/utils/api';

export default function EspecieDetail() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug;
  
  const [especie, setEspecie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);

  useEffect(() => {
    if (slug) {
      loadEspecieData();
    }
  }, [slug]);

  const loadEspecieData = async () => {
    try {
      setLoading(true);
      const response = await speciesApi.getBySlug(slug);
      setEspecie(response.data);
    } catch (err) {
      console.error('Error al cargar especie:', err);
      setError('No se pudo cargar la información de la especie');
      setEspecie(null);
    } finally {
      setLoading(false);
    }
  };

  // Preparar fotos desde el array photos
  const photos = especie?.photos || [];
  const coverPhoto = especie?.cover_photo || (photos.length > 0 ? photos[0]?.public_url : null);

  const renderInfoCard = (icon, title, content, onClick = null) => {
    if (!content || (typeof content === 'string' && content.trim() === '')) {
      return null;
    }
    
    return (
      <div
        onClick={onClick}
        style={{
          backgroundColor: '#EDD4A6',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '12px',
          border: '1px solid #D4B896',
          cursor: onClick ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}
      >
        {icon && (
          <div style={{
            fontSize: '24px',
            flexShrink: 0,
            marginTop: '2px',
          }}>
            {icon}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#3E2723',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span>{title}</span>
            {onClick && (
              <span style={{ color: '#A0522D', fontSize: '18px' }}>›</span>
            )}
          </div>
          <div style={{
            fontSize: '14px',
            color: '#5D4037',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
          }}>
            {content}
          </div>
        </div>
      </div>
    );
  };

  const renderBadge = (label, value, color = '#A0522D') => {
    if (!value) return null;
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '6px 12px',
        borderRadius: '16px',
        backgroundColor: color === '#A0522D' ? 'rgba(160, 82, 45, 0.2)' : 'rgba(139, 115, 85, 0.2)',
        color: color,
        fontSize: '12px',
        fontWeight: '500',
        marginRight: '8px',
        marginBottom: '8px',
        border: `1px solid ${color}40`,
      }}>
        {label}: {value}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh',
        backgroundColor: '#F5E6D3',
        color: '#5D4037',
      }}>
        <Header />
        <main style={{ flex: 1, padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#8B7355' }}>Cargando información...</div>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  if (error || !especie) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh',
        backgroundColor: '#F5E6D3',
        color: '#5D4037',
      }}>
        <Header />
        <main style={{ flex: 1, padding: '20px' }}>
          <button
            onClick={() => router.back()}
            style={{
              background: 'none',
              border: 'none',
              color: '#5D4037',
              fontSize: '24px',
              cursor: 'pointer',
              marginBottom: '20px',
            }}
          >
            ←
          </button>
          <div style={{ color: '#C62828' }}>{error || 'Especie no encontrada'}</div>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh',
      backgroundColor: '#F5E6D3',
      color: '#3E2723',
    }}>
      <Header />
      
      {/* Header con imagen de fondo */}
      <div 
        onClick={() => photos.length > 0 && setSelectedImageIndex(0)}
        style={{
          position: 'relative',
          width: '100%',
          minHeight: '280px',
          overflow: 'hidden',
          cursor: photos.length > 0 ? 'pointer' : 'default',
        }}
      >
        {coverPhoto && (
          <>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `url(${coverPhoto})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'brightness(1.1) sepia(0.3)',
              backgroundColor: '#F5E6D3',
            }} />
            {/* Overlay oscuro para mejorar contraste del texto */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
            }} />
            {/* Indicador de que la imagen es clicable */}
            {photos.length > 0 && (
              <div style={{
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                background: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: '500',
                zIndex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                📷 {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}
              </div>
            )}
          </>
        )}
        {!coverPhoto && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#E8D5B7',
          }} />
        )}
        <div style={{
          position: 'relative',
          zIndex: 1,
          padding: '20px',
          paddingTop: '60px',
        }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.back();
            }}
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              color: '#FFFFFF',
              fontSize: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              zIndex: 2,
            }}
          >
            ←
          </button>
          
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              color: '#FFFFFF',
              fontSize: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              zIndex: 2,
            }}
          >
            ⋮
          </div>

          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#FFFFFF',
            marginBottom: '8px',
            textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 4px 12px rgba(0,0,0,0.6)',
          }}>
            {especie.nombre_común || especie.scientific_name}
          </h1>
          
          {especie.scientific_name && (
            <div style={{
              fontSize: '16px',
              color: '#F5E6D3',
              fontStyle: 'italic',
              marginBottom: '8px',
              textShadow: '0 2px 6px rgba(0,0,0,0.8), 0 3px 8px rgba(0,0,0,0.6)',
            }}>
              {especie.scientific_name}
            </div>
          )}

          {especie.nombres_comunes && (
            <div style={{
              fontSize: '14px',
              color: '#EDD4A6',
              marginTop: '8px',
              textShadow: '0 2px 6px rgba(0,0,0,0.8), 0 3px 8px rgba(0,0,0,0.6)',
            }}>
              También conocida como: {especie.nombres_comunes}
            </div>
          )}
        </div>
      </div>

      <main style={{ 
        flex: 1, 
        padding: '20px',
        paddingBottom: '100px',
        backgroundColor: '#F5E6D3',
      }}>
        <>
            {/* Badges de información básica */}
            <div style={{ 
              marginBottom: '24px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
            }}>
              {(especie.categoría_de_conservación || especie.categoria_conservacion) && 
                renderBadge('Conservación', especie.categoría_de_conservación || especie.categoria_conservacion)}
              {especie.Endémica && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '6px 12px',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(160, 82, 45, 0.2)',
                  color: '#A0522D',
                  fontSize: '12px',
                  fontWeight: '500',
                  marginRight: '8px',
                  marginBottom: '8px',
                  border: '1px solid #A0522D40',
                }}>
                  🇨🇱 Endémica de Chile
                </div>
              )}
              {especie.tipo_morfología && renderBadge('Morfología', especie.tipo_morfología, '#8B7355')}
              {especie.tipo_planta && renderBadge('Tipo', especie.tipo_planta, '#8B7355')}
            </div>

            {/* Galería de imágenes */}
            {photos.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                }}>
                  <h2 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#3E2723',
                  }}>
                    Imágenes
                  </h2>
                  <span style={{ color: '#8B7355', fontSize: '18px', cursor: 'pointer' }}>⋮</span>
                </div>
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  overflowX: 'auto',
                  paddingBottom: '8px',
                }}>
                  {photos.map((photo, index) => (
                    <div
                      key={photo.id || index}
                      onClick={() => setSelectedImageIndex(index)}
                      style={{
                        minWidth: '120px',
                        width: '120px',
                        height: '120px',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        flexShrink: 0,
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <AuthenticatedImage
                        src={photo.public_url || photo.url}
                        alt={`Foto ${index + 1} de ${especie.nombre_común || especie.scientific_name}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal de imagen ampliada */}
            {selectedImageIndex !== null && photos.length > 0 && (
              <div
                onClick={() => setSelectedImageIndex(null)}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.9)',
                  zIndex: 1000,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px',
                }}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'relative',
                    maxWidth: '100%',
                    maxHeight: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {/* Botón cerrar */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImageIndex(null);
                    }}
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: 'rgba(0, 0, 0, 0.6)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '50%',
                      width: '44px',
                      height: '44px',
                      color: '#FFFFFF',
                      fontSize: '28px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 1001,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>

                  {/* Navegación anterior/siguiente */}
                  {photos.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImageIndex((selectedImageIndex - 1 + photos.length) % photos.length);
                        }}
                        style={{
                          position: 'absolute',
                          left: '10px',
                          background: 'rgba(0, 0, 0, 0.5)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                          borderRadius: '50%',
                          width: '48px',
                          height: '48px',
                          color: '#FFFFFF',
                          fontSize: '24px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 1001,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                        }}
                      >
                        ‹
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImageIndex((selectedImageIndex + 1) % photos.length);
                        }}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          background: 'rgba(0, 0, 0, 0.5)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                          borderRadius: '50%',
                          width: '48px',
                          height: '48px',
                          color: '#FFFFFF',
                          fontSize: '24px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 1001,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                        }}
                      >
                        ›
                      </button>
                    </>
                  )}

                  {/* Imagen ampliada */}
                  <AuthenticatedImage
                    src={photos[selectedImageIndex]?.public_url || photos[selectedImageIndex]?.url}
                    alt={`Foto ${selectedImageIndex + 1} de ${especie.nombre_común || especie.scientific_name}`}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '90vh',
                      objectFit: 'contain',
                      borderRadius: '8px',
                    }}
                  />

                  {/* Indicador de imagen */}
                  {photos.length > 1 && (
                    <div style={{
                      position: 'absolute',
                      bottom: '20px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      display: 'flex',
                      gap: '8px',
                      background: 'rgba(0, 0, 0, 0.5)',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      backdropFilter: 'blur(10px)',
                    }}>
                      {photos.map((_, index) => (
                        <div
                          key={index}
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: index === selectedImageIndex ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)',
                            transition: 'background-color 0.2s',
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Secciones de información */}
            {especie.estado_conservación && renderInfoCard('ⓘ', 'Estado de Conservación', especie.estado_conservación)}
            {especie.habitat && renderInfoCard('🌍', 'Hábitat', especie.habitat)}
            {especie.distribución && renderInfoCard('🗺️', 'Distribución', especie.distribución)}
            {especie.expectativa_vida && renderInfoCard('⏱️', 'Expectativa de Vida', especie.expectativa_vida)}
            {especie.floración && renderInfoCard('🌸', 'Floración', especie.floración)}
            {especie.cuidado && renderInfoCard('💧', 'Cuidado y Recomendaciones', especie.cuidado)}
            {especie.usos && renderInfoCard('🔧', 'Usos', especie.usos)}
            {especie.historia_nombre && renderInfoCard('📖', 'Historia del Nombre', especie.historia_nombre)}
            {especie.historia_y_leyendas && renderInfoCard('📚', 'Historia y Leyendas', especie.historia_y_leyendas)}

            {/* Mensaje si no hay información */}
            {!especie.habitat && 
             !especie.distribución && 
             !especie.floración && 
             !especie.cuidado && 
             !especie.usos && 
             !especie.historia_nombre && 
             !especie.historia_y_leyendas && (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#8B7355',
                fontStyle: 'italic',
              }}>
                No hay información adicional disponible para esta especie.
              </div>
            )}
        </>
      </main>
      
      <BottomNavigation />
    </div>
  );
}
