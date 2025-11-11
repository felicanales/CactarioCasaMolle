'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import { sectorsApi } from '@/utils/api';

export default function QRScanner() {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [qrCode, setQrCode] = useState('');
  const scannerRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    // Inicializar el escáner QR cuando el componente se monta
    if (typeof window !== 'undefined' && scanning) {
      const initScanner = async () => {
        try {
          const { Html5Qrcode } = await import('html5-qrcode');
          const html5QrCode = new Html5Qrcode('qr-reader');
          
          await html5QrCode.start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            (decodedText) => {
              handleQRCodeScanned(decodedText);
            },
            (errorMessage) => {
              // Ignorar errores de lectura
            }
          );

          scannerRef.current = html5QrCode;
        } catch (err) {
          console.error('Error al inicializar escáner:', err);
          setError('No se pudo acceder a la cámara. Por favor, verifica los permisos.');
        }
      };

      initScanner();
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [scanning]);

  const handleQRCodeScanned = async (qrCodeValue) => {
    try {
      setScanning(false);
      if (scannerRef.current) {
        await scannerRef.current.stop();
      }

      // Verificar que el QR code corresponde a un sector
      const response = await sectorsApi.getByQr(qrCodeValue);
      if (response.data) {
        // Redirigir a la página de especies del sector
        router.push(`/sectores/${qrCodeValue}/especies`);
      }
    } catch (err) {
      setError('QR code no válido o sector no encontrado');
      setScanning(false);
      if (scannerRef.current) {
        await scannerRef.current.stop();
      }
    }
  };

  const startScanning = () => {
    setError(null);
    setScanning(true);
  };

  const stopScanning = async () => {
    setScanning(false);
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
    }
  };

  const handleManualInput = async (e) => {
    e.preventDefault();
    if (qrCode.trim()) {
      await handleQRCodeScanned(qrCode.trim());
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <main className="main-content">
        <h2>Escanea un QR</h2>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {!scanning ? (
          <div className="qr-scanner-container">
            <div className="qr-scanner-frame">
              <div className="qr-scanner-corner top-left"></div>
              <div className="qr-scanner-corner top-right"></div>
              <div className="qr-scanner-corner bottom-left"></div>
              <div className="qr-scanner-corner bottom-right"></div>
            </div>
            <button
              className="nav-button"
              onClick={startScanning}
              style={{ marginTop: '20px' }}
            >
              Iniciar Escaneo
            </button>
            
            <div style={{ marginTop: '20px', width: '100%', maxWidth: '300px' }}>
              <p style={{ marginBottom: '8px', textAlign: 'center' }}>O ingresa el código manualmente:</p>
              <form onSubmit={handleManualInput}>
                <input
                  type="text"
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value)}
                  placeholder="Código QR"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    marginBottom: '8px',
                  }}
                />
                <button type="submit" className="nav-button" style={{ width: '100%' }}>
                  Buscar
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div id="qr-reader" style={{ width: '100%', maxWidth: '300px' }}></div>
            <button
              className="nav-button"
              onClick={stopScanning}
              style={{ marginTop: '20px' }}
            >
              Detener Escaneo
            </button>
          </div>
        )}
      </main>
      <BottomNavigation />
    </div>
  );
}

