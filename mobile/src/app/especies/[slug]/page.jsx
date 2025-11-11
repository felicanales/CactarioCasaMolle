'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import ImageCarousel from '@/components/ImageCarousel';
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
      // Datos de ejemplo para desarrollo
      setEspecie({
        nombre: `Especie ${slug}`,
        descripcion: 'Descripción del cactus. Información detallada sobre la especie, sus características, hábitat natural, cuidados y otros datos relevantes.',
        fotos: [
          { id: 1, url: null },
          { id: 2, url: null },
          { id: 3, url: null },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const fotos = especie?.fotos || especie?.imagenes || [
    { id: 1, placeholder: true },
    { id: 2, placeholder: true },
    { id: 3, placeholder: true },
  ];

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
            <h1>{especie.nombre_común || especie.nombre || especie.scientific_name || especie.name || `Especie ${slug}`}</h1>

            <ImageCarousel 
              images={fotos} 
              placeholderText={`Fotos de la especie ${slug}`}
            />

            <div style={{ marginTop: '24px' }}>
              <h2>Descripción del Cactus:</h2>
              <div
                style={{
                  backgroundColor: '#E5E7EB',
                  padding: '16px',
                  borderRadius: '8px',
                  minHeight: '100px',
                  color: '#111827',
                }}
              >
                {especie.descripcion || especie.description || 'Descripción no disponible.'}
              </div>
            </div>
          </>
        ) : null}
      </main>
      <BottomNavigation />
    </div>
  );
}

