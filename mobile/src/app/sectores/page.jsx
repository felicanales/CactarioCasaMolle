'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import { sectorsApi } from '@/utils/api';

export default function Sectores() {
  const [sectores, setSectores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    loadSectores();
  }, []);

  const loadSectores = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Cargando sectores desde:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');
      const response = await sectorsApi.list();
      console.log('Respuesta de sectores:', response.data);
      
      if (response.data && Array.isArray(response.data)) {
        setSectores(response.data);
      } else {
        console.warn('Respuesta no es un array:', response.data);
        setSectores([]);
      }
    } catch (err) {
      console.error('Error al cargar sectores:', err);
      const errorMessage = err.response?.data?.message || err.message || 'No se pudieron cargar los sectores';
      setError(`Error: ${errorMessage}`);
      setSectores([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSectorClick = (sector) => {
    const qrCode = sector.qr_code || sector.qrCode || `SECTOR${sector.id}`;
    router.push(`/sectores/${qrCode}/especies`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <main className="main-content">
        <h1>Sectores</h1>

        {loading ? (
          <div className="loading">Cargando sectores...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <div className="grid-2-col">
            {sectores.map((sector) => (
              <div
                key={sector.id}
                className="grid-item"
                onClick={() => handleSectorClick(sector)}
                style={{ cursor: 'pointer' }}
              >
                <div className="grid-item-image">foto</div>
                <div className="grid-item-text">
                  {sector.name || sector.nombre || `Sector ${sector.id}`}
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

