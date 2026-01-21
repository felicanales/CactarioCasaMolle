'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AuthenticatedImage from '@/components/AuthenticatedImage';
import { resolvePhotoUrl } from '@/utils/images';

const MIN_VISIBLE_ITEMS = 3;
const DEFAULT_SECONDS_PER_ITEM = 4;

const getDisplayName = (specie, index) => {
  return (
    specie?.nombre_comun ||
    specie?.['nombre_com\u00fan'] ||
    specie?.nombre ||
    specie?.scientific_name ||
    specie?.name ||
    `Especie ${specie?.id || index + 1}`
  );
};

const getCoverPhoto = (specie) => {
  return resolvePhotoUrl(
    specie?.cover_photo ||
      specie?.coverPhoto ||
      specie?.photo ||
      (Array.isArray(specie?.photos) ? specie.photos[0] : null)
  );
};

export default function SpeciesVerticalCarousel({
  species = [],
  loading = false,
  emptyText = 'No hay especies para mostrar.',
  secondsPerItem = DEFAULT_SECONDS_PER_ITEM,
}) {
  const router = useRouter();
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const animationRef = useRef(null);
  const lastTimeRef = useRef(null);
  const resumeTimeoutRef = useRef(null);
  const halfHeightRef = useRef(0);
  const itemHeightRef = useRef(0);
  const userInteractingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const normalizedSpecies = useMemo(() => {
    if (!Array.isArray(species) || species.length === 0) {
      return [];
    }

    if (species.length >= MIN_VISIBLE_ITEMS) {
      return species;
    }

    const repeats = Math.ceil(MIN_VISIBLE_ITEMS / species.length);
    return Array.from({ length: repeats }, () => species).flat();
  }, [species]);

  const scrollSpecies = useMemo(() => {
    if (normalizedSpecies.length === 0) {
      return [];
    }

    return [...normalizedSpecies, ...normalizedSpecies];
  }, [normalizedSpecies]);

  const updateMeasurements = useCallback(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) {
      return;
    }

    const firstSlide = track.querySelector('.vertical-carousel-slide');
    itemHeightRef.current = firstSlide ? firstSlide.offsetHeight : 0;
    halfHeightRef.current = track.scrollHeight / 2;

    if (halfHeightRef.current > 0 && viewport.scrollTop === 0) {
      viewport.scrollTop = halfHeightRef.current;
    }
  }, []);

  const stopAutoScroll = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    lastTimeRef.current = null;
  }, []);

  const startAutoScroll = useCallback(() => {
    if (animationRef.current) {
      return;
    }

    const step = (time) => {
      const viewport = viewportRef.current;
      if (!viewport) {
        animationRef.current = null;
        return;
      }

      if (lastTimeRef.current == null) {
        lastTimeRef.current = time;
        animationRef.current = requestAnimationFrame(step);
        return;
      }

      const deltaSeconds = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      const speed = itemHeightRef.current > 0 ? itemHeightRef.current / secondsPerItem : 0;
      viewport.scrollTop += speed * deltaSeconds;

      const halfHeight = halfHeightRef.current;
      if (halfHeight > 0) {
        if (viewport.scrollTop >= halfHeight) {
          viewport.scrollTop -= halfHeight;
        } else if (viewport.scrollTop <= 0) {
          viewport.scrollTop += halfHeight;
        }
      }

      animationRef.current = requestAnimationFrame(step);
    };

    animationRef.current = requestAnimationFrame(step);
  }, [secondsPerItem]);

  const scheduleResume = useCallback(() => {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
    }

    resumeTimeoutRef.current = setTimeout(() => {
      userInteractingRef.current = false;
      startAutoScroll();
    }, 1500);
  }, [startAutoScroll]);

  const handleWheel = useCallback(() => {
    userInteractingRef.current = true;
    stopAutoScroll();
    scheduleResume();
  }, [scheduleResume, stopAutoScroll]);

  const handleScroll = useCallback(() => {
    const viewport = viewportRef.current;
    const halfHeight = halfHeightRef.current;

    if (!viewport || halfHeight === 0) {
      return;
    }

    if (viewport.scrollTop >= halfHeight) {
      viewport.scrollTop -= halfHeight;
    } else if (viewport.scrollTop <= 0) {
      viewport.scrollTop += halfHeight;
    }

    if (userInteractingRef.current) {
      scheduleResume();
    }
  }, [scheduleResume]);

  useEffect(() => {
    if (!normalizedSpecies.length || loading) {
      return;
    }

    updateMeasurements();
    startAutoScroll();
    return () => {
      stopAutoScroll();
    };
  }, [loading, normalizedSpecies.length, startAutoScroll, stopAutoScroll, updateMeasurements]);

  useEffect(() => {
    const handleResize = () => {
      updateMeasurements();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateMeasurements]);

  if (loading) {
    return <div className="vertical-carousel-loading">Cargando especies...</div>;
  }

  if (!normalizedSpecies.length) {
    return <div className="vertical-carousel-empty">{emptyText}</div>;
  }

  return (
    <div className="vertical-carousel">
      <div
        className="vertical-carousel-viewport"
        ref={viewportRef}
        onWheel={handleWheel}
        onScroll={handleScroll}
      >
        <div className="vertical-carousel-track" ref={trackRef}>
          {scrollSpecies.map((specie, index) => {
            const coverPhoto = getCoverPhoto(specie);
            const name = getDisplayName(specie, index);
            const slug = specie?.slug || `especie-${specie?.id || index + 1}`;

            return (
              <div key={`${specie?.id || slug}-${index}`} className="vertical-carousel-slide">
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
                          objectPosition: 'center',
                          borderRadius: '8px',
                        }}
                      />
                    ) : (
                      <div className="vertical-carousel-placeholder">Sin imagen</div>
                    )}
                  </div>
                  <div className="grid-item-text">{name}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
