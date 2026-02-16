import React, { useState, useEffect } from "react";
import "./FingerprintVerification.css";

const FingerprintVerification = ({
  voterId,
  onVerificationComplete,
  onBack,
}) => {
  const [fingerprintImage, setFingerprintImage] = useState(null);
  const [captureSuccess, setCaptureSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deviceConnected, setDeviceConnected] = useState(false);

  // Simulate PB1000 device connection
  useEffect(() => {
    console.log("🔌 Checking PB1000 device connection...");

    // Simulate device detection
    const checkDevice = setTimeout(() => {
      setDeviceConnected(true);
      console.log("✅ PB1000 device connected successfully");
    }, 2000);

    return () => clearTimeout(checkDevice);
  }, []);

  // Simulate fingerprint capture from PB1000 device
  const simulateFingerprintCapture = () => {
    setLoading(true);
    setError("");

    console.log("📸 Simulating fingerprint capture from PB1000 device...");

    // Simulate device capture delay
    setTimeout(() => {
      // Generate a simulated fingerprint image (in real scenario, this comes from PB1000)
      const simulatedFingerprintData = {
        image: `data:image/svg+xml;base64,${btoa(`
          <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f0f0f0"/>
            <circle cx="100" cy="100" r="80" fill="none" stroke="#333" stroke-width="2"/>
            <path d="M60,80 Q100,40 140,80 Q160,120 120,160 Q80,200 60,160 Q40,120 60,80" 
                  fill="none" stroke="#333" stroke-width="3"/>
            <circle cx="80" cy="100" r="8" fill="#333"/>
            <circle cx="120" cy="100" r="8" fill="#333"/>
            <circle cx="100" cy="130" r="6" fill="#333"/>
          </svg>
        `)}`,
        data: `fingerprint_${voterId}_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
      };

      setFingerprintImage(simulatedFingerprintData.image);
      setCaptureSuccess(true);
      setLoading(false);

      console.log("✅ Fingerprint captured successfully");
    }, 3000);
  };

  const handleCaptureFingerprint = async () => {
    if (!deviceConnected) {
      setError("❌ PB1000 device not connected. Please check the connection.");
      return;
    }

    await simulateFingerprintCapture();
  };

  const handleSubmitFingerprint = async () => {
    if (!fingerprintImage) {
      setError("❌ Please capture fingerprint first");
      return;
    }

    setLoading(true);
    try {
      // Convert base64 image to blob for file upload
      const response = await fetch(fingerprintImage);
      const blob = await response.blob();
      const fingerprintFile = new File([blob], `fingerprint_${voterId}.png`, {
        type: "image/png",
      });

      const formData = new FormData();
      formData.append("fingerprintImage", fingerprintFile);
      formData.append("voterId", voterId);
      formData.append("fingerprintData", `fp_data_${voterId}_${Date.now()}`);

      const apiResponse = await fetch(
        "http://localhost:5000/api/store-fingerprint",
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await apiResponse.json();

      if (result.success) {
        console.log("✅ Fingerprint stored successfully");
        onVerificationComplete();
      } else {
        setError("❌ Failed to store fingerprint: " + result.message);
      }
    } catch (err) {
      console.error("❌ Fingerprint submission error:", err);
      setError("❌ Failed to submit fingerprint: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRetake = () => {
    setFingerprintImage(null);
    setCaptureSuccess(false);
    setError("");
  };

  return (
    <div className="fingerprint-verification">
      <div className="fingerprint-container">
        <h2>🖐️ Fingerprint Verification</h2>
        <p>Complete your biometric verification with fingerprint</p>

        {error && <div className="error-message">{error}</div>}

        {/* Device Status */}
        <div className="device-status">
          <h4>PB1000 Device Status:</h4>
          <div
            className={`status-indicator ${
              deviceConnected ? "connected" : "disconnected"
            }`}
          >
            {deviceConnected ? "✅ Connected" : "❌ Disconnected"}
          </div>
          {!deviceConnected && (
            <p className="device-help">
              Please ensure your PB1000 device is properly connected to your
              laptop.
            </p>
          )}
        </div>

        {/* Fingerprint Preview */}
        <div className="fingerprint-preview">
          <h4>Fingerprint Preview:</h4>
          <div className="preview-container">
            {fingerprintImage ? (
              <img
                src={fingerprintImage}
                alt="Captured Fingerprint"
                className="fingerprint-image"
              />
            ) : (
              <div className="placeholder">
                <div className="fingerprint-icon">🖐️</div>
                <p>Fingerprint will appear here</p>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="instructions">
          <h4>Instructions:</h4>
          <ol>
            <li>Ensure PB1000 device is connected</li>
            <li>Place your thumb on the scanner</li>
            <li>Click "Capture Fingerprint"</li>
            <li>Keep your thumb steady until capture is complete</li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          {!captureSuccess ? (
            <button
              onClick={handleCaptureFingerprint}
              disabled={loading || !deviceConnected}
              className="capture-btn"
            >
              {loading ? "🔄 Capturing..." : "📸 Capture Fingerprint"}
            </button>
          ) : (
            <div className="capture-success-buttons">
              <button
                onClick={handleSubmitFingerprint}
                disabled={loading}
                className="submit-btn"
              >
                {loading ? "🔄 Saving..." : "✅ Save & Continue"}
              </button>
              <button
                onClick={handleRetake}
                disabled={loading}
                className="retake-btn"
              >
                🔄 Retake
              </button>
            </div>
          )}

          <button onClick={onBack} className="back-btn">
            ← Back to Face Verification
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="progress-indicator">
          <div className="step completed">1. Face Verification ✓</div>
          <div className="step active">2. Fingerprint Verification</div>
          <div className="step">3. Voter ID & Email</div>
          <div className="step">4. Complete</div>
        </div>
      </div>
    </div>
  );
};

export default FingerprintVerification;
