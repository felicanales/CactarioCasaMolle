'use client';

import { useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AuthenticatedImage from '@/components/AuthenticatedImage';
import { resolvePhotoUrl } from '@/utils/images';

const MIN_BELT_ITEMS = 6;
const DEFAULT_SECONDS_PER_ITEM = 4;
const HOVER_PLAYBACK_RATE = 0.35;

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

const getSpeciesSlug = (specie) => {
  return typeof specie?.slug === 'string' ? specie.slug.trim() : '';
};

const getSpeciesKey = (specie, index) => {
  if (specie?.id !== undefined && specie?.id !== null) {
    return `id:${specie.id}`;
  }

  const slug = getSpeciesSlug(specie);
  if (slug) {
    return `slug:${slug}`;
  }

  return `fallback:${getDisplayName(specie, index)}:${index}`;
};

export default function SpeciesVerticalCarousel({
  species = [],
  loading = false,
  emptyText = 'No hay especies para mostrar.',
  secondsPerItem = DEFAULT_SECONDS_PER_ITEM,
}) {
  const router = useRouter();
  const trackRef = useRef(null);

  const beltSpecies = useMemo(() => {
    if (!Array.isArray(species) || species.length === 0) {
      return [];
    }

    const seen = new Set();
    const uniqueSpecies = [];

    species.forEach((specie, index) => {
      if (!specie) {
        return;
      }

      const key = getSpeciesKey(specie, index);
      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      uniqueSpecies.push(specie);
    });

    if (uniqueSpecies.length === 0) {
      return [];
    }

    if (uniqueSpecies.length >= MIN_BELT_ITEMS) {
      return uniqueSpecies;
    }

    const repeats = Math.ceil(MIN_BELT_ITEMS / uniqueSpecies.length);
    return Array.from({ length: repeats }, () => uniqueSpecies).flat();
  }, [species]);

  const scrollSpecies = useMemo(() => {
    if (beltSpecies.length === 0) {
      return [];
    }

    return [...beltSpecies, ...beltSpecies];
  }, [beltSpecies]);

  const animationDuration = `${Math.max(18, beltSpecies.length * secondsPerItem)}s`;
  const carouselStyle = {
    '--carousel-scroll-duration': animationDuration,
    '--species-count': beltSpecies.length || MIN_BELT_ITEMS,
  };
  const setTrackPlaybackRate = useCallback((rate) => {
    const animation = trackRef.current?.getAnimations?.()[0];

    if (!animation) {
      return;
    }

    if (typeof animation.updatePlaybackRate === 'function') {
      animation.updatePlaybackRate(rate);
      return;
    }

    animation.playbackRate = rate;
  }, []);

  const handleMouseEnter = useCallback(() => {
    setTrackPlaybackRate(HOVER_PLAYBACK_RATE);
  }, [setTrackPlaybackRate]);

  const handleMouseLeave = useCallback(() => {
    setTrackPlaybackRate(1);
  }, [setTrackPlaybackRate]);

  if (loading && !beltSpecies.length) {
    return (
      <div className="vertical-carousel" style={carouselStyle}>
        <div className="vertical-carousel-loading">Cargando especies...</div>
      </div>
    );
  }

  if (!beltSpecies.length) {
    return (
      <div className="vertical-carousel" style={carouselStyle}>
        <div className="vertical-carousel-empty">{emptyText}</div>
      </div>
    );
  }

  return (
    <div
      className="vertical-carousel"
      style={carouselStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="vertical-carousel-viewport">
        <div className="vertical-carousel-track" ref={trackRef}>
          {scrollSpecies.map((specie, index) => {
            const coverPhoto = getCoverPhoto(specie);
            const name = getDisplayName(specie, index);
            const slug = getSpeciesSlug(specie);
            const canNavigate = Boolean(slug);
            const handleNavigate = () => {
              if (canNavigate) {
                router.push(`/especies/${slug}`);
              }
            };

            return (
              <div key={`${getSpeciesKey(specie, index)}-${index}`} className="vertical-carousel-slide">
                <div
                  className={`grid-item vertical-carousel-item${canNavigate ? '' : ' vertical-carousel-item-static'}`}
                  role={canNavigate ? 'button' : undefined}
                  tabIndex={canNavigate ? 0 : -1}
                  aria-disabled={canNavigate ? undefined : true}
                  onClick={handleNavigate}
                  onKeyDown={(event) => {
                    if (canNavigate && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      handleNavigate();
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
