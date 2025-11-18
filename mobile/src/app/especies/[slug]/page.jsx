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
  const [activeTab, setActiveTab] = useState('informacion');

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
          backgroundColor: '#1f2937',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '12px',
          border: '1px solid #374151',
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
            color: '#ffffff',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span>{title}</span>
            {onClick && (
              <span style={{ color: '#10b981', fontSize: '18px' }}>›</span>
            )}
          </div>
          <div style={{
            fontSize: '14px',
            color: '#d1d5db',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
          }}>
            {content}
          </div>
        </div>
      </div>
    );
  };

  const renderBadge = (label, value, color = '#10b981') => {
    if (!value) return null;
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '6px 12px',
        borderRadius: '16px',
        backgroundColor: color === '#10b981' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
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
        backgroundColor: '#111827',
        color: '#ffffff',
      }}>
        <Header />
        <main style={{ flex: 1, padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#9ca3af' }}>Cargando información...</div>
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
        backgroundColor: '#111827',
        color: '#ffffff',
      }}>
        <Header />
        <main style={{ flex: 1, padding: '20px' }}>
          <button
            onClick={() => router.back()}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              fontSize: '24px',
              cursor: 'pointer',
              marginBottom: '20px',
            }}
          >
            ←
          </button>
          <div style={{ color: '#ef4444' }}>{error || 'Especie no encontrada'}</div>
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
      backgroundColor: '#111827',
      color: '#ffffff',
    }}>
      <Header />
      
      {/* Header con imagen de fondo */}
      <div style={{
        position: 'relative',
        width: '100%',
        minHeight: '280px',
        overflow: 'hidden',
      }}>
        {coverPhoto && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `url(${coverPhoto})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(20px) brightness(0.4)',
            transform: 'scale(1.1)',
          }} />
        )}
        <div style={{
          position: 'relative',
          zIndex: 1,
          padding: '20px',
          paddingTop: '60px',
        }}>
          <button
            onClick={() => router.back()}
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              color: '#ffffff',
              fontSize: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ←
          </button>
          
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            color: '#ffffff',
            fontSize: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            ⋮
          </div>

          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#ffffff',
            marginBottom: '8px',
            textShadow: '0 2px 8px rgba(0,0,0,0.5)',
          }}>
            {especie.nombre_común || especie.scientific_name}
          </h1>
          
          {especie.scientific_name && (
            <div style={{
              fontSize: '16px',
              color: '#d1d5db',
              fontStyle: 'italic',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span>{especie.scientific_name}</span>
              <span style={{ fontSize: '18px', cursor: 'pointer' }}>🔊</span>
            </div>
          )}

          {especie.nombres_comunes && (
            <div style={{
              fontSize: '14px',
              color: '#9ca3af',
              marginTop: '8px',
            }}>
              También conocida como: {especie.nombres_comunes}
            </div>
          )}
        </div>
      </div>

      {/* Tabs de navegación */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #374151',
        backgroundColor: '#111827',
      }}>
        <button
          onClick={() => setActiveTab('notas')}
          style={{
            flex: 1,
            padding: '16px',
            background: 'none',
            border: 'none',
            color: activeTab === 'notas' ? '#10b981' : '#9ca3af',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer',
            borderBottom: activeTab === 'notas' ? '2px solid #10b981' : '2px solid transparent',
          }}
        >
          Notas
        </button>
        <button
          onClick={() => setActiveTab('informacion')}
          style={{
            flex: 1,
            padding: '16px',
            background: 'none',
            border: 'none',
            color: activeTab === 'informacion' ? '#10b981' : '#9ca3af',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer',
            borderBottom: activeTab === 'informacion' ? '2px solid #10b981' : '2px solid transparent',
          }}
        >
          Información
        </button>
      </div>

      <main style={{ 
        flex: 1, 
        padding: '20px',
        paddingBottom: '100px',
        backgroundColor: '#111827',
      }}>
        {activeTab === 'informacion' && (
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
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  color: '#10b981',
                  fontSize: '12px',
                  fontWeight: '500',
                  marginRight: '8px',
                  marginBottom: '8px',
                  border: '1px solid #10b98140',
                }}>
                  🇨🇱 Endémica de Chile
                </div>
              )}
              {especie.tipo_morfología && renderBadge('Morfología', especie.tipo_morfología, '#3b82f6')}
              {especie.tipo_planta && renderBadge('Tipo', especie.tipo_planta, '#3b82f6')}
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
                    color: '#ffffff',
                  }}>
                    Imágenes
                  </h2>
                  <span style={{ color: '#9ca3af', fontSize: '18px', cursor: 'pointer' }}>⋮</span>
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
                      style={{
                        minWidth: '120px',
                        width: '120px',
                        height: '120px',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        flexShrink: 0,
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
                color: '#6b7280',
                fontStyle: 'italic',
              }}>
                No hay información adicional disponible para esta especie.
              </div>
            )}
          </>
        )}

        {activeTab === 'notas' && (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: '#6b7280',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
            <div>Las notas estarán disponibles próximamente</div>
          </div>
        )}
      </main>
      
      <BottomNavigation />
    </div>
  );
}
