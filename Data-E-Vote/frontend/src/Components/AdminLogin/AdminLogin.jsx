import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./AdminLogin.css";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "admin@evoting.com",
    phoneNumber: "9876543210",
    secretCode: "ADMIN123",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Test if component is loading
  console.log("🔵 AdminLogin component rendered");

  const handleInputChange = (e) => {
    console.log("📝 Input changed:", e.target.name, e.target.value);
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("🔄 Form submitted");

    setLoading(true);
    setError("");

    try {
      console.log("📤 Sending login request to backend...");

      const response = await axios.post(
        "http://localhost:5000/api/admin/login",
        formData
      );

      console.log("✅ Backend response:", response.data);

      if (response.data.success) {
        console.log("🔑 Storing token and redirecting...");
        localStorage.setItem("adminToken", response.data.token);

        // Force navigation
        setTimeout(() => {
          console.log("🚀 Navigating to admin dashboard...");
          navigate("/admin-dashboard", { replace: true });
        }, 100);
      }
    } catch (error) {
      console.error("❌ Login error:", error);
      setError(
        "Login failed: " + (error.response?.data?.message || error.message)
      );
    } finally {
      setLoading(false);
    }
  };

  const goToUserLogin = () => {
    console.log("🔙 Going to user login...");
    navigate("/login");
  };

  return (
    <div className="admin-login-background">
      <div className="admin-login-container">
        <div className="admin-login-card">
          <h2>👨‍💼 Admin Login</h2>
          <p className="admin-subtitle">Access the E-Voting Admin Dashboard</p>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit} className="admin-login-form">
            <div className="form-group">
              <label>📧 Admin Email:</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                placeholder="admin@evoting.com"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>📞 Phone Number:</label>
              <input
                type="text"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                required
                placeholder="9876543210"
                className="form-input"
                maxLength="10"
              />
            </div>

            <div className="form-group">
              <label>🔐 Secret Code:</label>
              <input
                type="password"
                name="secretCode"
                value={formData.secretCode}
                onChange={handleInputChange}
                required
                placeholder="Enter secret code"
                className="form-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="admin-login-btn"
            >
              {loading ? "🔄 Logging in..." : "🚀 Login to Dashboard"}
            </button>
          </form>

          <div className="admin-login-footer">
            <button onClick={goToUserLogin} className="back-to-user-btn">
              ← Back to User Login
            </button>

            <div className="admin-credentials">
              <h4>Default Admin Credentials:</h4>
              <p>Email: admin@evoting.com</p>
              <p>Phone: 9876543210</p>
              <p>Secret Code: ADMIN123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
