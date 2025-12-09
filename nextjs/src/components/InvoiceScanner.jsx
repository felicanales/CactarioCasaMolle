"use client";

import { useState, useRef, useEffect } from "react";

export default function InvoiceScanner({ onCapture, onClose, existingImage = null }) {
    const [stream, setStream] = useState(null);
    const [capturedImage, setCapturedImage] = useState(existingImage);
    const [facingMode, setFacingMode] = useState("environment"); // "user" para frontal, "environment" para trasera
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    // Iniciar cámara al montar
    useEffect(() => {
        startCamera();
        return () => {
            stopCamera();
        };
    }, [facingMode]);

    const startCamera = async () => {
        try {
            setError("");
            setLoading(true);

            // Detener stream anterior si existe
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            // Solicitar acceso a la cámara
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            setStream(mediaStream);
            
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.play();
            }
        } catch (err) {
            console.error("Error accediendo a la cámara:", err);
            setError(
                err.name === "NotAllowedError"
                    ? "Permiso de cámara denegado. Por favor, permite el acceso a la cámara en la configuración de tu navegador."
                    : err.name === "NotFoundError"
                    ? "No se encontró ninguna cámara en tu dispositivo."
                    : "Error al acceder a la cámara. Por favor, intenta nuevamente."
            );
        } finally {
            setLoading(false);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        // Ajustar dimensiones del canvas al video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Dibujar frame actual del video en el canvas
        context.drawImage(video, 0, 0);

        // Convertir a blob y luego a base64 o URL
        canvas.toBlob((blob) => {
            if (blob) {
                const imageUrl = URL.createObjectURL(blob);
                setCapturedImage(imageUrl);
                stopCamera();
                
                // Convertir a File para enviar
                const file = new File([blob], `invoice-${Date.now()}.jpg`, { type: "image/jpeg" });
                
                if (onCapture) {
                    onCapture(file, imageUrl);
                }
            }
        }, "image/jpeg", 0.9);
    };

    const switchCamera = () => {
        setFacingMode(facingMode === "environment" ? "user" : "environment");
    };

    const retakePhoto = () => {
        setCapturedImage(null);
        startCamera();
    };

    const handleClose = () => {
        stopCamera();
        if (onClose) {
            onClose();
        }
    };

    return (
        <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.95)",
            zIndex: 2000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
        }}>
            {error && (
                <div style={{
                    position: "absolute",
                    top: "20px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    backgroundColor: "#fee2e2",
                    color: "#dc2626",
                    padding: "12px 24px",
                    borderRadius: "8px",
                    maxWidth: "90%",
                    zIndex: 2001
                }}>
                    {error}
                </div>
            )}

            {!capturedImage ? (
                <>
                    {/* Vista previa de la cámara */}
                    <div style={{
                        position: "relative",
                        width: "100%",
                        maxWidth: "600px",
                        aspectRatio: "4/3",
                        backgroundColor: "#000",
                        borderRadius: "12px",
                        overflow: "hidden",
                        marginBottom: "20px"
                    }}>
                        {loading && (
                            <div style={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%, -50%)",
                                color: "white",
                                fontSize: "18px"
                            }}>
                                Cargando cámara...
                            </div>
                        )}
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover"
                            }}
                        />
                        
                        {/* Marco guía para la factura */}
                        <div style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            width: "80%",
                            height: "60%",
                            border: "3px dashed rgba(255, 255, 255, 0.7)",
                            borderRadius: "8px",
                            pointerEvents: "none"
                        }} />
                        
                        {/* Instrucciones */}
                        <div style={{
                            position: "absolute",
                            bottom: "20px",
                            left: "50%",
                            transform: "translateX(-50%)",
                            color: "white",
                            backgroundColor: "rgba(0, 0, 0, 0.6)",
                            padding: "8px 16px",
                            borderRadius: "8px",
                            fontSize: "14px",
                            textAlign: "center"
                        }}>
                            Coloca la factura dentro del marco
                        </div>
                    </div>

                    {/* Canvas oculto para capturar */}
                    <canvas ref={canvasRef} style={{ display: "none" }} />

                    {/* Controles */}
                    <div style={{
                        display: "flex",
                        gap: "16px",
                        alignItems: "center"
                    }}>
                        <button
                            onClick={handleClose}
                            style={{
                                padding: "12px 24px",
                                backgroundColor: "#6b7280",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                fontSize: "16px",
                                fontWeight: "600",
                                cursor: "pointer"
                            }}
                        >
                            Cancelar
                        </button>

                        <button
                            onClick={switchCamera}
                            disabled={loading}
                            style={{
                                padding: "12px 24px",
                                backgroundColor: "#4b5563",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                fontSize: "16px",
                                fontWeight: "600",
                                cursor: loading ? "not-allowed" : "pointer",
                                opacity: loading ? 0.5 : 1
                            }}
                        >
                            🔄 Cambiar cámara
                        </button>

                        <button
                            onClick={capturePhoto}
                            disabled={loading || !stream}
                            style={{
                                padding: "16px 32px",
                                backgroundColor: "#10b981",
                                color: "white",
                                border: "none",
                                borderRadius: "50%",
                                width: "70px",
                                height: "70px",
                                fontSize: "24px",
                                fontWeight: "600",
                                cursor: loading || !stream ? "not-allowed" : "pointer",
                                opacity: loading || !stream ? 0.5 : 1,
                                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)"
                            }}
                        >
                            📷
                        </button>
                    </div>
                </>
            ) : (
                <>
                    {/* Vista previa de la imagen capturada */}
                    <div style={{
                        position: "relative",
                        width: "100%",
                        maxWidth: "600px",
                        marginBottom: "20px"
                    }}>
                        <img
                            src={capturedImage}
                            alt="Factura capturada"
                            style={{
                                width: "100%",
                                borderRadius: "12px",
                                border: "2px solid white"
                            }}
                        />
                    </div>

                    {/* Controles después de capturar */}
                    <div style={{
                        display: "flex",
                        gap: "16px",
                        alignItems: "center"
                    }}>
                        <button
                            onClick={retakePhoto}
                            style={{
                                padding: "12px 24px",
                                backgroundColor: "#6b7280",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                fontSize: "16px",
                                fontWeight: "600",
                                cursor: "pointer"
                            }}
                        >
                            🔄 Volver a tomar
                        </button>

                        <button
                            onClick={handleClose}
                            style={{
                                padding: "12px 24px",
                                backgroundColor: "#10b981",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                fontSize: "16px",
                                fontWeight: "600",
                                cursor: "pointer"
                            }}
                        >
                            ✅ Usar esta foto
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
