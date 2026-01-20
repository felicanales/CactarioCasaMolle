'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthenticatedImage from '@/components/AuthenticatedImage';
import { resolvePhotoUrl } from '@/utils/images';

export default function SpeciesVerticalCarousel({
  species = [],
  loading = false,
  autoRotate = true,
  rotationInterval = 5000,
  emptyText = 'No hay especies para mostrar.',
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartYRef = useRef(null);
  const touchLastYRef = useRef(null);
  const isSwipingRef = useRef(false);
  const router = useRouter();

  const resetTouchState = () => {
    touchStartYRef.current = null;
    touchLastYRef.current = null;
    isSwipingRef.current = false;
  };

  const nextSpecie = () => {
    setCurrentIndex((prev) => (prev + 1) % species.length);
  };

  const prevSpecie = () => {
    setCurrentIndex((prev) => (prev - 1 + species.length) % species.length);
  };

  const goToSpecie = (index) => {
    setCurrentIndex(index);
  };

  const handleTouchStart = (event) => {
    if (!species || species.length <= 1) {
      return;
    }

    const touch = event.touches[0];
    touchStartYRef.current = touch.clientY;
    touchLastYRef.current = touch.clientY;
    isSwipingRef.current = false;
  };

  const handleTouchMove = (event) => {
    if (touchStartYRef.current === null) {
      return;
    }

    const touch = event.touches[0];
    touchLastYRef.current = touch.clientY;

    const deltaY = touch.clientY - touchStartYRef.current;
    if (Math.abs(deltaY) > 10) {
      isSwipingRef.current = true;
    }
  };

  const handleTouchEnd = () => {
    if (touchStartYRef.current === null || touchLastYRef.current === null) {
      resetTouchState();
      return;
    }

    const deltaY = touchLastYRef.current - touchStartYRef.current;
    if (isSwipingRef.current && Math.abs(deltaY) > 40) {
      if (deltaY < 0) {
        nextSpecie();
      } else {
        prevSpecie();
      }
    }

    resetTouchState();
  };

  useEffect(() => {
    if (!autoRotate || !species || species.length <= 1) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % species.length);
    }, rotationInterval);

    return () => clearInterval(interval);
  }, [species, autoRotate, rotationInterval]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [species]);

  if (loading) {
    return (
      <div className="vertical-carousel-loading">
        Cargando especies...
      </div>
    );
  }

  if (!species || species.length === 0) {
    return (
      <div className="vertical-carousel-empty">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="vertical-carousel">
      <div
        className="vertical-carousel-viewport"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={resetTouchState}
      >
        <div
          className="vertical-carousel-track"
          style={{ transform: `translateY(-${currentIndex * 100}%)` }}
        >
          {species.map((specie, index) => {
            const coverPhoto = resolvePhotoUrl(
              specie.cover_photo || specie.coverPhoto || specie.photo || (Array.isArray(specie.photos) ? specie.photos[0] : null)
            );
            const name =
              specie.nombre_común ||
              specie.nombre ||
              specie.scientific_name ||
              specie.name ||
              `Especie ${specie.id || index + 1}`;
            const slug = specie.slug || `especie-${specie.id || index + 1}`;

            return (
              <div key={specie.id || slug} className="vertical-carousel-slide">
                <div
                  className="grid-item vertical-carousel-item"
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/especies/${slug}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      router.push(`/especies/${slug}`);
                    }
                  }}
                >
                  <div className="grid-item-image">
                    {coverPhoto ? (
                      <AuthenticatedImage
                        src={coverPhoto}
                        alt={name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '8px',
                        }}
                      />
                    ) : (
                      <div className="vertical-carousel-placeholder">
                        🌵
                      </div>
                    )}
                  </div>
                  <div className="grid-item-text">{name}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {species.length > 1 && (
        <>
          <button
            className="vertical-carousel-arrow vertical-carousel-arrow-up"
            onClick={prevSpecie}
            aria-label="Especie anterior"
          >
            ↑
          </button>
          <button
            className="vertical-carousel-arrow vertical-carousel-arrow-down"
            onClick={nextSpecie}
            aria-label="Siguiente especie"
          >
            ↓
          </button>
          <div className="vertical-carousel-indicators">
            {species.map((_, index) => (
              <button
                key={index}
                className={`vertical-carousel-indicator ${index === currentIndex ? 'active' : ''}`}
                onClick={() => goToSpecie(index)}
                aria-label={`Ir a especie ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
