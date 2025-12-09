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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://cactariocasamolle-production.up.railway.app';
      console.log('[SectoresPage] Cargando sectores desde:', apiUrl);
      
      const response = await sectorsApi.list();
      console.log('[SectoresPage] Respuesta recibida:', response);
      console.log('[SectoresPage] Respuesta data:', response.data);
      console.log('[SectoresPage] Tipo de respuesta data:', typeof response.data);
      console.log('[SectoresPage] Es array?', Array.isArray(response.data));
      
      // Asegurarnos de obtener los datos correctamente
      let data = response.data;
      
      // Si la respuesta es directamente un array (caso edge)
      if (Array.isArray(response)) {
        data = response;
      } else if (response && response.data) {
        data = response.data;
      }
      
      if (data && Array.isArray(data)) {
        console.log(`[SectoresPage] Se encontraron ${data.length} sectores`);
        setSectores(data);
      } else {
        console.warn('[SectoresPage] Respuesta no es un array. Tipo:', typeof data, 'Valor:', data);
        setSectores([]);
      }
    } catch (err) {
      console.error('[SectoresPage] Error al cargar sectores:', err);
      console.error('[SectoresPage] Error code:', err.code);
      console.error('[SectoresPage] Error message:', err.message);
      console.error('[SectoresPage] Error response:', err.response);
      console.error('[SectoresPage] Error response data:', err.response?.data);
      
      let errorMessage = 'No se pudieron cargar los sectores';
      
      // Manejo específico de timeouts
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'La solicitud tardó demasiado. El servidor puede estar sobrecargado o hay problemas de conexión. Por favor, intenta nuevamente.';
      } else if (err.code === 'ECONNREFUSED' || !err.response) {
        errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
      } else if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        } else if (err.response.data.detail) {
          errorMessage = err.response.data.detail;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
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
        ) : sectores.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
            No se encontraron sectores
          </div>
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

