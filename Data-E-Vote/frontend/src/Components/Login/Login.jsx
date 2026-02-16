import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Webcam from "react-webcam";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import axios from "axios";
import "./Login.css";
import app, { auth } from "../../firebase";

const Login = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [captureSuccess, setCaptureSuccess] = useState(false);
  const [capturedFaceImage, setCapturedFaceImage] = useState(null);
  const webcamRef = React.useRef(null);

  // VOTER ID FEATURE STATE
  const [showVoterIdForm, setShowVoterIdForm] = useState(false);
  const [voterId, setVoterId] = useState("");
  const [email, setEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  React.useEffect(() => {
    return () => {
      // Cleanup reCAPTCHA safely
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (error) {
          console.log("reCAPTCHA cleanup error (safe to ignore):", error);
        }
        delete window.recaptchaVerifier;
      }
    };
  }, []);

  const reCaptchverify = () => {
    // Clear any existing reCAPTCHA first
    const recaptchaContainer = document.getElementById("recaptcha-container");
    if (recaptchaContainer) {
      recaptchaContainer.innerHTML = "";
    }

    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        {
          size: "normal",
          callback: (response) => {
            console.log("reCAPTCHA solved", response);
          },
          "expired-callback": () => {
            console.log("reCAPTCHA expired");
            // Don't auto-render on expiration to avoid issues
          },
        }
      );
    }
    return window.recaptchaVerifier;
  };

  const verifyCode = () => {
    if (!confirmationResult) {
      setError("No confirmation result available");
      return Promise.reject("No confirmation result");
    }
    return confirmationResult.confirm(otp);
  };

  const validateInputs = () => {
    if (!name.trim()) {
      setError("Please enter your name as per Aadhaar");
      return false;
    }
    if (!aadhaarNumber || aadhaarNumber.length !== 12) {
      setError("Please enter a valid 12-digit Aadhaar number");
      return false;
    }
    if (!phoneNumber || phoneNumber.length !== 10) {
      setError("Please enter a valid 10-digit phone number");
      return false;
    }
    return true;
  };

  const sendOTP = async () => {
    setError("");
    if (!validateInputs()) return;

    setLoading(true);
    try {
      const verifier = reCaptchverify();
      const formattedPhone = `+91${phoneNumber}`;

      // Ensure reCAPTCHA container exists
      const recaptchaContainer = document.getElementById("recaptcha-container");
      if (!recaptchaContainer) {
        throw new Error("reCAPTCHA container not found");
      }

      await verifier.render();
      const result = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        verifier
      );

      setConfirmationResult(result);
      setOtpSent(true);
      setError("");
      console.log("✅ OTP sent successfully");
    } catch (error) {
      console.error("❌ OTP sending error:", error);

      // Handle specific reCAPTCHA errors
      if (
        error.message.includes("container") ||
        error.message.includes("style")
      ) {
        setError("reCAPTCHA error. Please refresh the page and try again.");
      } else {
        setError(`Failed to send OTP: ${error.message}`);
      }

      // Cleanup reCAPTCHA on error
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (cleanupError) {
          console.log("reCAPTCHA cleanup error:", cleanupError);
        }
        delete window.recaptchaVerifier;
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    setError("");
    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);
    try {
      await verifyCode();

      // Clean up reCAPTCHA safely after verification
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (error) {
          console.log("reCAPTCHA cleanup error (safe to ignore):", error);
        }
        delete window.recaptchaVerifier;
      }

      // Clear reCAPTCHA container safely
      const recaptchaContainer = document.getElementById("recaptcha-container");
      if (recaptchaContainer) {
        setTimeout(() => {
          try {
            recaptchaContainer.innerHTML = "";
          } catch (error) {
            console.log("Container cleanup error:", error);
          }
        }, 100);
      }

      setVerificationSuccess(true);
      setShowWebcam(true);
      setError("");
      console.log("✅ OTP verified successfully");
    } catch (error) {
      setError("Invalid OTP. Please try again.");
      console.error("❌ OTP verification error:", error);
    } finally {
      setLoading(false);
    }
  };

  const captureFaceImage = () => {
    if (!webcamRef.current) {
      setError("Webcam not available. Please refresh the page.");
      return;
    }

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      setError("Failed to capture image. Please try again.");
      return;
    }

    // Store the captured image in state
    setCapturedFaceImage(imageSrc);
    setShowWebcam(false);
    setShowVoterIdForm(true);
    setCaptureSuccess(true);
    console.log("✅ Face image captured and stored successfully");
  };

  // EMAIL OTP FUNCTIONS USING BACKEND
  const sendEmailOTP = async () => {
    setError("");
    if (!email || !voterId) {
      setError("Please enter both email and voter ID");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:5000/api/send-email-otp",
        {
          email,
          voterId,
        }
      );

      if (response.data.success) {
        setEmailOtpSent(true);
        setError("");
        console.log("✅ Email OTP sent successfully");
        alert("✅ OTP sent to your email! Please check your inbox.");
      }
    } catch (error) {
      console.error("❌ Email OTP sending error:", error);
      setError(
        `Failed to send OTP: ${error.response?.data?.message || error.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyEmailOTP = async () => {
    setError("");
    if (!emailOtp || emailOtp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:5000/api/verify-email-otp",
        {
          email,
          voterId,
          otp: emailOtp,
        }
      );

      if (response.data.success) {
        setEmailVerified(true);
        setError("");
        console.log("✅ Email OTP verified successfully");
        // Submit all verification data
        await submitFinalVerification();
      }
    } catch (error) {
      setError("Invalid OTP. Please try again.");
      console.error("❌ Email OTP verification error:", error);
    } finally {
      setLoading(false);
    }
  };

  const submitFinalVerification = async () => {
    try {
      // Use the captured face image from state instead of webcamRef
      if (!capturedFaceImage) {
        setError("Face image is required. Please capture your face again.");
        return;
      }

      // Convert base64 to blob
      const blob = await fetch(capturedFaceImage).then((res) => res.blob());
      const faceImageFile = new File([blob], `face_${Date.now()}.png`, {
        type: "image/png",
      });

      const formData = new FormData();
      formData.append("name", name);
      formData.append("aadhaarNumber", aadhaarNumber);
      formData.append("phoneNumber", phoneNumber);
      formData.append("otp", otp);
      formData.append("voterId", voterId);
      formData.append("email", email);
      formData.append("emailOtp", emailOtp);
      formData.append("faceImage", faceImageFile);

      console.log("📤 Submitting verification data to backend...");

      const response = await axios.post(
        "http://localhost:5000/api/verify-user",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        console.log("✅ Verification successful! Response:", response.data);
        setShowVoterIdForm(false);
        setError("");

        // Store voter ID for voting session
        localStorage.setItem("voterId", voterId);

        alert(
          "✅ Verification completed successfully! Redirecting to voting..."
        );

        // Redirect to voting page
        setTimeout(() => {
          navigate("/voting");
        }, 2000);
      }
    } catch (error) {
      console.error("❌ Submission error:", error);
      if (
        error.response?.data?.message?.includes("already voted") ||
        error.response?.data?.message?.includes("already exists") ||
        error.response?.data?.message?.includes("Duplicate")
      ) {
        setError(`❌ ${error.response.data.message}`);
      } else {
        setError(
          "Failed to submit verification data: " +
            (error.response?.data?.message || error.message)
        );
      }
    }
  };

  const resetForm = () => {
    setName("");
    setAadhaarNumber("");
    setPhoneNumber("");
    setOtp("");
    setOtpSent(false);
    setVerificationSuccess(false);
    setCaptureSuccess(false);
    setCapturedFaceImage(null);
    setVoterId("");
    setEmail("");
    setEmailOtp("");
    setEmailOtpSent(false);
    setEmailVerified(false);
    setShowWebcam(false);
    setShowVoterIdForm(false);
    setError("");

    // Clear reCAPTCHA container on reset
    const recaptchaContainer = document.getElementById("recaptcha-container");
    if (recaptchaContainer) {
      setTimeout(() => {
        recaptchaContainer.innerHTML = "";
      }, 100);
    }

    console.log("🔄 Form reset successfully");
  };

  // Input handlers
  const handleVoterIdChange = (e) => {
    setVoterId(e.target.value);
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  const handleEmailOtpChange = (e) => {
    setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
  };

  const handleAadhaarChange = (e) => {
    setAadhaarNumber(e.target.value.replace(/\D/g, "").slice(0, 12));
  };

  const handlePhoneChange = (e) => {
    setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10));
  };

  const handleOtpChange = (e) => {
    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
  };

  const goToAdminLogin = () => {
    navigate("/admin-login");
  };

  // Show captured image preview in voter ID form
  const renderCapturedImagePreview = () => {
    if (!capturedFaceImage) return null;

    return (
      <div style={{ textAlign: "center", marginBottom: "15px" }}>
        <h4>📷 Captured Face Preview</h4>
        <img
          src={capturedFaceImage}
          alt="Captured Face"
          style={{
            width: "150px",
            height: "150px",
            borderRadius: "8px",
            border: "2px solid #ddd",
            objectFit: "cover",
          }}
        />
        <button
          onClick={() => {
            setShowVoterIdForm(false);
            setShowWebcam(true);
            setCapturedFaceImage(null);
          }}
          className="resend-button"
          style={{ marginTop: "10px", fontSize: "12px" }}
        >
          🔄 Retake Photo
        </button>
      </div>
    );
  };

  return (
    <div className="login-background">
      <div className="login-container">
        <div className="user-login">
          <h2>🗳️ E-Voting User Verification</h2>

          {/* reCAPTCHA Container - Always present in DOM */}
          <div
            id="recaptcha-container"
            style={{
              marginBottom: "20px",
              minHeight: "78px", // Ensure space for reCAPTCHA
            }}
          ></div>

          {error && <div className="error-message">{error}</div>}

          {verificationSuccess && !showWebcam && !captureSuccess && (
            <div className="success-message">
              ✅ OTP Verified! Please complete biometric verification.
            </div>
          )}

          {captureSuccess && (
            <div className="success-message">
              ✅ Face Captured Successfully! Please complete voter information
              below.
            </div>
          )}

          {!verificationSuccess && !showVoterIdForm ? (
            <>
              <input
                type="text"
                placeholder="Full Name as per Aadhaar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input"
              />

              <input
                type="text"
                placeholder="Aadhaar Number (12 digits)"
                value={aadhaarNumber}
                onChange={handleAadhaarChange}
                className="form-input"
                maxLength="12"
              />

              <input
                type="text"
                placeholder="Phone Number (10 digits)"
                value={phoneNumber}
                onChange={handlePhoneChange}
                className="form-input"
                maxLength="10"
              />

              {!otpSent ? (
                <button
                  onClick={sendOTP}
                  className="otp-button"
                  disabled={loading}
                >
                  {loading ? "Sending OTP..." : "📱 Send OTP"}
                </button>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Enter OTP (6 digits)"
                    value={otp}
                    onChange={handleOtpChange}
                    className="form-input"
                    maxLength="6"
                  />
                  <div className="button-group">
                    <button
                      onClick={verifyOTP}
                      className="verify-button"
                      disabled={loading}
                    >
                      {loading ? "Verifying..." : "✅ Verify OTP"}
                    </button>
                    <button
                      onClick={sendOTP}
                      className="resend-button"
                      disabled={loading}
                    >
                      🔄 Resend OTP
                    </button>
                  </div>
                </>
              )}
            </>
          ) : null}

          {showWebcam && (
            <div className="webcam-section">
              <h3>📷 Face Verification</h3>
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/png"
                width={320}
                height={240}
                style={{ borderRadius: "8px", border: "2px solid #ddd" }}
              />
              <br />
              <div className="button-group">
                <button onClick={captureFaceImage} className="capture-button">
                  📸 Capture & Verify
                </button>
                <button
                  onClick={() => {
                    setShowWebcam(false);
                    setVerificationSuccess(false);
                  }}
                  className="resend-button"
                >
                  ❌ Cancel
                </button>
              </div>
            </div>
          )}

          {/* VOTER ID FORM SECTION */}
          {showVoterIdForm && (
            <div
              className="webcam-section"
              style={{
                marginTop: "20px",
                background: "rgba(255,255,255,0.1)",
                padding: "20px",
                borderRadius: "10px",
              }}
            >
              <h3>✅ Face Captured Successfully!</h3>
              <p
                style={{
                  color: "white",
                  textAlign: "center",
                  marginBottom: "20px",
                }}
              >
                Please complete your voter information
              </p>

              {/* Show captured image preview */}
              {renderCapturedImagePreview()}

              <input
                type="text"
                placeholder="Voter ID"
                value={voterId}
                onChange={handleVoterIdChange}
                className="form-input"
              />

              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={handleEmailChange}
                className="form-input"
              />

              {!emailOtpSent ? (
                <button
                  onClick={sendEmailOTP}
                  className="otp-button"
                  disabled={loading}
                >
                  {loading ? "Sending OTP..." : "📧 Send Email OTP"}
                </button>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Enter Email OTP (6 digits)"
                    value={emailOtp}
                    onChange={handleEmailOtpChange}
                    className="form-input"
                    maxLength="6"
                  />
                  <div className="button-group">
                    <button
                      onClick={verifyEmailOTP}
                      className="verify-button"
                      disabled={loading}
                    >
                      {loading ? "Verifying..." : "✅ Verify Email OTP"}
                    </button>
                    <button
                      onClick={sendEmailOTP}
                      className="resend-button"
                      disabled={loading}
                    >
                      🔄 Resend OTP
                    </button>
                  </div>
                </>
              )}

              {emailVerified && (
                <div className="success-message">
                  ✅ Email verified! Submitting your data...
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <button onClick={goToAdminLogin} className="admin-btn">
              👨‍💼 Admin Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
