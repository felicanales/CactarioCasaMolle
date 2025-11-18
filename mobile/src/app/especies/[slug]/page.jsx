'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import ImageCarousel from '@/components/ImageCarousel';
import AuthenticatedImage from '@/components/AuthenticatedImage';
import { speciesApi } from '@/utils/api';

export default function EspecieDetail() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug;
  
  const [especie, setEspecie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const fotos = especie?.fotos || especie?.imagenes || especie?.cover_photo ? [
    { id: 1, url: especie.cover_photo },
  ] : [];

  const renderSection = (title, content) => {
    if (!content || (typeof content === 'string' && content.trim() === '')) {
      return null;
    }
    return (
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          color: '#111827', 
          marginBottom: '12px' 
        }}>
          {title}
        </h2>
        <div style={{
          backgroundColor: '#f9fafb',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          color: '#374151',
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap',
        }}>
          {content}
        </div>
      </div>
    );
  };

  const renderBadge = (label, value) => {
    if (!value) return null;
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '6px 12px',
        borderRadius: '16px',
        backgroundColor: '#eff6ff',
        color: '#1e40af',
        fontSize: '13px',
        fontWeight: '500',
        marginRight: '8px',
        marginBottom: '8px',
      }}>
        {label}: {value}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <main className="main-content">
        <button
          className="back-button"
          onClick={() => router.back()}
          aria-label="Volver"
        >
          ←
        </button>
        
        {loading ? (
          <div className="loading">Cargando información...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : especie ? (
          <>
            {/* Imagen de portada */}
            {especie.cover_photo && (
              <div style={{ marginBottom: '24px' }}>
                <AuthenticatedImage
                  src={especie.cover_photo}
                  alt={especie.nombre_común || especie.scientific_name}
                  style={{
                    width: '100%',
                    maxHeight: '300px',
                    objectFit: 'cover',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  }}
                />
              </div>
            )}

            {/* Nombre científico y común */}
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{
                fontSize: '24px',
                fontWeight: '700',
                fontStyle: 'italic',
                color: '#111827',
                marginBottom: '8px',
              }}>
                {especie.scientific_name || 'Nombre científico no disponible'}
              </h1>
              {especie.nombre_común && (
                <p style={{
                  fontSize: '18px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '4px',
                }}>
                  {especie.nombre_común}
                </p>
              )}
              {especie.nombres_comunes && especie.nombres_comunes !== especie.nombre_común && (
                <p style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  fontStyle: 'italic',
                }}>
                  Otros nombres: {especie.nombres_comunes}
                </p>
              )}
            </div>

            {/* Información básica - badges */}
            <div style={{ 
              marginBottom: '24px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
            }}>
              {especie.categoria_conservacion && renderBadge('Conservación', especie.categoria_conservacion)}
              {especie.Endémica && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '6px 12px',
                  borderRadius: '16px',
                  backgroundColor: '#ecfdf5',
                  color: '#065f46',
                  fontSize: '13px',
                  fontWeight: '500',
                  marginRight: '8px',
                  marginBottom: '8px',
                }}>
                  🇨🇱 Endémica de Chile
                </div>
              )}
              {especie.tipo_morfología && renderBadge('Morfología', especie.tipo_morfología)}
              {especie.tipo_planta && renderBadge('Tipo', especie.tipo_planta)}
            </div>

            {/* Estado de conservación */}
            {especie.estado_conservación && renderSection('Estado de Conservación', especie.estado_conservación)}

            {/* Hábitat */}
            {especie.habitat && renderSection('Hábitat', especie.habitat)}

            {/* Distribución */}
            {especie.distribución && renderSection('Distribución', especie.distribución)}

            {/* Expectativa de vida */}
            {especie.expectativa_vida && renderSection('Expectativa de Vida', especie.expectativa_vida)}

            {/* Floración */}
            {especie.floración && renderSection('Floración', especie.floración)}

            {/* Cuidado */}
            {especie.cuidado && renderSection('Cuidado y Recomendaciones', especie.cuidado)}

            {/* Usos */}
            {especie.usos && renderSection('Usos', especie.usos)}

            {/* Historia del nombre */}
            {especie.historia_nombre && renderSection('Historia del Nombre', especie.historia_nombre)}

            {/* Historia y leyendas */}
            {especie.historia_y_leyendas && renderSection('Historia y Leyendas', especie.historia_y_leyendas)}

            {/* Galería de imágenes */}
            {fotos.length > 0 && (
              <div style={{ marginTop: '24px' }}>
                <h2 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  color: '#111827', 
                  marginBottom: '12px' 
                }}>
                  Galería de Imágenes
                </h2>
                <ImageCarousel 
                  images={fotos} 
                  placeholderText={`Fotos de ${especie.nombre_común || especie.scientific_name}`}
                />
              </div>
            )}

            {/* Mensaje si no hay información adicional */}
            {!especie.habitat && 
             !especie.distribución && 
             !especie.floración && 
             !especie.cuidado && 
             !especie.usos && 
             !especie.historia_nombre && 
             !especie.historia_y_leyendas && (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                color: '#6b7280',
                fontStyle: 'italic',
              }}>
                No hay información adicional disponible para esta especie.
              </div>
            )}
          </>
        ) : null}
      </main>
      <BottomNavigation />
    </div>
  );
}
