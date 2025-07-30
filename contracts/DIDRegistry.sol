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
    }

    mapping(string => DIDDocument) public didDocuments;
    mapping(address => string[]) public controllerToDIDs;
    mapping(string => bool) public trustedIssuers;

    event DIDCreated(string indexed didId, address indexed controller, string publicKey);
    event DIDUpdated(string indexed didId);
    event DIDDeactivated(string indexed didId);
    event TrustedIssuerAdded(string indexed issuerDID);
    event TrustedIssuerRemoved(string indexed issuerDID);

    constructor() Ownable(msg.sender) {}

    modifier onlyDIDController(string memory didId) {
        require(didDocuments[didId].controller == msg.sender, "Not DID controller");
        require(didDocuments[didId].isActive, "DID not active");
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
            isActive: true
        });

        controllerToDIDs[msg.sender].push(didId);

        emit DIDCreated(didId, msg.sender, publicKey);
    }

    function updateDID(string memory didId, string memory newPublicKey) external onlyDIDController(didId) {
        require(bytes(newPublicKey).length > 0, "Public key cannot be empty");
        
        didDocuments[didId].publicKey = newPublicKey;
        didDocuments[didId].updated = block.timestamp;
        
        emit DIDUpdated(didId);
    }

    function deactivateDID(string memory didId) external onlyDIDController(didId) {
        didDocuments[didId].isActive = false;
        didDocuments[didId].updated = block.timestamp;
        emit DIDDeactivated(didId);
    }

    function addTrustedIssuer(string memory issuerDID) external onlyOwner {
        require(didDocuments[issuerDID].isActive, "Issuer DID not active");
        require(!trustedIssuers[issuerDID], "Issuer already trusted");
        trustedIssuers[issuerDID] = true;
        emit TrustedIssuerAdded(issuerDID);
    }

    function removeTrustedIssuer(string memory issuerDID) external onlyOwner {
        trustedIssuers[issuerDID] = false;
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
        return trustedIssuers[didId] && didDocuments[didId].isActive;
    }

    function getDIDsByController(address controller) external view returns (string[] memory) {
        return controllerToDIDs[controller];
    }

    function isDIDActive(string memory didId) external view didExists(didId) returns (bool) {
        return didDocuments[didId].isActive;
    }

    
}
