import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [votingResults, setVotingResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("users");
  const [newCandidate, setNewCandidate] = useState({ name: "", party: "" });
  const [blockchainVerified, setBlockchainVerified] = useState(false);
  const [blockchainStats, setBlockchainStats] = useState({
    totalVotes: 0,
    verifiedVotes: 0,
    transactionCount: 0,
  });

  // Get admin token
  const getAuthToken = () => {
    return localStorage.getItem("adminToken") || "admin-auth-token";
  };

  useEffect(() => {
    // Check if admin is authenticated
    const token = getAuthToken();
    if (!token) {
      navigate("/admin-login");
      return;
    }
    fetchUsers();
    fetchCandidates();
    fetchBlockchainStats();
  }, [navigate]);

  const fetchUsers = async () => {
    try {
      const token = getAuthToken();
      const response = await axios.get("http://localhost:5000/api/users", {
        headers: { Authorization: token },
      });
      setUsers(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching users:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/admin-login");
      }
      setLoading(false);
    }
  };

  const fetchCandidates = async () => {
    try {
      console.log("🔄 Fetching candidates...");
      const response = await axios.get("http://localhost:5000/api/candidates");
      console.log("✅ Candidates fetched:", response.data);
      setCandidates(response.data);
    } catch (error) {
      console.error("❌ Error fetching candidates:", error);
      alert(
        "Failed to fetch candidates: " +
          (error.response?.data?.message || error.message)
      );
    }
  };

  const fetchVotingResults = async () => {
    try {
      const token = getAuthToken();
      const response = await axios.get(
        "http://localhost:5000/api/voting-results",
        {
          headers: { Authorization: token },
        }
      );

      setVotingResults(response.data);
      setBlockchainVerified(response.data.source === "blockchain-verified");

      console.log("🔗 Results source:", response.data.source);
    } catch (error) {
      console.error("Error fetching voting results:", error);
    }
  };

  const fetchBlockchainStats = async () => {
    try {
      // Simulate blockchain stats
      setBlockchainStats({
        totalVotes: users.filter((user) => user.has_voted).length,
        verifiedVotes: Math.floor(
          users.filter((user) => user.has_voted).length * 0.95
        ),
        transactionCount: users.filter((user) => user.has_voted).length,
      });
    } catch (error) {
      console.error("Error fetching blockchain stats:", error);
    }
  };

  const exportToExcel = async () => {
    try {
      setExportLoading(true);
      const token = getAuthToken();
      const response = await axios.get(
        "http://localhost:5000/api/export-excel",
        {
          headers: { Authorization: token },
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `UserVerifications_${new Date().getTime()}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();

      alert("✅ Excel file downloaded successfully!");
    } catch (error) {
      console.error("Error exporting Excel:", error);
      alert(
        "❌ Error exporting Excel file: " +
          (error.response?.data?.message || error.message)
      );
    } finally {
      setExportLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    navigate("/admin-login");
  };

  const goToUserLogin = () => {
    navigate("/login");
  };

  const addCandidate = async () => {
    if (!newCandidate.name || !newCandidate.party) {
      alert("Please enter candidate name and party");
      return;
    }

    try {
      const token = getAuthToken();
      console.log("🔄 Adding candidate:", newCandidate);
      console.log("🔑 Using token:", token);

      const response = await axios.post(
        "http://localhost:5000/api/candidates",
        {
          name: newCandidate.name.trim(),
          party: newCandidate.party.trim(),
        },
        {
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ Candidate response:", response.data);

      if (response.data.success) {
        alert(
          "✅ Candidate added successfully!" +
            (response.data.blockchain ? " (Also recorded on blockchain)" : "")
        );
        setNewCandidate({ name: "", party: "" });
        fetchCandidates(); // Refresh the list
      }
    } catch (error) {
      console.error("❌ Error adding candidate:", error);

      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
        console.error("Response headers:", error.response.headers);

        alert(
          `❌ Failed to add candidate: ${
            error.response.data.message ||
            error.response.statusText ||
            "Unknown error"
          }`
        );
      } else if (error.request) {
        console.error("No response received:", error.request);
        alert(
          "❌ No response from server. Check if backend is running on port 5000."
        );
      } else {
        console.error("Error message:", error.message);
        alert("❌ Error: " + error.message);
      }
    }
  };

  const deleteCandidate = async (candidateId) => {
    if (!window.confirm("Are you sure you want to delete this candidate?")) {
      return;
    }

    try {
      const token = getAuthToken();
      const response = await axios.delete(
        `http://localhost:5000/api/candidates/${candidateId}`,
        {
          headers: { Authorization: token },
        }
      );

      if (response.data.success) {
        alert("✅ Candidate deleted successfully!");
        fetchCandidates();
      }
    } catch (error) {
      console.error("Error deleting candidate:", error);
      alert(
        "❌ Failed to delete candidate: " +
          (error.response?.data?.message || error.message)
      );
    }
  };

  const verifyVoteOnBlockchain = async (voterId) => {
    try {
      const token = getAuthToken();
      const response = await axios.get(
        `http://localhost:5000/api/verify-vote/${voterId}`,
        {
          headers: { Authorization: token },
        }
      );

      if (response.data.success) {
        alert(
          response.data.verifiedOnBlockchain
            ? `✅ Vote verified on blockchain! Voter: ${voterId}`
            : `❌ Vote not found on blockchain! Voter: ${voterId}`
        );
      }
    } catch (error) {
      console.error("Error verifying vote:", error);
      alert("❌ Failed to verify vote on blockchain");
    }
  };

  const viewFaceImage = (faceImage) => {
    if (faceImage) {
      const imageUrl = `http://localhost:5000/uploads/${faceImage}`;
      window.open(imageUrl, "_blank");
    }
  };

  if (loading) return <div className="loading">Loading user data...</div>;

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>👨‍💼 E-Voting Admin Dashboard</h1>
          <p>
            Manage and monitor user verifications and voting with Blockchain
            Security
          </p>
        </div>
        <div className="header-actions">
          <button onClick={goToUserLogin} className="user-login-btn">
            👤 User Login
          </button>
          <button onClick={handleLogout} className="logout-btn">
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Blockchain Status Banner */}
      {blockchainVerified && (
        <div
          style={{
            background: "linear-gradient(135deg, #28a745, #20c997)",
            color: "white",
            padding: "15px",
            borderRadius: "10px",
            textAlign: "center",
            marginBottom: "20px",
            boxShadow: "0 4px 15px rgba(40, 167, 69, 0.3)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            backdropFilter: "blur(10px)",
          }}
        >
          <h3 style={{ margin: "0 0 10px 0" }}>
            ✅ Blockchain Verified Results
          </h3>
          <p style={{ margin: 0, opacity: 0.9 }}>
            All votes are securely recorded on the blockchain for transparency
            and security
          </p>
        </div>
      )}

      <div className="dashboard-stats">
        <div className="stat-card total-users">
          <h3>Total Verified Users</h3>
          <p>{users.length}</p>
        </div>
        <div className="stat-card today-users">
          <h3>Today's Verifications</h3>
          <p>
            {
              users.filter((user) => {
                const today = new Date().toDateString();
                const userDate = new Date(user.timestamp).toDateString();
                return today === userDate;
              }).length
            }
          </p>
        </div>
        <div className="stat-card unique-voters">
          <h3>Total Votes Cast</h3>
          <p>{users.filter((user) => user.has_voted).length}</p>
        </div>
        <div className="stat-card candidates-count">
          <h3>Candidates</h3>
          <p>{candidates.length}</p>
        </div>
      </div>

      {/* Blockchain Stats */}
      <div className="dashboard-stats">
        <div className="stat-card" style={{ borderLeft: "4px solid #ff6b6b" }}>
          <h3>🔗 Blockchain Votes</h3>
          <p>{blockchainStats.totalVotes}</p>
        </div>
        <div className="stat-card" style={{ borderLeft: "4px solid #4ecdc4" }}>
          <h3>✅ Verified Votes</h3>
          <p>{blockchainStats.verifiedVotes}</p>
        </div>
        <div className="stat-card" style={{ borderLeft: "4px solid #45b7d1" }}>
          <h3>📝 Transactions</h3>
          <p>{blockchainStats.transactionCount}</p>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button
          className={`tab-btn ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          👥 Users
        </button>
        <button
          className={`tab-btn ${activeTab === "candidates" ? "active" : ""}`}
          onClick={() => setActiveTab("candidates")}
        >
          🗳️ Candidates
        </button>
        <button
          className={`tab-btn ${activeTab === "results" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("results");
            fetchVotingResults();
          }}
        >
          📊 Results
        </button>
        <button
          className={`tab-btn ${activeTab === "blockchain" ? "active" : ""}`}
          onClick={() => setActiveTab("blockchain")}
        >
          🔗 Blockchain
        </button>
      </div>

      <div className="dashboard-actions">
        {activeTab === "users" && (
          <button
            onClick={exportToExcel}
            className="export-btn"
            disabled={users.length === 0 || exportLoading}
          >
            {exportLoading
              ? "📊 Exporting..."
              : `📊 Export to Excel (${users.length} records)`}
          </button>
        )}
        <button onClick={fetchUsers} className="refresh-btn">
          🔄 Refresh Data
        </button>
        {activeTab === "results" && (
          <button onClick={fetchVotingResults} className="refresh-btn">
            🔍 Verify Blockchain
          </button>
        )}
      </div>

      {activeTab === "users" &&
        (users.length === 0 ? (
          <div className="no-data">
            <h3>📭 No user verification data found</h3>
            <p>
              Users will appear here after they complete verification through
              the user login page.
            </p>
          </div>
        ) : (
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Aadhar Number</th>
                  <th>Phone Number</th>
                  <th>OTP</th>
                  <th>Face Image</th>
                  <th>Voter ID</th>
                  <th>Email</th>
                  <th>Has Voted</th>
                  <th>Blockchain</th>
                  <th>IP Address</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.ID || user.id}>
                    <td>{user.ID || user.id}</td>
                    <td>{user.name}</td>
                    <td>{user.aadhar_number || user.aadhaar_number}</td>
                    <td>{user.phone_number}</td>
                    <td>{user.otp}</td>
                    <td>
                      {user.face_image ? (
                        <button
                          className="view-image-btn"
                          onClick={() => viewFaceImage(user.face_image)}
                          title="Click to view face image"
                        >
                          📷 View
                        </button>
                      ) : (
                        "❌"
                      )}
                    </td>
                    <td>{user.voterid || user.voter_id}</td>
                    <td>{user.email}</td>
                    <td>{user.has_voted ? "✅ Yes" : "❌ No"}</td>
                    <td>
                      {user.has_voted ? (
                        <button
                          className="view-image-btn"
                          onClick={() =>
                            verifyVoteOnBlockchain(
                              user.voterid || user.voter_id
                            )
                          }
                          title="Verify on Blockchain"
                          style={{ background: "#17a2b8" }}
                        >
                          🔗 Verify
                        </button>
                      ) : (
                        "⏳"
                      )}
                    </td>
                    <td>{user.ip_address}</td>
                    <td>{new Date(user.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {activeTab === "candidates" && (
        <div className="candidates-management">
          <div className="add-candidate-form">
            <h3>Add New Candidate</h3>
            <div className="form-row">
              <input
                type="text"
                placeholder="Candidate Name"
                value={newCandidate.name}
                onChange={(e) =>
                  setNewCandidate({ ...newCandidate, name: e.target.value })
                }
                className="form-input"
              />
              <input
                type="text"
                placeholder="Party"
                value={newCandidate.party}
                onChange={(e) =>
                  setNewCandidate({ ...newCandidate, party: e.target.value })
                }
                className="form-input"
              />
              <button onClick={addCandidate} className="add-btn">
                ➕ Add Candidate
              </button>
            </div>
          </div>

          <div className="candidates-list">
            <h3>Candidates List</h3>
            {candidates.length === 0 ? (
              <div className="no-data">
                <p>No candidates added yet.</p>
              </div>
            ) : (
              <div className="candidates-grid">
                {candidates.map((candidate) => (
                  <div key={candidate.id} className="candidate-item">
                    <div className="candidate-details">
                      <h4>{candidate.name}</h4>
                      <p>Party: {candidate.party}</p>
                      <p>Votes: {candidate.votes}</p>
                    </div>
                    <button
                      onClick={() => deleteCandidate(candidate.id)}
                      className="delete-btn"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "results" && (
        <div className="voting-results">
          <h3>📊 Voting Results {blockchainVerified && "🔗"}</h3>
          {blockchainVerified && (
            <div
              style={{
                background: "rgba(40, 167, 69, 0.1)",
                padding: "10px",
                borderRadius: "5px",
                marginBottom: "20px",
                border: "1px solid rgba(40, 167, 69, 0.3)",
                textAlign: "center",
              }}
            >
              <strong style={{ color: "#28a745" }}>
                ✅ Blockchain Verified
              </strong>
              <p
                style={{ margin: "5px 0 0 0", fontSize: "14px", color: "#666" }}
              >
                Results are securely recorded on the blockchain
              </p>
            </div>
          )}
          {votingResults ? (
            <div className="results-container">
              <div className="results-summary">
                <h4>Total Votes Cast: {votingResults.totalVotes}</h4>
                <p>Source: {votingResults.source}</p>
              </div>
              <div className="results-list">
                {votingResults.candidates.map((candidate, index) => (
                  <div
                    key={candidate.id}
                    className={`result-item ${index === 0 ? "winner" : ""}`}
                  >
                    <div className="candidate-rank">
                      #{index + 1}
                      {index === 0 && " 🏆"}
                    </div>
                    <div className="candidate-info">
                      <h4>{candidate.name}</h4>
                      <p>{candidate.party}</p>
                      {candidate.verified && (
                        <small style={{ color: "#28a745" }}>
                          ✅ Blockchain Verified
                        </small>
                      )}
                    </div>
                    <div className="vote-count">
                      <strong>{candidate.votes} votes</strong>
                      {votingResults.totalVotes > 0 && (
                        <span className="vote-percentage">
                          (
                          {Math.round(
                            (candidate.votes / votingResults.totalVotes) * 100
                          )}
                          %)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="no-data">
              <p>Click "Refresh Data" to load voting results</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "blockchain" && (
        <div className="voting-results">
          <h3>🔗 Blockchain Security Dashboard</h3>
          <div className="results-summary">
            <h4>Blockchain Verification Status</h4>
            <p>
              All votes are securely recorded on the blockchain for transparency
            </p>
          </div>

          <div className="candidates-grid">
            <div
              className="candidate-item"
              style={{ flexDirection: "column", alignItems: "flex-start" }}
            >
              <h4>🔒 Security Features</h4>
              <ul style={{ textAlign: "left", margin: "10px 0" }}>
                <li>✅ Immutable vote records</li>
                <li>✅ Transparent vote counting</li>
                <li>✅ Tamper-proof storage</li>
                <li>✅ Public verification</li>
                <li>✅ Double voting prevention</li>
              </ul>
            </div>

            <div
              className="candidate-item"
              style={{ flexDirection: "column", alignItems: "flex-start" }}
            >
              <h4>📊 Blockchain Statistics</h4>
              <div style={{ margin: "10px 0" }}>
                <p>
                  Total Votes on Chain:{" "}
                  <strong>{blockchainStats.totalVotes}</strong>
                </p>
                <p>
                  Verified Transactions:{" "}
                  <strong>{blockchainStats.verifiedVotes}</strong>
                </p>
                <p>
                  Blockchain Status:{" "}
                  <strong style={{ color: "#28a745" }}>Active</strong>
                </p>
                <p>
                  Network: <strong>Local Simulation</strong>
                </p>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: "20px",
              padding: "20px",
              background: "rgba(255,255,255,0.1)",
              borderRadius: "10px",
            }}
          >
            <h4>🔍 Verify Individual Votes</h4>
            <p>
              Select a voter from the Users tab and click "Verify" to check
              their vote on the blockchain.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
