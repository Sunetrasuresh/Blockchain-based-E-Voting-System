const sqlite3 = require("sqlite3").verbose();
const { hashSync } = require("bcryptjs");
const { existsSync, unlinkSync } = require("fs");
const path = require("path");

console.log("🔄 Resetting database...");

// Delete existing database
const dbPath = "./user_verifications.db";
if (existsSync(dbPath)) {
  unlinkSync(dbPath);
  console.log("🗑️ Old database deleted");
} else {
  console.log("📭 No existing database found, creating new one...");
}

// Create new database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Error creating database:", err);
    return;
  }

  console.log("✅ New database created");

  // Create users table with correct schema
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
        console.log("✅ Users table created");
      }
    }
  );

  // Create admin users table
  db.run(
    `CREATE TABLE admin_users (
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
        console.log("✅ Admin users table created");

        // Insert default admin
        const defaultAdmin = {
          email: "admin@evoting.com",
          phone: "9876543210",
          secretCode: "ADMIN123",
          password: hashSync("admin123", 10),
        };

        db.run(
          "INSERT INTO admin_users (email, phone_number, secret_code, password) VALUES (?, ?, ?, ?)",
          [
            defaultAdmin.email,
            defaultAdmin.phone,
            defaultAdmin.secretCode,
            defaultAdmin.password,
          ],
          (err) => {
            if (err) {
              console.error("❌ Error inserting default admin:", err);
            } else {
              console.log("✅ Default admin user created");
              console.log("   Email: admin@evoting.com");
              console.log("   Phone: 9876543210");
              console.log("   Secret Code: ADMIN123");
              console.log("   Password: admin123");
            }

            // Create email_otps table
            db.run(
              `CREATE TABLE email_otps (
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
                  console.log("✅ Email OTPs table created");
                }

                // Create candidates table
                db.run(
                  `CREATE TABLE candidates (
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
                      console.log("✅ Candidates table created");

                      // Add some sample candidates
                      const sampleCandidates = [
                        { name: "John Smith", party: "Democratic Party" },
                        { name: "Sarah Johnson", party: "Republican Party" },
                        { name: "Mike Brown", party: "Independent" },
                      ];

                      sampleCandidates.forEach((candidate, index) => {
                        db.run(
                          "INSERT INTO candidates (name, party) VALUES (?, ?)",
                          [candidate.name, candidate.party],
                          (err) => {
                            if (err) {
                              console.error(
                                "❌ Error inserting sample candidate:",
                                err
                              );
                            } else if (index === sampleCandidates.length - 1) {
                              console.log("✅ Sample candidates added");

                              // Close database
                              db.close((err) => {
                                if (err) {
                                  console.error(
                                    "❌ Error closing database:",
                                    err
                                  );
                                } else {
                                  console.log("🔒 Database closed");
                                  console.log("\n🎉 Database reset complete!");
                                  console.log("📊 Tables created:");
                                  console.log("   - users");
                                  console.log("   - admin_users");
                                  console.log("   - email_otps");
                                  console.log("   - candidates");
                                  console.log("\n🔑 Admin credentials:");
                                  console.log("   Email: admin@evoting.com");
                                  console.log("   Phone: 9876543210");
                                  console.log("   Secret: ADMIN123");
                                  console.log("   Password: admin123");
                                  console.log(
                                    "\n🚀 You can now start your server with: npm run dev"
                                  );
                                }
                              });
                            }
                          }
                        );
                      });
                    }
                  }
                );
              }
            );
          }
        );
      }
    }
  );
});
