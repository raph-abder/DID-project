// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";


contract DIDRegistry {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    struct DID {
        address owner;
        string publicKey;
        uint256 created;
        bool isActive;
    }

    mapping(string => DID) public dids;
    mapping(address => string) public ownerToDID;
    mapping(string => bool) public trustedIssuers;

    event DIDCreated(
        string indexed didId,
        address indexed owner,
        string publicKey
    );
    event DIDDeactivated(string indexed didId);
    event TrustedIssuerAdded(string indexed issuerDID);
    event TrustedIssuerRemoved(string indexed issuerDID);

    address public contractOwner;

    constructor() {
        contractOwner = msg.sender;
    }

    modifier onlyDIDOwner(string memory didId) {
        require(dids[didId].owner == msg.sender, "Not DID owner");
        require(dids[didId].isActive, "DID not active");
        _;
    }

    modifier onlyContractOwner() {
        require(msg.sender == contractOwner, "Not contract owner");
        _;
    }

    modifier didExists(string memory didId) {
        require(dids[didId].owner != address(0), "DID does not exist");
        _;
    }

    function createDID(string memory didId, string memory publicKey) external {
        require(bytes(didId).length > 0, "DID ID cannot be empty");
        require(bytes(publicKey).length > 0, "Public key cannot be empty");
        require(dids[didId].owner == address(0), "DID already exists");

        string memory existingDID = ownerToDID[msg.sender];
        if (bytes(existingDID).length > 0) {
            require(!dids[existingDID].isActive, "Address already owns an active DID. Deactivate it first.");
        }

        dids[didId] = DID({
            owner: msg.sender,
            publicKey: publicKey,
            created: block.timestamp,
            isActive: true
        });
        ownerToDID[msg.sender] = didId;

        emit DIDCreated(didId, msg.sender, publicKey);
    }

    function deactivateDID(string memory didId) external onlyDIDOwner(didId) {
        dids[didId].isActive = false;
        delete ownerToDID[msg.sender];
        emit DIDDeactivated(didId);
    }

    function addTrustedIssuer(string memory issuerDID) external onlyContractOwner {
        require(dids[issuerDID].isActive, "Issuer DID not active");
        require(!trustedIssuers[issuerDID], "Issuer already trusted");
        trustedIssuers[issuerDID] = true;
        emit TrustedIssuerAdded(issuerDID);
    }

    function removeTrustedIssuer(string memory issuerDID) external onlyContractOwner {
        trustedIssuers[issuerDID] = false;
        emit TrustedIssuerRemoved(issuerDID);
    }

    function verifySignature(string memory didId, bytes32 messageHash, bytes memory signature
    ) external view returns (bool isValid) {
        require(dids[didId].isActive, "DID not active");

        bytes32 ethSignedMessagaHash = messageHash.toEthSignedMessageHash();
        address recoverdSigner = ethSignedMessagaHash.recover(signature);
        return recoverdSigner == dids[didId].owner;
    }

    function verifyDataSignature(string memory didId, bytes memory data, bytes memory signature
    ) external view returns (bool isValid) {
        require(dids[didId].isActive, "DID not active");
        
        bytes32 dataHash = keccak256(data);
        bytes32 ethSignedMessageHash = dataHash.toEthSignedMessageHash();

        address recoveredSigner = ethSignedMessageHash.recover(signature);
        return recoveredSigner == dids[didId].owner;
    }

    function getDID (string memory didId) external view returns (DID memory) {
    DID storage did = dids[didId];
    return (did);
    }

    function isTrustedIssuer(string memory didId) external view returns (bool isTrusted) {
    return trustedIssuers[didId] && dids[didId].isActive;
    }

    function getDIDByOwner(address owner) external view returns (string memory didId) {
        return ownerToDID[owner];
    }

    
}
