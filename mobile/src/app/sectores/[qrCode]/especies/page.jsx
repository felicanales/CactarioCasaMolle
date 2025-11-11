'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import { sectorsApi, speciesApi } from '@/utils/api';

export default function SectorEspecies() {
  const params = useParams();
  const router = useRouter();
  const qrCode = params.qrCode;
  
  const [especies, setEspecies] = useState([]);
  const [sector, setSector] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (qrCode) {
      loadSectorData();
    }
  }, [qrCode]);

  const loadSectorData = async () => {
    try {
      setLoading(true);
      
      // Cargar información del sector
      const sectorResponse = await sectorsApi.getByQr(qrCode);
      setSector(sectorResponse.data);
      
      // Cargar especies del sector
      const speciesResponse = await sectorsApi.getSpeciesByQr(qrCode);
      console.log('Especies cargadas:', speciesResponse.data);
      setEspecies(speciesResponse.data || []);
    } catch (err) {
      console.error('Error al cargar datos del sector:', err);
      const errorMessage = err.response?.data?.message || err.message || 'No se pudieron cargar los datos del sector';
      setError(`Error: ${errorMessage}`);
      setSector({ name: `Sector ${qrCode}`, qr_code: qrCode });
      setEspecies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEspecieClick = (especie) => {
    const slug = especie.slug || `especie-${especie.id}`;
    router.push(`/especies/${slug}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <main className="main-content">
        <button
          className="back-button"
          onClick={() => router.push('/sectores')}
          aria-label="Volver"
        >
          ←
        </button>
        
        <h1>
          Especies presentes en el sector {sector?.name || sector?.nombre || qrCode}
        </h1>

        {loading ? (
          <div className="loading">Cargando especies...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : especies.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF' }}>
            No hay especies registradas en este sector
          </div>
        ) : (
          <div className="grid-2-col">
            {especies.map((especie) => (
              <div
                key={especie.id}
                className="grid-item"
                onClick={() => handleEspecieClick(especie)}
                style={{ cursor: 'pointer' }}
              >
                <div className="grid-item-image">foto</div>
                <div className="grid-item-text">
                  {especie.nombre_común || especie.nombre || especie.scientific_name || especie.name || `Nombre de la Especie`}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <BottomNavigation />
    </div>
  );
}

