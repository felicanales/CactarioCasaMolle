'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import SpeciesVerticalCarousel from '@/components/SpeciesVerticalCarousel';
import { speciesApi } from '@/utils/api';

const CAROUSEL_SECONDS_PER_ITEM = 4;

export default function Header() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [featuredSpecies, setFeaturedSpecies] = useState([]);
  const [speciesLoading, setSpeciesLoading] = useState(false);
  const [speciesError, setSpeciesError] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const media = window.matchMedia('(min-width: 1024px)');
    const updateMatches = () => setIsDesktop(media.matches);
    updateMatches();

    if (media.addEventListener) {
      media.addEventListener('change', updateMatches);
      return () => media.removeEventListener('change', updateMatches);
    }

    media.addListener(updateMatches);
    return () => media.removeListener(updateMatches);
  }, []);

  useEffect(() => {
    if (!isDesktop) {
      return;
    }

    let isActive = true;

    const loadFeaturedSpecies = async () => {
      try {
        setSpeciesLoading(true);
        setSpeciesError(false);
        const response = await speciesApi.list();
        const data = Array.isArray(response?.data) ? response.data : [];
        if (isActive) {
          setFeaturedSpecies(data.slice(0, 8));
        }
      } catch (error) {
        console.error('Error loading featured species:', error);
        if (isActive) {
          setSpeciesError(true);
          setFeaturedSpecies([]);
        }
      } finally {
        if (isActive) {
          setSpeciesLoading(false);
        }
      }
    };

    loadFeaturedSpecies();

    return () => {
      isActive = false;
    };
  }, [isDesktop]);

  return (
    <header className="header">
      <div className="header-logo-container">
        <div className="header-logo">
          <Image src="/logo.png" alt="Cactuario CasaMolle" width={48} height={48} priority />
        </div>
        <div className="header-title">Cactario CasaMolle</div>
      </div>
      {isDesktop && (
        <div className="header-species-carousel">
            <SpeciesVerticalCarousel
              species={featuredSpecies}
              loading={speciesLoading}
              secondsPerItem={CAROUSEL_SECONDS_PER_ITEM}
              emptyText={speciesError ? 'No se pudieron cargar las especies.' : 'No hay especies para mostrar.'}
            />
        </div>
      )}
      <div className="header-cactus">{'\u{1F335}'}</div>
    </header>
  );
}

