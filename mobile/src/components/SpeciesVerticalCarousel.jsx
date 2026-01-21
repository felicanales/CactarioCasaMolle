'use client';

import { useEffect, useMemo, useRef } from 'react';
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
  const trackRef = useRef(null);
  const animationRef = useRef(null);
  const lastTimeRef = useRef(0);
  const offsetRef = useRef(0);
  const contentHeightRef = useRef(0);

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

  const totalDuration = Math.max(6, normalizedSpecies.length * secondsPerItem);

  useEffect(() => {
    if (loading || !normalizedSpecies.length || !trackRef.current) {
      return undefined;
    }

    const track = trackRef.current;
    offsetRef.current = 0;
    lastTimeRef.current = 0;

    const updateMetrics = () => {
      const trackHeight = track.scrollHeight;
      if (!trackHeight) {
        return false;
      }
      contentHeightRef.current = trackHeight / 2;
      return contentHeightRef.current > 0;
    };

    const step = (timestamp) => {
      if (!contentHeightRef.current && !updateMetrics()) {
        animationRef.current = requestAnimationFrame(step);
        return;
      }

      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }
      const deltaSeconds = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      const speed = contentHeightRef.current / totalDuration;
      offsetRef.current = (offsetRef.current + speed * deltaSeconds) % contentHeightRef.current;
      track.style.transform = `translateY(${offsetRef.current - contentHeightRef.current}px)`;

      animationRef.current = requestAnimationFrame(step);
    };

    animationRef.current = requestAnimationFrame(step);

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateMetrics();
      });
      resizeObserver.observe(track);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      track.style.transform = '';
    };
  }, [loading, normalizedSpecies.length, totalDuration]);

  if (loading) {
    return <div className="vertical-carousel-loading">Cargando especies...</div>;
  }

  if (!normalizedSpecies.length) {
    return <div className="vertical-carousel-empty">{emptyText}</div>;
  }

  return (
    <div className="vertical-carousel">
      <div className="vertical-carousel-viewport">
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
