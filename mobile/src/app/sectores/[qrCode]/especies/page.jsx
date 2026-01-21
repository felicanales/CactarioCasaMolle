'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import AuthenticatedImage from '@/components/AuthenticatedImage';
import { sectorsApi } from '@/utils/api';
import { resolvePhotoUrl } from '@/utils/images';

const SECTOR_CACHE_TTL = 5 * 60 * 1000;

const getSectorCacheKey = (qrCode) => `sector_species_cache_${qrCode}`;

const readSectorCache = (qrCode) => {
  if (typeof window === 'undefined') return null;
  try {
    const cachedRaw = sessionStorage.getItem(getSectorCacheKey(qrCode));
    if (!cachedRaw) return null;
    const cached = JSON.parse(cachedRaw);
    if (!cached?.timestamp) return null;
    if (Date.now() - cached.timestamp > SECTOR_CACHE_TTL) return null;
    return cached;
  } catch {
    return null;
  }
};

const writeSectorCache = (qrCode, data) => {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(getSectorCacheKey(qrCode), JSON.stringify({
      timestamp: Date.now(),
      sector: data.sector || null,
      especies: Array.isArray(data.especies) ? data.especies : [],
    }));
  } catch {}
};

export default function SectorEspecies() {
  const params = useParams();
  const router = useRouter();
  const qrCode = params.qrCode;
  
  const [especies, setEspecies] = useState([]);
  const [sector, setSector] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const hasCachedRef = useRef(false);
  const sectorName = sector?.name || sector?.nombre;

  const itemsPerPage = 25;
  const totalPages = Math.ceil(especies.length / itemsPerPage);
  const safePage = totalPages > 0 ? Math.min(currentPage, totalPages) : 1;
  const startIndex = (safePage - 1) * itemsPerPage;
  const pagedSpecies = especies.slice(startIndex, startIndex + itemsPerPage);
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);

  useEffect(() => {
    if (qrCode) {
      const cached = readSectorCache(qrCode);
      if (cached) {
        hasCachedRef.current = true;
        setSector(cached.sector || null);
        setEspecies(Array.isArray(cached.especies) ? cached.especies : []);
        setLoading(false);
      }
      loadSectorData({ background: hasCachedRef.current });
    }
  }, [qrCode]);

  useEffect(() => {
    setCurrentPage(1);
  }, [qrCode]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const loadSectorData = async ({ background = false } = {}) => {
    try {
      if (!background) {
        setLoading(true);
        setError(null);
      }
      
      const [sectorResult, speciesResult] = await Promise.allSettled([
        sectorsApi.getByQr(qrCode),
        sectorsApi.getSpeciesByQr(qrCode),
      ]);

      const nextSector = sectorResult.status === 'fulfilled' ? sectorResult.value.data : null;
      const nextSpecies = speciesResult.status === 'fulfilled' ? (speciesResult.value.data || []) : null;

      if (nextSector) {
        setSector(nextSector);
      }

      if (nextSpecies) {
        console.log('Especies cargadas:', nextSpecies);
        setEspecies(nextSpecies);
      }

      if (nextSector || nextSpecies) {
        writeSectorCache(qrCode, {
          sector: nextSector,
          especies: nextSpecies || [],
        });
      }

      if (sectorResult.status === 'rejected' && speciesResult.status === 'rejected') {
        throw sectorResult.reason;
      }
    } catch (err) {
      console.error('Error al cargar datos del sector:', err);
      const errorMessage = err.response?.data?.message || err.message || 'No se pudieron cargar los datos del sector';
      if (!hasCachedRef.current) {
        setError(`Error: ${errorMessage}`);
        setSector({ name: `Sector ${qrCode}`, qr_code: qrCode });
        setEspecies([]);
      }
    } finally {
      if (!background) {
        setLoading(false);
      }
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
          {sectorName ? `Especies presentes en ${sectorName}` : 'Especies presentes'}
        </h1>

        {loading ? (
          <div className="loading">Cargando especies...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : especies.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-muted)' }}>
            No hay especies registradas en este sector
          </div>
        ) : (
          <div>
            <div className="grid-2-col">
              {pagedSpecies.map((especie) => (
              <div
                key={especie.id}
                className="grid-item"
                onClick={() => handleEspecieClick(especie)}
                style={{ cursor: 'pointer' }}
              >
                <div className="grid-item-image">
                  {especie.cover_photo ? (
                    <AuthenticatedImage
                      src={resolvePhotoUrl(especie.cover_photo)}
                      alt={especie.nombre_común || especie.scientific_name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '8px',
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'var(--color-beige-soft)',
                      borderRadius: '8px',
                      color: 'var(--color-muted)',
                      fontSize: '48px',
                    }}>
                      🌵
                    </div>
                  )}
                </div>
                <div className="grid-item-text">
                  {especie.nombre_común || especie.nombre || especie.scientific_name || especie.name || `Nombre de la Especie`}
                </div>
              </div>
            ))}
            </div>
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                flexWrap: 'wrap',
                marginTop: '12px',
              }}>
                <button
                  type="button"
                  onClick={() => setCurrentPage(safePage - 1)}
                  disabled={safePage === 1}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-gray-light)',
                    backgroundColor: safePage === 1 ? 'var(--color-gray-light)' : 'var(--color-white)',
                    color: 'var(--color-black)',
                    cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Anterior
                </button>
                {pageNumbers.map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-gray-light)',
                      backgroundColor: page === safePage ? 'var(--color-black)' : 'var(--color-white)',
                      color: page === safePage ? 'var(--color-white)' : 'var(--color-black)',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage(safePage + 1)}
                  disabled={safePage === totalPages}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-gray-light)',
                    backgroundColor: safePage === totalPages ? 'var(--color-gray-light)' : 'var(--color-white)',
                    color: 'var(--color-black)',
                    cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        )}
      </main>
      <BottomNavigation />
    </div>
  );
}

