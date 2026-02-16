const { Web3 } = require("web3");
const contractInfo = require("../blockchain/contract-info.json");
const EVotingABI =
  require("../blockchain/artifacts/contracts/EVoting.sol/EVoting.json").abi;

class BlockchainService {
  constructor() {
    // Connect to local Ganache blockchain (FREE)
    this.web3 = new Web3("http://localhost:8545");
    this.contractAddress = contractInfo.address;
    this.contract = new this.web3.eth.Contract(
      EVotingABI,
      this.contractAddress
    );

    // Admin account (first account from Ganache)
    this.adminAccount = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // Ganache default
    this.privateKey =
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Ganache default

    console.log("🔗 Blockchain service initialized");
  }

  /**
   * Generate hash for face image for blockchain storage
   */
  generateFaceHash(faceImageData) {
    return this.web3.utils.sha3(faceImageData);
  }

  /**
   * Add candidate to blockchain
   */
  async addCandidateToBlockchain(candidateId, name, party) {
    try {
      console.log(
        `📝 Adding candidate to blockchain: ${name} (ID: ${candidateId})`
      );

      const transaction = this.contract.methods.addCandidate(
        candidateId,
        name,
        party
      );

      const gas = await transaction.estimateGas({ from: this.adminAccount });
      const gasPrice = await this.web3.eth.getGasPrice();

      const signedTx = await this.web3.eth.accounts.signTransaction(
        {
          to: this.contractAddress,
          data: transaction.encodeABI(),
          gas,
          gasPrice,
        },
        this.privateKey
      );

      const receipt = await this.web3.eth.sendSignedTransaction(
        signedTx.rawTransaction
      );
      console.log(
        "✅ Candidate added to blockchain. Tx:",
        receipt.transactionHash
      );

      return {
        success: true,
        transactionHash: receipt.transactionHash,
      };
    } catch (error) {
      console.error("❌ Error adding candidate to blockchain:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Cast vote on blockchain - MAIN SECURITY FUNCTION
   */
  async castVoteOnBlockchain(voterId, candidateId, faceImagePath) {
    try {
      console.log(
        `🗳️ Casting vote on blockchain - Voter: ${voterId}, Candidate: ${candidateId}`
      );

      // Generate hash for face image (simplified - in production, use actual image hash)
      const faceImageHash = this.generateFaceHash(
        voterId + faceImagePath + Date.now()
      );

      const transaction = this.contract.methods.castVote(
        voterId,
        candidateId,
        faceImageHash
      );

      const gas = await transaction.estimateGas({ from: this.adminAccount });
      const gasPrice = await this.web3.eth.getGasPrice();

      const signedTx = await this.web3.eth.accounts.signTransaction(
        {
          to: this.contractAddress,
          data: transaction.encodeABI(),
          gas,
          gasPrice,
        },
        this.privateKey
      );

      const receipt = await this.web3.eth.sendSignedTransaction(
        signedTx.rawTransaction
      );
      console.log("✅ Vote cast on blockchain. Tx:", receipt.transactionHash);

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
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

  /**
   * Check vote status on blockchain
   */
  async checkVoteStatus(voterId) {
    try {
      const hasVoted = await this.contract.methods
        .checkVoteStatus(voterId)
        .call();
      return {
        success: true,
        hasVoted: hasVoted,
      };
    } catch (error) {
      console.error("❌ Error checking vote status:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get candidate details from blockchain
   */
  async getCandidateFromBlockchain(candidateId) {
    try {
      const candidate = await this.contract.methods
        .getCandidate(candidateId)
        .call();
      return {
        success: true,
        candidate: {
          id: candidate.id,
          name: candidate.name,
          party: candidate.party,
          voteCount: candidate.voteCount,
        },
      };
    } catch (error) {
      console.error("❌ Error getting candidate from blockchain:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get voting results from blockchain
   */
  async getVotingResultsFromBlockchain() {
    try {
      // This is simplified - you might want to store candidate IDs separately
      const results = [];

      // Check first 10 candidate IDs (adjust as needed)
      for (let i = 1; i <= 10; i++) {
        try {
          const candidate = await this.contract.methods.getCandidate(i).call();
          if (candidate.id !== "0") {
            results.push({
              id: candidate.id,
              name: candidate.name,
              party: candidate.party,
              votes: candidate.voteCount,
            });
          }
        } catch (error) {
          // Candidate doesn't exist, continue
          continue;
        }
      }

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

  /**
   * Verify vote on blockchain (for audit)
   */
  async verifyVoteOnBlockchain(voterId, candidateId) {
    try {
      const isValid = await this.contract.methods
        .verifyVote(voterId, candidateId)
        .call();
      return {
        success: true,
        isValid: isValid,
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

module.exports = new BlockchainService();
