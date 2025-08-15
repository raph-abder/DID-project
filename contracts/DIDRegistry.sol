// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DIDRegistry is Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    struct DIDDocument {
        string id;
        address controller;
        string publicKey;
        uint256 created;
        uint256 updated;
        bool isActive;
        bool isTrustedIssuer;
    }

    struct AcceptanceRecord {
        string issuerDID;
        string recipientDID;
        uint256 timestamp;
    }

    struct TrustMetrics {
        uint256 totalIssued;
        uint256 totalAccepted;
        uint256 lastUpdated;
        uint256 trustScore;
    }

    mapping(string => DIDDocument) public didDocuments;
    mapping(address => string[]) public controllerToDIDs;
    mapping(string => TrustMetrics) public issuerTrustMetrics;
    mapping(string => mapping(string => uint256)) public issuerToRecipientAcceptances;
    mapping(string => string[]) public issuerAcceptedBy;
    
    string[] public allDIDs;
    string public adminDID;
    bool public adminSet;
    AcceptanceRecord[] public acceptanceHistory;

    event DIDCreated(string indexed didId, address indexed controller, string publicKey);
    event DIDUpdated(string indexed didId);
    event DIDDeactivated(string indexed didId);
    event TrustedIssuerAdded(string indexed issuerDID);
    event TrustedIssuerRemoved(string indexed issuerDID);
    event AdminDIDSet(string indexed adminDID);
    event CredentialAccepted(string indexed issuerDID, string indexed recipientDID);
    event TrustScoreUpdated(string indexed issuerDID, uint256 newTrustScore);

    constructor() Ownable(msg.sender) {
        adminSet = false;
    }

    modifier onlyDIDController(string memory didId) {
        require(didDocuments[didId].controller == msg.sender, "Not DID controller");
        require(didDocuments[didId].isActive, "DID not active");
        _;
    }

    modifier onlyAdmin() {
        require(adminSet, "Admin DID not set");
        require(didDocuments[adminDID].controller == msg.sender, "Not admin");
        require(didDocuments[adminDID].isActive, "Admin DID not active");
        _;
    }

    modifier didExists(string memory didId) {
        require(didDocuments[didId].controller != address(0), "DID does not exist");
        _;
    }

    function createDID(string memory didId, string memory publicKey) external {
        require(bytes(didId).length > 0, "DID ID cannot be empty");
        require(bytes(publicKey).length > 0, "Public key cannot be empty");
        require(didDocuments[didId].controller == address(0), "DID already exists");

        didDocuments[didId] = DIDDocument({
            id: didId,
            controller: msg.sender,
            publicKey: publicKey,
            created: block.timestamp,
            updated: block.timestamp,
            isActive: true,
            isTrustedIssuer: false
        });

        controllerToDIDs[msg.sender].push(didId);
        allDIDs.push(didId);

        if (!adminSet) {
            adminDID = didId;
            adminSet = true;
            emit AdminDIDSet(didId);
        }

        emit DIDCreated(didId, msg.sender, publicKey);
    }

    function updateDID(string memory didId, string memory newPublicKey) external onlyDIDController(didId) {
        require(bytes(newPublicKey).length > 0, "Public key cannot be empty");
        
        didDocuments[didId].publicKey = newPublicKey;
        didDocuments[didId].updated = block.timestamp;
        
        emit DIDUpdated(didId);
    }

    function deactivateDID(string memory didId) external onlyDIDController(didId) {
        require(keccak256(bytes(didId)) != keccak256(bytes(adminDID)), "Cannot deactivate admin DID");
        
        require(!didDocuments[didId].isTrustedIssuer, "Cannot deactivate trusted issuer");
        
        didDocuments[didId].isActive = false;
        didDocuments[didId].updated = block.timestamp;
        emit DIDDeactivated(didId);
    }

    function addTrustedIssuer(string memory issuerDID) external onlyAdmin {
        require(didDocuments[issuerDID].isActive, "Issuer DID not active");
        require(!didDocuments[issuerDID].isTrustedIssuer, "Issuer already trusted");
        
        didDocuments[issuerDID].isTrustedIssuer = true;
        didDocuments[issuerDID].updated = block.timestamp;
        
        emit TrustedIssuerAdded(issuerDID);
    }

    function removeTrustedIssuer(string memory issuerDID) external onlyAdmin {
        require(didDocuments[issuerDID].isTrustedIssuer, "Issuer not trusted");
        
        didDocuments[issuerDID].isTrustedIssuer = false;
        didDocuments[issuerDID].updated = block.timestamp;
        
        emit TrustedIssuerRemoved(issuerDID);
    }

    function verifySignature(string memory didId, bytes32 messageHash, bytes memory signature
    ) external view didExists(didId) returns (bool) {
        require(didDocuments[didId].isActive, "DID not active");

        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedMessageHash.recover(signature);
        return recoveredSigner == didDocuments[didId].controller;
    }

    function verifyDataSignature(string memory didId, bytes memory data, bytes memory signature
    ) external view didExists(didId) returns (bool) {
        require(didDocuments[didId].isActive, "DID not active");
        
        bytes32 dataHash = keccak256(data);
        bytes32 ethSignedMessageHash = dataHash.toEthSignedMessageHash();

        address recoveredSigner = ethSignedMessageHash.recover(signature);
        return recoveredSigner == didDocuments[didId].controller;
    }

    function getDIDDocument(string memory didId) external view didExists(didId) returns (DIDDocument memory) {
        return didDocuments[didId];
    }

    function isTrustedIssuer(string memory didId) external view returns (bool) {
        return didDocuments[didId].isTrustedIssuer && didDocuments[didId].isActive;
    }

    function isAdminDID(string memory didId) external view returns (bool) {
        return keccak256(bytes(didId)) == keccak256(bytes(adminDID));
    }

    function getDIDsByController(address controller) external view returns (string[] memory) {
        return controllerToDIDs[controller];
    }

    function isDIDActive(string memory didId) external view didExists(didId) returns (bool) {
        return didDocuments[didId].isActive;
    }

    function getAllDIDs() external view returns (string[] memory) {
        return allDIDs;
    }

    function getAllDIDsCount() external view returns (uint256) {
        return allDIDs.length;
    }

    function recordCredentialIssuance(string memory issuerDID, string memory recipientDID) external {
        require(didDocuments[issuerDID].controller == msg.sender, "Not issuer DID controller");
        require(didDocuments[issuerDID].isActive, "Issuer DID not active");
        require(didDocuments[recipientDID].isActive, "Recipient DID not active");

        issuerTrustMetrics[issuerDID].totalIssued++;
        issuerTrustMetrics[issuerDID].lastUpdated = block.timestamp;
    }

    function recordCredentialAcceptance(string memory issuerDID, string memory recipientDID) external {
        require(didDocuments[recipientDID].controller == msg.sender, "Not recipient DID controller");
        require(didDocuments[issuerDID].isActive, "Issuer DID not active");
        require(didDocuments[recipientDID].isActive, "Recipient DID not active");

        if (issuerToRecipientAcceptances[issuerDID][recipientDID] == 0) {
            issuerAcceptedBy[issuerDID].push(recipientDID);
        }
        
        issuerToRecipientAcceptances[issuerDID][recipientDID]++;
        issuerTrustMetrics[issuerDID].totalAccepted++;
        issuerTrustMetrics[issuerDID].lastUpdated = block.timestamp;
        
        acceptanceHistory.push(AcceptanceRecord({
            issuerDID: issuerDID,
            recipientDID: recipientDID,
            timestamp: block.timestamp
        }));

        emit CredentialAccepted(issuerDID, recipientDID);
    }

    function updateTrustScore(string memory issuerDID, uint256 newScore) external onlyAdmin {
        issuerTrustMetrics[issuerDID].trustScore = newScore;
        issuerTrustMetrics[issuerDID].lastUpdated = block.timestamp;
        emit TrustScoreUpdated(issuerDID, newScore);
    }

    function getTrustMetrics(string memory issuerDID) external view returns (TrustMetrics memory) {
        return issuerTrustMetrics[issuerDID];
    }

    function getAcceptanceCount(string memory issuerDID, string memory recipientDID) external view returns (uint256) {
        return issuerToRecipientAcceptances[issuerDID][recipientDID];
    }

    function getAcceptedByList(string memory issuerDID) external view returns (string[] memory) {
        return issuerAcceptedBy[issuerDID];
    }

    function getAcceptanceHistoryLength() external view returns (uint256) {
        return acceptanceHistory.length;
    }

    function getAcceptanceRecord(uint256 index) external view returns (AcceptanceRecord memory) {
        require(index < acceptanceHistory.length, "Index out of bounds");
        return acceptanceHistory[index];
    }
    
}
