'use client';

import { useState, useEffect, useRef } from 'react';
import { resolvePhotoUrl } from '@/utils/images';

export default function ImageCarousel({ images, placeholderText = 'Foto', autoRotate = true, rotationInterval = 5000 }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);
  const touchLastXRef = useRef(null);
  const isSwipingRef = useRef(false);

  const resetTouchState = () => {
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    touchLastXRef.current = null;
    isSwipingRef.current = false;
  };

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToImage = (index) => {
    setCurrentIndex(index);
  };

  const handleTouchStart = (event) => {
    if (!images || images.length <= 1) {
      return;
    }

    const touch = event.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    touchLastXRef.current = touch.clientX;
    isSwipingRef.current = false;
  };

  const handleTouchMove = (event) => {
    if (touchStartXRef.current === null) {
      return;
    }

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
      if (deltaX < 0) {
        nextImage();
      } else {
        prevImage();
      }
    }

    resetTouchState();
  };

  // Auto-rotation effect
  useEffect(() => {
    if (!autoRotate || !images || images.length <= 1) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, rotationInterval);

    return () => clearInterval(interval);
  }, [images, autoRotate, rotationInterval]);

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
              display: index === currentIndex ? 'flex' : 'none',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              color: 'var(--color-muted)',
              fontSize: '14px',
              position: 'relative',
            }}
          >
            {img.url ? (
              <img
                src={resolvePhotoUrl(img)}
                alt={`${placeholderText} ${index + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '8px',
                }}
              />
            ) : (
              placeholderText
            )}
          </div>
        ))}
        {images.length > 1 && (
          <>
            <button
              className="carousel-arrow carousel-arrow-left"
              onClick={prevImage}
              aria-label="Imagen anterior"
            >
              &lt;
            </button>
            <button
              className="carousel-arrow carousel-arrow-right"
              onClick={nextImage}
              aria-label="Siguiente imagen"
            >
              &gt;
            </button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="carousel-indicators">
          {images.map((_, index) => (
            <button
              key={index}
              className={`carousel-indicator ${index === currentIndex ? 'active' : ''}`}
              onClick={() => goToImage(index)}
              aria-label={`Ir a imagen ${index + 1}`}
            />
          ))}
        </div>
      )}
    </>
  );
}

