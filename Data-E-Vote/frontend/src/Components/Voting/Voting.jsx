import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Voting.css";

const Voting = () => {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [voterId, setVoterId] = useState("");
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    // Get voter ID from localStorage or session
    const storedVoterId = localStorage.getItem("voterId");
    if (!storedVoterId) {
      alert("❌ Voter ID not found. Please complete verification first.");
      navigate("/login");
      return;
    }

    setVoterId(storedVoterId);
    checkVoteStatus(storedVoterId);
    fetchCandidates();
  }, [navigate]);

  const fetchCandidates = async () => {
    try {
      console.log("🔄 Fetching candidates for voting...");
      const response = await axios.get("http://localhost:5000/api/candidates");
      console.log("✅ Voting candidates:", response.data);
      setCandidates(response.data);
      setLoading(false);
    } catch (error) {
      console.error("❌ Error fetching candidates:", error);
      alert("Failed to load candidates. Please try again.");
      setLoading(false);
    }
  };

  const checkVoteStatus = async (voterId) => {
    try {
      console.log("🔍 Checking vote status for:", voterId);
      const response = await axios.get(
        `http://localhost:5000/api/check-vote-status/${voterId}`
      );
      console.log("✅ Vote status:", response.data);
      setHasVoted(response.data.hasVoted);
    } catch (error) {
      console.error("❌ Error checking vote status:", error);
    }
  };

  const castVote = async (candidateId) => {
    if (hasVoted) {
      alert("❌ You have already voted!");
      return;
    }

    if (
      !window.confirm(
        "Are you sure you want to vote for this candidate? This action cannot be undone."
      )
    ) {
      return;
    }

    setVoting(true);
    try {
      console.log("🗳️ Casting vote for candidate:", candidateId);
      const response = await axios.post("http://localhost:5000/api/vote", {
        voterId: voterId.trim(),
        candidateId: candidateId,
      });

      console.log("✅ Vote response:", response.data);

      if (response.data.success) {
        alert("✅ Vote cast successfully!");
        setHasVoted(true);
        // Refresh candidates to show updated vote counts
        fetchCandidates();
      }
    } catch (error) {
      console.error("❌ Error casting vote:", error);

      if (error.response) {
        console.error("Response error:", error.response.data);
        alert(
          "❌ Failed to cast vote: " +
            (error.response.data.message || "Server error")
        );
      } else if (error.request) {
        console.error("No response:", error.request);
        alert("❌ No response from server. Please try again.");
      } else {
        alert("❌ Error: " + error.message);
      }
    } finally {
      setVoting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("voterId");
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="voting-background">
        <div className="loading">Loading candidates...</div>
      </div>
    );
  }

  return (
    <div className="voting-background">
      <div className="voting-container">
        <div className="voting-card">
          <div className="voting-header">
            <h1>🗳️ Cast Your Vote</h1>
            <p>Choose your preferred candidate</p>
            {hasVoted && (
              <div className="already-voted-message">
                ✅ You have already voted. Thank you for participating!
              </div>
            )}
          </div>

          <div className="candidates-list">
            {candidates.length === 0 ? (
              <div className="no-candidates">
                <h3>📭 No candidates available</h3>
                <p>Candidates will appear here once added by the admin.</p>
                <button onClick={fetchCandidates} className="refresh-btn">
                  🔄 Refresh
                </button>
              </div>
            ) : (
              candidates.map((candidate) => (
                <div key={candidate.id} className="candidate-card">
                  <div className="candidate-info">
                    <h3>{candidate.name}</h3>
                    <p className="party">{candidate.party}</p>
                    <p className="votes">Votes: {candidate.votes}</p>
                  </div>
                  <button
                    onClick={() => castVote(candidate.id)}
                    disabled={hasVoted || voting}
                    className={`vote-btn ${hasVoted ? "disabled" : ""}`}
                  >
                    {voting ? "Voting..." : hasVoted ? "Already Voted" : "Vote"}
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="voting-footer">
            <button onClick={handleLogout} className="logout-btn">
              🚪 Logout
            </button>
            <button onClick={fetchCandidates} className="refresh-btn">
              🔄 Refresh Candidates
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Voting;
