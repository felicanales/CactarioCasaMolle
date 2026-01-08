'use client';

import { useState, useEffect } from 'react';
import { resolvePhotoUrl } from '@/utils/images';

export default function ImageCarousel({ images, placeholderText = 'Foto', autoRotate = true, rotationInterval = 5000 }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToImage = (index) => {
    setCurrentIndex(index);
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
          color: '#9CA3AF',
          fontSize: '14px',
        }}>
          {placeholderText}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="image-carousel">
        {images.map((img, index) => (
          <div
            key={img.id || index}
            style={{
              display: index === currentIndex ? 'flex' : 'none',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              color: '#9CA3AF',
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

