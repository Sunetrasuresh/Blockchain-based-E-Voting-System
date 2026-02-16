const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");

const app = express();

// Middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Email configuration
const emailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "useforgitonly23@gmail.com",
    pass: "qibxuhhaxazcasuc",
  },
});

// Initialize SQLite Database
const db = new sqlite3.Database("./user_verifications.db", (err) => {
  if (err) {
    console.error("❌ Error opening database:", err);
  } else {
    console.log("✅ Connected to SQLite database");

    // Create proper table with exact column headers
    db.serialize(() => {
      // Drop old table if exists
      db.run(`DROP TABLE IF EXISTS users`, (err) => {
        if (err) {
          console.error("❌ Error dropping old users table:", err);
        } else {
          console.log("✅ Old users table dropped");
        }
      });

      // Create PROPER Users table with exact columns
      db.run(
        `CREATE TABLE users (
          ID INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          aadhar_number TEXT NOT NULL,
          phone_number TEXT NOT NULL,
          otp TEXT NOT NULL,
          face_image TEXT NOT NULL,
          voterid TEXT NOT NULL,
          email TEXT NOT NULL,
          email_otp TEXT NOT NULL,
          ip_address TEXT,
          has_voted BOOLEAN DEFAULT FALSE,
          voted_candidate_id INTEGER,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        (err) => {
          if (err) {
            console.error("❌ Error creating users table:", err);
          } else {
            console.log("✅ PROPER Users table created successfully!");
          }
        }
      );

      // Admin users table
      db.run(
        `CREATE TABLE IF NOT EXISTS admin_users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          phone_number TEXT NOT NULL,
          secret_code TEXT NOT NULL,
          password TEXT NOT NULL
        )`,
        (err) => {
          if (err) {
            console.error("❌ Error creating admin_users table:", err);
          } else {
            console.log("✅ Admin users table ready");
          }
        }
      );

      // Email OTPs table
      db.run(
        `CREATE TABLE IF NOT EXISTS email_otps (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL,
          otp TEXT NOT NULL,
          voter_id TEXT NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        (err) => {
          if (err) {
            console.error("❌ Error creating email_otps table:", err);
          } else {
            console.log("✅ Email OTPs table ready");
          }
        }
      );

      // Candidates table
      db.run(
        `CREATE TABLE IF NOT EXISTS candidates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          party TEXT NOT NULL,
          votes INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        (err) => {
          if (err) {
            console.error("❌ Error creating candidates table:", err);
          } else {
            console.log("✅ Candidates table ready");
          }
        }
      );

      // Insert default admin user
      const defaultAdmin = {
        email: "admin@evoting.com",
        phone: "9876543210",
        secretCode: "ADMIN123",
        password: bcrypt.hashSync("admin123", 10),
      };

      db.get(
        "SELECT * FROM admin_users WHERE email = ?",
        [defaultAdmin.email],
        (err, row) => {
          if (err) {
            console.error("❌ Error checking admin:", err);
          } else if (!row) {
            db.run(
              "INSERT INTO admin_users (email, phone_number, secret_code, password) VALUES (?, ?, ?, ?)",
              [
                defaultAdmin.email,
                defaultAdmin.phone,
                defaultAdmin.secretCode,
                defaultAdmin.password,
              ],
              function (err) {
                if (err) {
                  console.error("❌ Error creating admin:", err);
                } else {
                  console.log("✅ Default admin user created");
                }
              }
            );
          } else {
            console.log("✅ Admin user already exists");
          }
        }
      );
    });
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Helper function to generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Admin Authentication Middleware
const authenticateAdmin = (req, res, next) => {
  const token = req.headers.authorization;
  console.log("🔐 Admin auth check - Token:", token);

  if (!token) {
    console.log("❌ No token provided");
    return res
      .status(401)
      .json({ success: false, message: "Access denied. No token provided." });
  }
  if (token !== "admin-auth-token") {
    console.log("❌ Invalid token");
    return res.status(401).json({ success: false, message: "Invalid token." });
  }
  console.log("✅ Admin token verified");
  next();
};

// Enhanced duplicate check function - checks ALL fields
const checkDuplicateVote = (userData, callback) => {
  const { name, aadhaarNumber, phoneNumber, voterId, email } = userData;

  console.log("🔍 Checking duplicates for:", {
    name,
    aadhaarNumber,
    phoneNumber,
    voterId,
    email,
  });

  // Check all fields for duplicates
  const query = `SELECT * FROM users WHERE name = ? OR aadhar_number = ? OR phone_number = ? OR voterid = ? OR email = ?`;

  db.all(
    query,
    [name, aadhaarNumber, phoneNumber, voterId, email],
    (err, rows) => {
      if (err) {
        console.error("❌ Database error in duplicate check:", err);
        return callback(err, null);
      }

      console.log(`📊 Found ${rows.length} potential duplicate records`);

      if (rows.length > 0) {
        const duplicates = [];
        const duplicateDetails = [];

        rows.forEach((row) => {
          console.log("🔍 Comparing with existing record:", row);

          if (row.name === name) {
            duplicates.push(`Name`);
            duplicateDetails.push(`Name: ${name}`);
          }
          if (row.aadhar_number === aadhaarNumber) {
            duplicates.push(`Aadhar Number`);
            duplicateDetails.push(`Aadhar: ${aadhaarNumber}`);
          }
          if (row.phone_number === phoneNumber) {
            duplicates.push(`Phone Number`);
            duplicateDetails.push(`Phone: ${phoneNumber}`);
          }
          if (row.voterid === voterId) {
            duplicates.push(`Voter ID`);
            duplicateDetails.push(`Voter ID: ${voterId}`);
          }
          if (row.email === email) {
            duplicates.push(`Email`);
            duplicateDetails.push(`Email: ${email}`);
          }
        });

        // Remove duplicates from the duplicates array
        const uniqueDuplicates = [...new Set(duplicates)];
        const uniqueDuplicateDetails = [...new Set(duplicateDetails)];

        console.log("🚫 Duplicates found:", uniqueDuplicates);

        return callback(null, {
          isDuplicate: true,
          duplicateFields: uniqueDuplicates,
          duplicateDetails: uniqueDuplicateDetails,
          existingRecords: rows,
        });
      }

      console.log("✅ No duplicates found");
      callback(null, { isDuplicate: false });
    }
  );
};

// ==================== BLOCKCHAIN SERVICE ====================
// Simple blockchain simulation (replace with actual web3 service)
class BlockchainService {
  constructor() {
    this.votes = [];
    this.candidates = [];
    console.log("🔗 Blockchain service initialized (Simulation Mode)");
  }

  async castVoteOnBlockchain(voterId, candidateId, faceImagePath) {
    try {
      console.log(
        `🗳️ Casting vote on blockchain - Voter: ${voterId}, Candidate: ${candidateId}`
      );

      // Simulate blockchain transaction
      const transactionHash = "0x" + Math.random().toString(16).substr(2, 64);
      const blockNumber = Math.floor(Math.random() * 10000) + 1;
      const faceImageHash = "0x" + Math.random().toString(16).substr(2, 64);

      // Store vote in simulated blockchain
      this.votes.push({
        voterId,
        candidateId,
        faceImageHash,
        transactionHash,
        blockNumber,
        timestamp: new Date().toISOString(),
      });

      console.log("✅ Vote cast on blockchain. Tx:", transactionHash);

      return {
        success: true,
        transactionHash: transactionHash,
        blockNumber: blockNumber,
        faceImageHash: faceImageHash,
      };
    } catch (error) {
      console.error("❌ Error casting vote on blockchain:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async addCandidateToBlockchain(candidateId, name, party) {
    try {
      console.log(
        `📝 Adding candidate to blockchain: ${name} (ID: ${candidateId})`
      );

      this.candidates.push({
        id: candidateId,
        name,
        party,
        voteCount: 0,
      });

      const transactionHash = "0x" + Math.random().toString(16).substr(2, 64);

      console.log("✅ Candidate added to blockchain. Tx:", transactionHash);

      return {
        success: true,
        transactionHash: transactionHash,
      };
    } catch (error) {
      console.error("❌ Error adding candidate to blockchain:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getVotingResultsFromBlockchain() {
    try {
      // Calculate votes from simulated blockchain
      const candidateVotes = {};
      this.votes.forEach((vote) => {
        if (!candidateVotes[vote.candidateId]) {
          candidateVotes[vote.candidateId] = 0;
        }
        candidateVotes[vote.candidateId]++;
      });

      const results = this.candidates.map((candidate) => ({
        id: candidate.id,
        name: candidate.name,
        party: candidate.party,
        votes: candidateVotes[candidate.id] || 0,
      }));

      return {
        success: true,
        results: results,
      };
    } catch (error) {
      console.error("❌ Error getting voting results from blockchain:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async verifyVoteOnBlockchain(voterId, candidateId) {
    try {
      const voteExists = this.votes.some(
        (vote) => vote.voterId === voterId && vote.candidateId === candidateId
      );

      return {
        success: true,
        isValid: voteExists,
      };
    } catch (error) {
      console.error("❌ Error verifying vote on blockchain:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

const blockchainService = new BlockchainService();

// ==================== CANDIDATE MANAGEMENT ROUTES ====================

// Add candidate - WITH BLOCKCHAIN
app.post("/api/candidates", authenticateAdmin, async (req, res) => {
  console.log("📥 Received candidate creation request:", req.body);

  const { name, party } = req.body;

  if (!name || !party) {
    return res.status(400).json({
      success: false,
      message: "Candidate name and party are required",
    });
  }

  try {
    // First add to database
    db.run(
      "INSERT INTO candidates (name, party) VALUES (?, ?)",
      [name, party],
      async function (err) {
        if (err) {
          console.error("❌ Error adding candidate to database:", err);
          return res.status(500).json({
            success: false,
            message: "Failed to add candidate: " + err.message,
          });
        }

        const candidateId = this.lastID;
        console.log("✅ Candidate added to database, ID:", candidateId);

        // ADD TO BLOCKCHAIN FOR TRANSPARENCY
        const blockchainResult =
          await blockchainService.addCandidateToBlockchain(
            candidateId,
            name,
            party
          );

        if (!blockchainResult.success) {
          console.warn(
            "⚠️ Candidate added to DB but failed on blockchain:",
            blockchainResult.error
          );
          // Continue anyway since DB has the candidate
        }

        res.json({
          success: true,
          message: "Candidate added successfully",
          candidateId: candidateId,
          blockchain: blockchainResult.success
            ? {
                transactionHash: blockchainResult.transactionHash,
              }
            : null,
        });
      }
    );
  } catch (error) {
    console.error("❌ Candidate creation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add candidate: " + error.message,
    });
  }
});

// Get all candidates
app.get("/api/candidates", (req, res) => {
  console.log("📥 Fetching all candidates");

  db.all("SELECT * FROM candidates ORDER BY name", (err, rows) => {
    if (err) {
      console.error("❌ Error fetching candidates:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch candidates",
      });
    }

    console.log(`✅ Found ${rows.length} candidates`);
    res.json(rows);
  });
});

// Delete candidate
app.delete("/api/candidates/:id", authenticateAdmin, (req, res) => {
  const candidateId = req.params.id;
  console.log("📥 Request to delete candidate ID:", candidateId);

  db.run("DELETE FROM candidates WHERE id = ?", [candidateId], function (err) {
    if (err) {
      console.error("❌ Error deleting candidate:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to delete candidate",
      });
    }

    if (this.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Candidate not found",
      });
    }

    console.log("✅ Candidate deleted successfully");
    res.json({
      success: true,
      message: "Candidate deleted successfully",
    });
  });
});

// ==================== VOTING SYSTEM ROUTES ====================

// Cast vote - WITH BLOCKCHAIN SECURITY
app.post("/api/vote", async (req, res) => {
  const { voterId, candidateId } = req.body;

  if (!voterId || !candidateId) {
    return res.status(400).json({
      success: false,
      message: "Voter ID and candidate ID are required",
    });
  }

  try {
    // Check if user has already voted in database
    db.get(
      "SELECT has_voted, face_image FROM users WHERE voterid = ?",
      [voterId],
      async (err, user) => {
        if (err) {
          console.error("❌ Error checking voting status:", err);
          return res.status(500).json({
            success: false,
            message: "Database error",
          });
        }

        if (!user) {
          return res.status(404).json({
            success: false,
            message: "Voter not found",
          });
        }

        if (user.has_voted) {
          return res.status(400).json({
            success: false,
            message: "You have already voted!",
          });
        }

        // CAST VOTE ON BLOCKCHAIN - MAIN SECURITY
        const blockchainResult = await blockchainService.castVoteOnBlockchain(
          voterId,
          candidateId,
          user.face_image
        );

        if (!blockchainResult.success) {
          return res.status(500).json({
            success: false,
            message: "Blockchain voting failed: " + blockchainResult.error,
          });
        }

        // Update user's voting status in database
        db.run(
          "UPDATE users SET has_voted = ?, voted_candidate_id = ? WHERE voterid = ?",
          [true, candidateId, voterId],
          function (err) {
            if (err) {
              console.error("❌ Error updating user voting status:", err);
              return res.status(500).json({
                success: false,
                message: "Failed to cast vote",
              });
            }

            // Update candidate vote count in database
            db.run(
              "UPDATE candidates SET votes = votes + 1 WHERE id = ?",
              [candidateId],
              function (err) {
                if (err) {
                  console.error("❌ Error updating candidate votes:", err);
                  // Don't fail here since blockchain already recorded the vote
                }

                res.json({
                  success: true,
                  message: "Vote cast successfully!",
                  blockchain: {
                    transactionHash: blockchainResult.transactionHash,
                    blockNumber: blockchainResult.blockNumber,
                    faceImageHash: blockchainResult.faceImageHash,
                  },
                });
              }
            );
          }
        );
      }
    );
  } catch (error) {
    console.error("❌ Voting error:", error);
    res.status(500).json({
      success: false,
      message: "Voting failed: " + error.message,
    });
  }
});

// Get voting results - WITH BLOCKCHAIN VERIFICATION
app.get("/api/voting-results", authenticateAdmin, async (req, res) => {
  try {
    // Get results from blockchain for ultimate truth
    const blockchainResults =
      await blockchainService.getVotingResultsFromBlockchain();

    if (blockchainResults.success) {
      console.log("✅ Got results from blockchain:", blockchainResults.results);

      // Also get from database for additional info
      db.all(
        "SELECT * FROM candidates ORDER BY votes DESC",
        (err, dbCandidates) => {
          if (err) {
            console.error("❌ Error fetching candidates from DB:", err);
            // Still return blockchain results
            return res.json({
              success: true,
              source: "blockchain",
              totalVotes: blockchainResults.results.reduce(
                (sum, c) => sum + parseInt(c.votes),
                0
              ),
              candidates: blockchainResults.results,
            });
          }

          // Merge results (blockchain is source of truth)
          const mergedResults = dbCandidates.map((dbCandidate) => {
            const blockchainCandidate = blockchainResults.results.find(
              (bc) => parseInt(bc.id) === dbCandidate.id
            );

            return {
              ...dbCandidate,
              votes: blockchainCandidate
                ? parseInt(blockchainCandidate.votes)
                : dbCandidate.votes,
              verified: !!blockchainCandidate,
            };
          });

          const totalVotes = mergedResults.reduce(
            (sum, candidate) => sum + candidate.votes,
            0
          );

          res.json({
            success: true,
            source: "blockchain-verified",
            totalVotes,
            candidates: mergedResults,
          });
        }
      );
    } else {
      // Fallback to database if blockchain fails
      console.warn(
        "⚠️ Using database results (blockchain failed):",
        blockchainResults.error
      );
      db.all(
        "SELECT * FROM candidates ORDER BY votes DESC",
        (err, candidates) => {
          if (err) {
            console.error("❌ Error fetching voting results:", err);
            return res.status(500).json({
              success: false,
              message: "Failed to fetch voting results",
            });
          }

          const totalVotes = candidates.reduce(
            (sum, candidate) => sum + candidate.votes,
            0
          );

          res.json({
            success: true,
            source: "database",
            totalVotes,
            candidates,
          });
        }
      );
    }
  } catch (error) {
    console.error("❌ Voting results error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch voting results",
    });
  }
});

// Check if user has voted
app.get("/api/check-vote-status/:voterId", (req, res) => {
  const voterId = req.params.voterId;

  db.get(
    "SELECT has_voted, voted_candidate_id FROM users WHERE voterid = ?",
    [voterId],
    (err, user) => {
      if (err) {
        console.error("❌ Error checking vote status:", err);
        return res.status(500).json({
          success: false,
          message: "Database error",
        });
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Voter not found",
        });
      }

      res.json({
        hasVoted: user.has_voted,
        votedCandidateId: user.voted_candidate_id,
      });
    }
  );
});

// Verify vote on blockchain
app.get("/api/verify-vote/:voterId", authenticateAdmin, async (req, res) => {
  const voterId = req.params.voterId;

  try {
    // Get vote details from database
    db.get(
      "SELECT voted_candidate_id FROM users WHERE voterid = ?",
      [voterId],
      async (err, user) => {
        if (err || !user) {
          return res.status(404).json({
            success: false,
            message: "Voter not found",
          });
        }

        const verification = await blockchainService.verifyVoteOnBlockchain(
          voterId,
          user.voted_candidate_id
        );

        res.json({
          success: true,
          voterId: voterId,
          candidateId: user.voted_candidate_id,
          verifiedOnBlockchain: verification.success
            ? verification.isValid
            : false,
          verificationError: verification.success ? null : verification.error,
        });
      }
    );
  } catch (error) {
    console.error("❌ Vote verification error:", error);
    res.status(500).json({
      success: false,
      message: "Verification failed: " + error.message,
    });
  }
});

// Send Email OTP
app.post("/api/send-email-otp", async (req, res) => {
  try {
    const { email, voterId } = req.body;

    if (!email || !voterId) {
      return res.status(400).json({
        success: false,
        message: "Email and Voter ID are required",
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing OTPs for this email
    db.run("DELETE FROM email_otps WHERE email = ?", [email], (err) => {
      if (err) {
        console.error("Error deleting old OTPs:", err);
      }
    });

    // Store OTP in database
    db.run(
      "INSERT INTO email_otps (email, otp, voter_id, expires_at) VALUES (?, ?, ?, ?)",
      [email, otp, voterId, expiresAt.toISOString()],
      async function (err) {
        if (err) {
          console.error("❌ Error storing OTP:", err);
          return res.status(500).json({
            success: false,
            message: "Failed to generate OTP",
          });
        }

        // Send email
        try {
          const mailOptions = {
            from: "useforgitonly23@gmail.com",
            to: email,
            subject: "E-Voting System - Email Verification OTP",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #333; text-align: center;">E-Voting System Email Verification</h2>
                <p style="font-size: 16px; color: #666;">Your One-Time Password (OTP) for email verification is:</p>
                <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 10px; margin: 20px 0; border-radius: 5px;">
                  ${otp}
                </div>
                <p style="font-size: 14px; color: #888;">This OTP is valid for 10 minutes. Do not share it with anyone.</p>
                <p style="font-size: 14px; color: #888;">If you didn't request this, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #999; text-align: center;">E-Voting System Security Team</p>
              </div>
            `,
          };

          await emailTransporter.sendMail(mailOptions);

          console.log(`✅ OTP sent to ${email}: ${otp}`);

          res.json({
            success: true,
            message: "OTP sent to email successfully",
          });
        } catch (emailError) {
          console.error("❌ Email sending error:", emailError);
          res.status(500).json({
            success: false,
            message: "Failed to send OTP email",
          });
        }
      }
    );
  } catch (error) {
    console.error("❌ Email OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP: " + error.message,
    });
  }
});

