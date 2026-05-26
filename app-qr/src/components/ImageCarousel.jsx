'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { resolvePhotoUrl } from '@/utils/images';

export default function ImageCarousel({ images, placeholderText = 'Foto', autoRotate = true, rotationInterval = 5000 }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);
  const touchLastXRef = useRef(null);
  const isSwipingRef = useRef(false);

  // El efecto es la única fuente de verdad del timer.
  // Cada vez que currentIndex cambia (por usuario o por auto-advance),
  // el cleanup cancela el timer anterior y se crea uno nuevo desde cero.
  useEffect(() => {
    if (!autoRotate || !images || images.length <= 1) return;
    const timer = setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % images.length);
    }, rotationInterval);
    return () => clearTimeout(timer);
  }, [autoRotate, images, rotationInterval, currentIndex]);

  const goTo = (index) => {
    const next = ((index % images.length) + images.length) % images.length;
    setCurrentIndex(next);
  };

  const resetTouchState = () => {
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    touchLastXRef.current = null;
    isSwipingRef.current = false;
  };

  const handleTouchStart = (event) => {
    if (!images || images.length <= 1) return;
    const touch = event.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    touchLastXRef.current = touch.clientX;
    isSwipingRef.current = false;
  };

  const handleTouchMove = (event) => {
    if (touchStartXRef.current === null) return;
    const touch = event.touches[0];
    touchLastXRef.current = touch.clientX;
    const deltaX = touch.clientX - touchStartXRef.current;
    const deltaY = touch.clientY - touchStartYRef.current;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      isSwipingRef.current = true;
    }
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current === null || touchLastXRef.current === null) {
      resetTouchState();
      return;
    }
    const deltaX = touchLastXRef.current - touchStartXRef.current;
    if (isSwipingRef.current && Math.abs(deltaX) > 40) {
      goTo(deltaX < 0 ? currentIndex + 1 : currentIndex - 1);
    }
    resetTouchState();
  };

  if (!images || images.length === 0) {
    return (
      <div className="image-carousel">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          color: 'var(--color-muted)',
          fontSize: '14px',
        }}>
          {placeholderText}
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="image-carousel"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={resetTouchState}
      >
        {images.map((img, index) => (
          <div
            key={img.id || index}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: index === currentIndex ? 1 : 0,
              transition: 'opacity 0.7s ease',
              pointerEvents: index === currentIndex ? 'auto' : 'none',
            }}
          >
            {img.url ? (
              <Image
                src={resolvePhotoUrl(img)}
                alt={`${placeholderText} ${index + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, 800px"
                style={{ objectFit: 'cover' }}
                priority={index === 0}
              />
            ) : null}
          </div>
        ))}

        {images.length > 1 && (
          <>
            <button
              className="carousel-arrow carousel-arrow-left"
              onClick={() => goTo(currentIndex - 1)}
              aria-label="Imagen anterior"
            >
              <svg width="10" height="18" viewBox="0 0 10 18" fill="none">
                <path d="M9 1L1 9L9 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              className="carousel-arrow carousel-arrow-right"
              onClick={() => goTo(currentIndex + 1)}
              aria-label="Siguiente imagen"
            >
              <svg width="10" height="18" viewBox="0 0 10 18" fill="none">
                <path d="M1 1L9 9L1 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </>
        )}

        {autoRotate && images.length > 1 && (
          <div className="carousel-progress-track">
            <div
              key={currentIndex}
              className="carousel-progress-bar"
              style={{ animationDuration: `${rotationInterval}ms` }}
            />
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="carousel-indicators">
          {images.map((_, index) => (
            <button
              key={index}
              className={`carousel-indicator ${index === currentIndex ? 'active' : ''}`}
              onClick={() => goTo(index)}
              aria-label={`Ir a imagen ${index + 1}`}
            />
          ))}
        </div>
      )}
    </>
  );
}
