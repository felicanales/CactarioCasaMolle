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
  const [showInstructions, setShowInstructions] = useState(false);
  const [recognitionError, setRecognitionError] = useState(false);
  const scannerRef = useRef(null);
  const router = useRouter();

  // Efecto para agregar estilos CSS que oculten el desenfoque de html5-qrcode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const styleId = 'qr-scanner-custom-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          /* Contenedor principal */
          #qr-reader {
            width: 100% !important;
            height: 100% !important;
            position: relative !important;
            background: transparent !important;
          }
          
          /* Video de la cámara */
          #qr-reader video {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            z-index: 1 !important;
            background: transparent !important;
          }
          
          /* Región de escaneo */
          #qr-reader__scan_region {
            background: transparent !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            z-index: 2 !important;
          }
          
          /* Ocultar el borde/overlay que html5-qrcode agrega */
          #qr-reader__dashboard_section_csr,
          #qr-reader__dashboard_section_swaplink {
            display: none !important;
          }
          
          /* Asegurar que el dashboard no bloquee */
          #qr-reader__dashboard_section {
            background: transparent !important;
            position: absolute !important;
            z-index: 3 !important;
          }
          
          /* Ocultar el desenfoque si existe */
          #qr-reader__scan_region::before,
          #qr-reader__scan_region::after {
            display: none !important;
          }
          
          /* Asegurar que no haya overlay oscuro */
          #qr-reader__scan_region video {
            filter: none !important;
            -webkit-filter: none !important;
            background: transparent !important;
          }
          
          /* Ocultar cualquier elemento de desenfoque */
          #qr-reader__dashboard_section_csr canvas {
            display: none !important;
          }
          
          /* Asegurar que el contenedor de la cámara no tenga fondo */
          #qr-reader__camera_selection,
          #qr-reader__dashboard {
            background: transparent !important;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  useEffect(() => {
    // Auto-iniciar el escáner cuando el componente se monta
    if (typeof window !== 'undefined' && !scanning) {
      startScanning();
    }

    // Inicializar el escáner QR cuando está activo
    if (typeof window !== 'undefined' && scanning) {
      const initScanner = async () => {
        try {
          const { Html5Qrcode } = await import('html5-qrcode');
          const html5QrCode = new Html5Qrcode('qr-reader');
          
          // Configurar el escáner para mostrar toda la cámara sin desenfoque
          await html5QrCode.start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: function(viewfinderWidth, viewfinderHeight) {
                // Calcular el tamaño del qrbox (70% del área visible)
                const minEdgePercentage = 0.7;
                const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
                const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
                return {
                  width: qrboxSize,
                  height: qrboxSize
                };
              },
              aspectRatio: 1.0,
              disableFlip: false,
              supportedScanTypes: [],
              videoConstraints: {
                facingMode: 'environment',
                aspectRatio: { ideal: 1 }
              },
              // Desactivar el estilo predeterminado para tener control total
              rememberLastUsedCamera: true,
              showTorchButtonIfSupported: false,
            },
            (decodedText) => {
              handleQRCodeScanned(decodedText);
            },
            (errorMessage) => {
              // Ignorar errores de lectura continuos
            }
          );
          
          // Asegurar que el video se muestre después de iniciar
          setTimeout(() => {
            const video = document.querySelector('#qr-reader video');
            if (video) {
              video.style.position = 'absolute';
              video.style.top = '0';
              video.style.left = '0';
              video.style.width = '100%';
              video.style.height = '100%';
              video.style.objectFit = 'cover';
              video.style.zIndex = '1';
            }
          }, 500);

          scannerRef.current = html5QrCode;
          setRecognitionError(false);
        } catch (err) {
          console.error('Error al inicializar escáner:', err);
          setError('No se pudo acceder a la cámara. Por favor, verifica los permisos.');
          setScanning(false);
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
      } else {
        setRecognitionError(true);
        setTimeout(() => {
          setRecognitionError(false);
          if (!scanning) {
            startScanning();
          }
        }, 2000);
      }
    } catch (err) {
      console.error('Error al verificar QR:', err);
      setRecognitionError(true);
      setTimeout(() => {
        setRecognitionError(false);
        if (!scanning) {
          startScanning();
        }
      }, 2000);
    }
  };

  const startScanning = () => {
    setError(null);
    setRecognitionError(false);
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
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh',
      backgroundColor: scanning ? 'transparent' : '#4A2C1A',
      color: '#F5E6D3',
      position: 'relative',
      overflow: scanning ? 'hidden' : 'visible',
    }}>
      {!scanning && <Header />}
      
      {/* Vista principal con cámara */}
      {scanning ? (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'transparent',
          overflow: 'hidden',
          zIndex: 10,
        }}>
          {/* Contenedor de la cámara - full screen */}
          <div
            id="qr-reader"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '100%',
              zIndex: 1,
              backgroundColor: 'transparent',
              overflow: 'hidden',
            }}
          />

          {/* Overlay con recuadro de escaneo */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            pointerEvents: 'none',
          }}>
            {/* Barra superior con tiempo y botón de ayuda */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              paddingTop: '60px',
              pointerEvents: 'auto',
            }}>
              <div style={{
                backgroundColor: '#A0522D',
                color: '#F5E6D3',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '500',
              }}>
                13:34
              </div>
              
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                style={{
                  background: 'rgba(62, 39, 35, 0.8)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(245, 230, 211, 0.3)',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  color: '#F5E6D3',
                  fontSize: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                }}
              >
                ?
              </button>
            </div>

            {/* Mensaje de error de reconocimiento */}
            {recognitionError && (
              <div style={{
                textAlign: 'center',
                padding: '16px',
                marginTop: '100px',
              }}>
                <div style={{
                  backgroundColor: 'rgba(62, 39, 35, 0.9)',
                  backdropFilter: 'blur(10px)',
                  color: '#F5E6D3',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  display: 'inline-block',
                  fontSize: '14px',
                  border: '1px solid rgba(245, 230, 211, 0.2)',
                }}>
                  Lo sentimos, pero no hemos podido reconocer esto.
                </div>
              </div>
            )}

            {/* Recuadro de escaneo con esquinas */}
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
            }}>
              <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: '300px',
                aspectRatio: '1',
              }}>
                {/* Esquina superior izquierda */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '40px',
                  height: '40px',
                  borderTop: '3px solid #F5E6D3',
                  borderLeft: '3px solid #F5E6D3',
                  borderTopLeftRadius: '12px',
                }} />
                {/* Esquina superior derecha */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '40px',
                  height: '40px',
                  borderTop: '3px solid #F5E6D3',
                  borderRight: '3px solid #F5E6D3',
                  borderTopRightRadius: '12px',
                }} />
                {/* Esquina inferior izquierda */}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: '40px',
                  height: '40px',
                  borderBottom: '3px solid #F5E6D3',
                  borderLeft: '3px solid #F5E6D3',
                  borderBottomLeftRadius: '12px',
                }} />
                {/* Esquina inferior derecha */}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: '40px',
                  height: '40px',
                  borderBottom: '3px solid #F5E6D3',
                  borderRight: '3px solid #F5E6D3',
                  borderBottomRightRadius: '12px',
                }} />
              </div>
            </div>

            {/* Botón para detener */}
            <div style={{
              padding: '20px',
              paddingBottom: '100px',
              display: 'flex',
              justifyContent: 'center',
              pointerEvents: 'auto',
            }}>
              <button
                onClick={stopScanning}
                style={{
                  background: 'rgba(62, 39, 35, 0.8)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(245, 230, 211, 0.3)',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  color: '#F5E6D3',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}
              >
                Detener
              </button>
            </div>
          </div>
        </div>
      ) : (
        <main className="main-content" style={{
          flex: 1,
          padding: '20px',
          backgroundColor: '#4A2C1A',
          color: '#F5E6D3',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {error && (
            <div style={{
              backgroundColor: '#8B7355',
              color: '#F5E6D3',
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '20px',
              width: '100%',
              maxWidth: '400px',
              border: '1px solid rgba(245, 230, 211, 0.2)',
            }}>
              {error}
            </div>
          )}

          <button
            onClick={startScanning}
            style={{
              backgroundColor: '#A0522D',
              color: '#F5E6D3',
              padding: '16px 32px',
              borderRadius: '12px',
              border: 'none',
              fontSize: '18px',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '20px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            }}
          >
            Iniciar Escaneo
          </button>
          
          <div style={{ 
            marginTop: '20px', 
            width: '100%', 
            maxWidth: '300px',
            color: '#EDD4A6',
          }}>
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
                  border: '1px solid #8B7355',
                  marginBottom: '8px',
                  backgroundColor: '#3E2723',
                  color: '#F5E6D3',
                }}
              />
              <button 
                type="submit" 
                style={{
                  width: '100%',
                  backgroundColor: '#A0522D',
                  color: '#F5E6D3',
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}
              >
                Buscar
              </button>
            </form>
          </div>
        </main>
      )}

      {/* Modal de instrucciones */}
      {showInstructions && (
        <div
          onClick={() => setShowInstructions(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#3E2723',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '400px',
              width: '100%',
              color: '#F5E6D3',
              border: '1px solid #8B7355',
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#F5E6D3',
                margin: 0,
              }}>
                Sacándole el máximo partido a escanear
              </h2>
              <button
                onClick={() => setShowInstructions(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#F5E6D3',
                  fontSize: '28px',
                  cursor: 'pointer',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{
                  fontSize: '32px',
                  flexShrink: 0,
                }}>
                  ⬜
                </div>
                <div>
                  <p style={{
                    fontSize: '14px',
                    color: '#EDD4A6',
                    lineHeight: '1.6',
                    margin: 0,
                  }}>
                    Haga zoom para llenar la mayor parte posible de la pantalla con el objeto. Cuantos menos objetos y espacio en blanco haya en la pantalla, más rápida será reconocida.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{
                  fontSize: '32px',
                  flexShrink: 0,
                }}>
                  👆
                </div>
                <div>
                  <p style={{
                    fontSize: '14px',
                    color: '#EDD4A6',
                    lineHeight: '1.6',
                    margin: 0,
                  }}>
                    Si la pantalla está borrosa, toque la pantalla como lo haría con la aplicación de cámara de su teléfono.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{
                  fontSize: '32px',
                  flexShrink: 0,
                }}>
                  📶
                </div>
                <div>
                  <p style={{
                    fontSize: '14px',
                    color: '#EDD4A6',
                    lineHeight: '1.6',
                    margin: 0,
                  }}>
                    Algunas veces, la velocidad de conexión puede repercutir en la velocidad de reconocimiento. Dele unos momentos a la aplicación para poder reconocer la obra en caso que esté en zonas con poca cobertura.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowInstructions(false)}
              style={{
                marginTop: '24px',
                width: '100%',
                backgroundColor: '#A0522D',
                color: '#F5E6D3',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {!scanning && <BottomNavigation />}
    </div>
  );
}
