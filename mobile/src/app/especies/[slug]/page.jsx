'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import AuthenticatedImage from '@/components/AuthenticatedImage';
import { speciesApi } from '@/utils/api';
import { resolvePhotoUrl } from '@/utils/images';

export default function EspecieDetail() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug;

  const [especie, setEspecie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const modalTouchStartXRef = useRef(null);
  const modalTouchStartYRef = useRef(null);
  const modalTouchLastXRef = useRef(null);
  const modalIsSwipingRef = useRef(false);

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
      setError('No se pudo cargar la informaciÃ³n de la especie');
      setEspecie(null);
    } finally {
      setLoading(false);
    }
  };

  // Preparar fotos desde el array photos
  const photos = especie?.photos || [];
  const coverPhoto = resolvePhotoUrl(especie?.cover_photo || (photos.length > 0 ? photos[0] : null));

  const resetModalTouch = () => {
    modalTouchStartXRef.current = null;
    modalTouchStartYRef.current = null;
    modalTouchLastXRef.current = null;
    modalIsSwipingRef.current = false;
  };

  const handleModalTouchStart = (event) => {
    if (photos.length <= 1 || selectedImageIndex === null) {
      return;
    }

    const touch = event.touches[0];
    modalTouchStartXRef.current = touch.clientX;
    modalTouchStartYRef.current = touch.clientY;
    modalTouchLastXRef.current = touch.clientX;
    modalIsSwipingRef.current = false;
  };

  const handleModalTouchMove = (event) => {
    if (modalTouchStartXRef.current === null) {
      return;
    }

    const touch = event.touches[0];
    modalTouchLastXRef.current = touch.clientX;

    const deltaX = touch.clientX - modalTouchStartXRef.current;
    const deltaY = touch.clientY - modalTouchStartYRef.current;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      modalIsSwipingRef.current = true;
    }
  };

  const handleModalTouchEnd = () => {
    if (modalTouchStartXRef.current === null || modalTouchLastXRef.current === null) {
      resetModalTouch();
      return;
    }

    const deltaX = modalTouchLastXRef.current - modalTouchStartXRef.current;
    if (modalIsSwipingRef.current && Math.abs(deltaX) > 40) {
      setSelectedImageIndex((prev) => {
        if (prev === null || photos.length <= 1) {
          return prev;
        }
        if (deltaX < 0) {
          return (prev + 1) % photos.length;
        }
        return (prev - 1 + photos.length) % photos.length;
      });
    }

    resetModalTouch();
  };

  const renderInfoCard = (icon, title, content, onClick = null) => {
    if (!content || (typeof content === 'string' && content.trim() === '')) {
      return null;
    }

    return (
      <div
        onClick={onClick}
        style={{
          backgroundColor: 'var(--color-beige)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '12px',
          width: '100%',
          maxWidth: '960px',
          marginLeft: 'auto',
          marginRight: 'auto',
          border: '1px solid var(--color-border)',
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
            color: 'var(--color-black)',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span>{title}</span>
            {onClick && (
              <span style={{ color: 'var(--color-accent)', fontSize: '18px' }}>â€º</span>
            )}
          </div>
          <div style={{
            fontSize: '14px',
            color: 'var(--color-black)',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
          }}>
            {content}
          </div>
        </div>
      </div>
    );
  };

  const renderBadge = (label, value, color = 'var(--color-accent)') => {
    if (!value) return null;
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '6px 12px',
        borderRadius: '16px',
        backgroundColor: color === 'var(--color-accent)' ? 'rgba(154, 132, 101, 0.2)' : 'rgba(138, 122, 104, 0.2)',
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
        backgroundColor: 'var(--color-beige-soft)',
        color: 'var(--color-black)',
      }}>
        <Header />
        <main style={{ flex: 1, padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--color-brown-medium)' }}>Cargando informaciÃ³n...</div>
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
        backgroundColor: 'var(--color-beige-soft)',
        color: 'var(--color-black)',
      }}>
        <Header />
        <main style={{ flex: 1, padding: '20px' }}>
          <button
            onClick={() => router.back()}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-black)',
              fontSize: '24px',
              cursor: 'pointer',
              marginBottom: '20px',
            }}
          >
            â†
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
      backgroundColor: 'var(--color-beige-soft)',
      color: 'var(--color-black)',
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
              backgroundColor: 'var(--color-beige-soft)',
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
          </>
        )}
        {!coverPhoto && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'var(--color-beige)',
          }} />
        )}
        <div style={{
          position: 'relative',
          zIndex: 1,
          padding: '20px',
          paddingTop: '60px',
          width: '100%',
          maxWidth: '960px',
          margin: '0 auto',
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
            â†
          </button>

          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#FFFFFF',
            marginBottom: '8px',
            textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 4px 12px rgba(0,0,0,0.6)',
          }}>
            {especie.nombre_comÃºn || especie.scientific_name}
          </h1>

          {especie.scientific_name && (
            <div style={{
              fontSize: '16px',
              color: 'var(--color-beige-soft)',
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
              color: 'var(--color-beige)',
              marginTop: '8px',
              textShadow: '0 2px 6px rgba(0,0,0,0.8), 0 3px 8px rgba(0,0,0,0.6)',
            }}>
              TambiÃ©n conocida como: {especie.nombres_comunes}
            </div>
          )}
        </div>
      </div>

      <main style={{
        flex: 1,
        padding: '20px',
        paddingBottom: '100px',
        backgroundColor: 'var(--color-beige-soft)',
      }}>
        <div style={{ width: '100%', maxWidth: '960px', margin: '0 auto' }}>
          {/* Badges de informaciÃ³n bÃ¡sica */}
          <div style={{
            marginBottom: '24px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
          }}>
            {(especie.categorÃ­a_de_conservaciÃ³n || especie.categoria_conservacion) &&
              renderBadge('ConservaciÃ³n', especie.categorÃ­a_de_conservaciÃ³n || especie.categoria_conservacion)}
            {especie.EndÃ©mica && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '6px 12px',
                borderRadius: '16px',
                backgroundColor: 'rgba(154, 132, 101, 0.2)',
                color: 'var(--color-accent)',
                fontSize: '12px',
                fontWeight: '500',
                marginRight: '8px',
                marginBottom: '8px',
                border: '1px solid rgba(154, 132, 101, 0.25)',
              }}>
                ðŸ‡¨ðŸ‡± EndÃ©mica de Chile
              </div>
            )}
            {especie.tipo_morfologÃ­a && renderBadge('MorfologÃ­a', especie.tipo_morfologÃ­a, 'var(--color-brown-medium)')}
            {especie.tipo_planta && renderBadge('Tipo', especie.tipo_planta, 'var(--color-brown-medium)')}
          </div>

          {/* GalerÃ­a de imÃ¡genes */}
          {photos.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: 'var(--color-black)',
                marginBottom: '16px',
              }}>
                ImÃ¡genes
              </h2>
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
                      src={resolvePhotoUrl(photo)}
                      alt={`Foto ${index + 1} de ${especie.nombre_comÃºn || especie.scientific_name}`}
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
                onTouchStart={handleModalTouchStart}
                onTouchMove={handleModalTouchMove}
                onTouchEnd={handleModalTouchEnd}
                onTouchCancel={resetModalTouch}
                style={{
                  position: 'relative',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* BotÃ³n cerrar */}
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
                  Ã—
                </button>

                {/* NavegaciÃ³n anterior/siguiente */}
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
                      â€¹
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
                      â€º
                    </button>
                  </>
                )}

                {/* Imagen ampliada */}
                <AuthenticatedImage
                  src={resolvePhotoUrl(photos[selectedImageIndex])}
                  alt={`Foto ${selectedImageIndex + 1} de ${especie.nombre_comÃºn || especie.scientific_name}`}
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

          {/* Secciones de informaciÃ³n */}
          {especie.estado_conservaciÃ³n && renderInfoCard('â“˜', 'Estado de ConservaciÃ³n', especie.estado_conservaciÃ³n)}
          {especie.habitat && renderInfoCard('ðŸŒ', 'HÃ¡bitat', especie.habitat)}
          {especie.distribuciÃ³n && renderInfoCard('ðŸ—ºï¸', 'DistribuciÃ³n', especie.distribuciÃ³n)}
          {especie.expectativa_vida && renderInfoCard('â±ï¸', 'Expectativa de Vida', especie.expectativa_vida)}
          {especie.floraciÃ³n && renderInfoCard('ðŸŒ¸', 'FloraciÃ³n', especie.floraciÃ³n)}
          {especie.cuidado && renderInfoCard('ðŸ’§', 'Cuidado y Recomendaciones', especie.cuidado)}
          {especie.usos && renderInfoCard('ðŸ”§', 'Usos', especie.usos)}
          {especie.historia_nombre && renderInfoCard('ðŸ“–', 'Historia del Nombre', especie.historia_nombre)}
          {especie.historia_y_leyendas && renderInfoCard('ðŸ“š', 'Historia y Leyendas', especie.historia_y_leyendas)}

          {/* Mensaje si no hay informaciÃ³n */}
          {!especie.habitat &&
            !especie.distribuciÃ³n &&
            !especie.floraciÃ³n &&
            !especie.cuidado &&
            !especie.usos &&
            !especie.historia_nombre &&
            !especie.historia_y_leyendas && (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: 'var(--color-brown-medium)',
                fontStyle: 'italic',
              }}>
                No hay informaciÃ³n adicional disponible para esta especie.
              </div>
            )}
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}