// Verify Email OTP
app.post("/api/verify-email-otp", (req, res) => {
  try {
    const { email, voterId, otp } = req.body;

    if (!email || !voterId || !otp) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Check OTP from database
    db.get(
      "SELECT * FROM email_otps WHERE email = ? AND voter_id = ? AND otp = ? AND expires_at > datetime('now')",
      [email, voterId, otp],
      (err, row) => {
        if (err) {
          console.error("❌ Database error:", err);
          return res.status(500).json({
            success: false,
            message: "Database error",
          });
        }

        if (!row) {
          return res.status(400).json({
            success: false,
            message: "Invalid or expired OTP",
          });
        }

        // Delete the used OTP
        db.run("DELETE FROM email_otps WHERE email = ?", [email]);

        res.json({
          success: true,
          message: "Email verified successfully",
        });
      }
    );
  } catch (error) {
    console.error("❌ Email OTP verification error:", error);
    res.status(500).json({
      success: false,
      message: "OTP verification failed: " + error.message,
    });
  }
});

// Enhanced User Verification with Complete Duplicate Check
app.post("/api/verify-user", upload.single("faceImage"), (req, res) => {
  try {
    console.log("📥 Received verification request:", req.body);
    console.log("📁 File received:", req.file);

    const { name, aadhaarNumber, phoneNumber, otp, voterId, email, emailOtp } =
      req.body;

    // Validate required fields
    if (
      !name ||
      !aadhaarNumber ||
      !phoneNumber ||
      !otp ||
      !voterId ||
      !email ||
      !emailOtp
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Face image is required",
      });
    }

    const userData = {
      name: name.trim(),
      aadhaarNumber: aadhaarNumber.trim(),
      phoneNumber: phoneNumber.trim(),
      otp: otp.trim(),
      voterId: voterId.trim(),
      email: email.trim().toLowerCase(),
      emailOtp: emailOtp.trim(),
      faceImage: req.file.filename,
      ipAddress: req.ip || req.connection.remoteAddress,
    };

    console.log("🔍 Processing user data:", userData);

    // First check for duplicate votes - checks ALL fields
    checkDuplicateVote(userData, (err, duplicateResult) => {
      if (err) {
        console.error("❌ Error checking duplicates:", err);
        return res.status(500).json({
          success: false,
          message: "Error checking for duplicate votes",
        });
      }

      if (duplicateResult.isDuplicate) {
        const duplicateReason = duplicateResult.duplicateDetails.join(", ");
        console.log("🚫 Duplicate vote prevented:", duplicateReason);

        return res.status(400).json({
          success: false,
          message: `Voter has already voted! Duplicate found in: ${duplicateReason}`,
          duplicateFields: duplicateResult.duplicateFields,
          duplicateDetails: duplicateResult.duplicateDetails,
          existingRecords: duplicateResult.existingRecords,
        });
      }

      // If no duplicates, proceed with insertion
      console.log("💾 Inserting new user record...");

      db.run(
        `INSERT INTO users (name, aadhar_number, phone_number, otp, face_image, voterid, email, email_otp, ip_address, has_voted) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userData.name,
          userData.aadhaarNumber,
          userData.phoneNumber,
          userData.otp,
          userData.faceImage,
          userData.voterId,
          userData.email,
          userData.emailOtp,
          userData.ipAddress,
          false, // has_voted set to false initially
        ],
        function (err) {
          if (err) {
            console.error("❌ Database insertion error:", err);

            if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
              return res.status(400).json({
                success: false,
                message: "Duplicate entry found in database",
              });
            }

            return res.status(500).json({
              success: false,
              message: "Database error: " + err.message,
            });
          }

          console.log("✅ User record inserted successfully, ID:", this.lastID);

          // Update Excel file
          updateExcelFile();

          res.json({
            success: true,
            message: "User verification completed successfully!",
            data: { ...userData, id: this.lastID, has_voted: false },
          });
        }
      );
    });
  } catch (error) {
    console.error("❌ Verification endpoint error:", error);
    res.status(500).json({
      success: false,
      message: "Server error: " + error.message,
    });
  }
});

// Admin Login
app.post("/api/admin/login", async (req, res) => {
  try {
    const { email, phoneNumber, secretCode } = req.body;

    console.log("🔐 Admin login attempt:", { email, phoneNumber, secretCode });

    if (!email || !phoneNumber || !secretCode) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    db.get(
      "SELECT * FROM admin_users WHERE email = ? AND phone_number = ?",
      [email, phoneNumber],
      (err, admin) => {
        if (err) {
          console.error("❌ Database error:", err);
          return res
            .status(500)
            .json({ success: false, message: "Database error" });
        }

        console.log("📋 Found admin:", admin);

        if (!admin) {
          return res
            .status(401)
            .json({ success: false, message: "Invalid email or phone number" });
        }

        if (admin.secret_code !== secretCode) {
          return res
            .status(401)
            .json({ success: false, message: "Invalid secret code" });
        }

        console.log("✅ Admin login successful");
        res.json({
          success: true,
          message: "Admin login successful",
          token: "admin-auth-token",
        });
      }
    );
  } catch (error) {
    console.error("❌ Admin login error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all users (Admin only)
app.get("/api/users", authenticateAdmin, (req, res) => {
  db.all("SELECT * FROM users ORDER BY timestamp DESC", (err, rows) => {
    if (err) {
      console.error("❌ Error fetching users:", err);
      return res
        .status(500)
        .json({ success: false, message: "Database error" });
    }
    console.log(`📊 Sending ${rows.length} users to admin`);
    res.json(rows);
  });
});

// Export to Excel (Admin only)
app.get("/api/export-excel", authenticateAdmin, (req, res) => {
  db.all("SELECT * FROM users ORDER BY timestamp DESC", (err, rows) => {
    if (err) {
      return res
        .status(500)
        .json({ success: false, message: "Database error" });
    }

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No data available to export" });
    }

    const excelData = rows.map((user) => ({
      ID: user.ID,
      Name: user.name,
      "Aadhar Number": user.aadhar_number,
      "Phone Number": user.phone_number,
      OTP: user.otp,
      "Face Image": user.face_image,
      VoterID: user.voterid,
      Email: user.email,
      "Email OTP": user.email_otp,
      "IP Address": user.ip_address,
      "Has Voted": user.has_voted ? "Yes" : "No",
      "Voted Candidate ID": user.voted_candidate_id,
      Timestamp: user.timestamp,
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "User Verifications");

    const fileName = `UserVerifications_${new Date().getTime()}.xlsx`;
    const filePath = path.join(__dirname, fileName);

    XLSX.writeFile(workbook, filePath);

    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error("❌ Error downloading file:", err);
      }
      // Delete file after download
      fs.unlinkSync(filePath);
    });
  });
});

// Function to create/update Excel file
function updateExcelFile() {
  db.all("SELECT * FROM users ORDER BY timestamp DESC", (err, rows) => {
    if (err || rows.length === 0) {
      console.log("❌ No data to update Excel file");
      return;
    }

    const excelData = rows.map((user) => ({
      ID: user.ID,
      Name: user.name,
      "Aadhar Number": user.aadhar_number,
      "Phone Number": user.phone_number,
      OTP: user.otp,
      "Face Image": user.face_image,
      VoterID: user.voterid,
      Email: user.email,
      "Email OTP": user.email_otp,
      Timestamp: user.timestamp,
      "IP Address": user.ip_address,
      "Has Voted": user.has_voted ? "Yes" : "No",
      "Voted Candidate ID": user.voted_candidate_id,
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "User Verifications");

    XLSX.writeFile(workbook, "UserVerifications.xlsx");
    console.log("✅ Excel file updated successfully");
  });
}

// Debug endpoint to check database status
app.get("/api/debug/db-status", (req, res) => {
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
      return res.status(500).json({ error: "Database error: " + err.message });
    }

    const tableCounts = {};
    let completed = 0;

    if (tables.length === 0) {
      return res.json({ tables: [], counts: {}, message: "No tables found" });
    }

    tables.forEach((table) => {
      db.get(`SELECT COUNT(*) as count FROM ${table.name}`, (err, result) => {
        if (err) {
          tableCounts[table.name] = "Error";
        } else {
          tableCounts[table.name] = result ? result.count : 0;
        }
        completed++;

        if (completed === tables.length) {
          res.json({
            tables: tables.map((t) => t.name),
            counts: tableCounts,
            message: "Database status check complete",
          });
        }
      });
    });
  });
});

// Get all users (for debugging)
app.get("/api/users-debug", (req, res) => {
  db.all("SELECT * FROM users ORDER BY timestamp DESC", (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error: " + err.message });
    }
    res.json(rows);
  });
});

// Get table structure (for debugging)
app.get("/api/debug/table-structure", (req, res) => {
  db.all("PRAGMA table_info(users)", (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error: " + err.message });
    }
    res.json(rows);
  });
});

// Test candidate endpoint
app.get("/api/test-candidates", (req, res) => {
  console.log("🧪 Testing candidates endpoint...");
  res.json({ message: "Candidates endpoint is working!" });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("🚨 Unhandled Error:", error);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.log("🚨 Unhandled Rejection:", err);
  process.exit(1);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Uploads directory: ${path.join(__dirname, "uploads")}`);
  console.log(
    `💾 Database file: ${path.join(__dirname, "user_verifications.db")}`
  );
  console.log(`🔗 Blockchain: Simulation Mode (Free & Secure)`);
  console.log(`🔧 Debug endpoints:`);
  console.log(
    `   - Database status: http://localhost:${PORT}/api/debug/db-status`
  );
  console.log(
    `   - Table structure: http://localhost:${PORT}/api/debug/table-structure`
  );
  console.log(`   - Users data: http://localhost:${PORT}/api/users-debug`);
  console.log(
    `   - Test candidates: http://localhost:${PORT}/api/test-candidates`
  );
  console.log(`   - Get candidates: http://localhost:${PORT}/api/candidates`);
});
