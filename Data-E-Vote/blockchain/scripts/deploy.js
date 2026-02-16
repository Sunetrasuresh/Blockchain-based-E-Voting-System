const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying E-Voting Smart Contract...");

  const EVoting = await ethers.getContractFactory("EVoting");
  const evoting = await EVoting.deploy();

  await evoting.waitForDeployment();
  const contractAddress = await evoting.getAddress();

  console.log("✅ E-Voting contract deployed to:", contractAddress);

  const admin = await evoting.admin();
  console.log("📝 Contract deployed by:", admin);

  // Save contract info for backend
  const contractInfo = {
    address: contractAddress,
    admin: admin,
    deployedAt: new Date().toISOString(),
    network: "localhost",
  };

  const backendPath = path.join(
    __dirname,
    "..",
    "..",
    "backend",
    "contract-info.json"
  );
  fs.writeFileSync(backendPath, JSON.stringify(contractInfo, null, 2));
  console.log("💾 Contract info saved to backend/contract-info.json");

  // Also save locally
  fs.writeFileSync(
    "./contract-info.json",
    JSON.stringify(contractInfo, null, 2)
  );
  console.log("💾 Contract info saved to blockchain/contract-info.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
