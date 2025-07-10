
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract MyAccount is AccessControl {
	bytes32 public constant DID_ADMIN_ROLE = keccak256("DID_ADMIN_ROLE"); // Hashes the "DID_ADMIN_ROLE" to make a unique identifier of the role 

	constructor() {
		_grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
	}

	struct Credential {
		string uri;
		uint256 validUntil;
		bool revoked;
	}

	mapping(address => mapping(bytes32 => Credential)) private _creds;

	mapping(address => bool) public didExists;

	event DIDCreated(address indexed did);
	event CredentialAdded(
		address indexed did,
		bytes32 indexed credId,
		string uri,
		uint256 validUntil
	);
	event CredentialRevoked(address indexed did, bytes32 indexed credId);
	event CredentialRequested(
		address indexed requester,
		address indexed did,
		bytes32 indexed credId
	);
	event CredentialSent(
		address indexed did,
		address indexed to,
		bytes32 indexed credId
	);

	function createDID(address did) external {
		require(!didExists[did], "DID already exists");
		didExists[did] = true;

		_grantRole(DID_ADMIN_ROLE, did);
		emit DIDCreated(did);
	}

	function addCredential(
		bytes32 credId,
		string calldata uri,
		uint256 validUntil
	) external onlyRole(DID_ADMIN_ROLE) {
		require(!_creds[msg.sender][credId].revoked, "Already exists and revoked");
		_creds[msg.sender][credId] = Credential(uri, validUntil, false);
		emit CredentialAdded(msg.sender, credId, uri, validUntil);
	}

	function revokeCredential(bytes32 credId) 
		external onlyRole(DID_ADMIN_ROLE) {
			Credential storage c = _creds[msg.sender][credId];
			require(!c.revoked, "Not issued / already revoked");
			c.revoked = true;

			emit CredentialRevoked(msg.sender, credId);
		}


	function requestCredential(address did, bytes32 credId) external {
		emit CredentialRequested(msg.sender, did, credId);
	}

	function giveCredential(
		address to,
		bytes32 credId,
		string calldata disclosureUri
	) external onlyRole(DID_ADMIN_ROLE) {
		emit CredentialSent(msg.sender, to, credId);
	}

	function verifyCredential(
		address did,
		bytes32 credId
	) external view returns (
		bool isValid,
		string memory uri,
		uint256 validUntil
	) {
		Credential memory c = _creds[did][credId];
		isValid = !c.revoked && (c.validUntil == 0 || c.validUntil >= block.timestamp);
		return (isValid, c.uri, c.validUntil);
	}
}
