// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract EVoting {
    address public admin;

    struct Vote {
        string voterId;
        uint256 candidateId;
        uint256 timestamp;
        string faceImageHash;
    }

    struct Candidate {
        uint256 id;
        string name;
        string party;
        uint256 voteCount;
    }

    mapping(string => bool) public hasVoted;
    mapping(uint256 => Candidate) public candidates;
    mapping(uint256 => Vote[]) public candidateVotes;

    event VoteCast(
        string indexed voterId,
        uint256 indexed candidateId,
        uint256 timestamp
    );
    event CandidateAdded(
        uint256 indexed candidateId,
        string name,
        string party
    );

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier validVoter(string memory _voterId) {
        require(bytes(_voterId).length > 0, "Invalid voter ID");
        require(!hasVoted[_voterId], "Voter has already voted");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function addCandidate(
        uint256 _candidateId,
        string memory _name,
        string memory _party
    ) external onlyAdmin {
        require(_candidateId > 0, "Invalid candidate ID");
        require(bytes(_name).length > 0, "Candidate name required");

        candidates[_candidateId] = Candidate(_candidateId, _name, _party, 0);
        emit CandidateAdded(_candidateId, _name, _party);
    }

    function castVote(
        string memory _voterId,
        uint256 _candidateId,
        string memory _faceImageHash
    ) external validVoter(_voterId) {
        require(_candidateId > 0, "Invalid candidate ID");
        require(
            candidates[_candidateId].id == _candidateId,
            "Candidate does not exist"
        );
        require(bytes(_faceImageHash).length > 0, "Face verification required");

        hasVoted[_voterId] = true;
        candidates[_candidateId].voteCount++;

        Vote memory newVote = Vote(
            _voterId,
            _candidateId,
            block.timestamp,
            _faceImageHash
        );
        candidateVotes[_candidateId].push(newVote);

        emit VoteCast(_voterId, _candidateId, block.timestamp);
    }

    function checkVoteStatus(
        string memory _voterId
    ) external view returns (bool) {
        return hasVoted[_voterId];
    }

    function getCandidate(
        uint256 _candidateId
    ) external view returns (uint256, string memory, string memory, uint256) {
        Candidate memory candidate = candidates[_candidateId];
        return (
            candidate.id,
            candidate.name,
            candidate.party,
            candidate.voteCount
        );
    }

    function getVoteCount(
        uint256 _candidateId
    ) external view returns (uint256) {
        return candidates[_candidateId].voteCount;
    }

    function verifyVote(
        string memory _voterId,
        uint256 _candidateId
    ) external view returns (bool) {
        Vote[] memory votes = candidateVotes[_candidateId];
        for (uint i = 0; i < votes.length; i++) {
            if (
                keccak256(bytes(votes[i].voterId)) == keccak256(bytes(_voterId))
            ) {
                return true;
            }
        }
        return false;
    }
}
