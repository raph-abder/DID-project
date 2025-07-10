// Contract ABI for MyAccount.sol
const contractABI = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "did",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "credId",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "uri",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "validUntil",
                "type": "uint256"
            }
        ],
        "name": "CredentialAdded",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "requester",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "did",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "credId",
                "type": "bytes32"
            }
        ],
        "name": "CredentialRequested",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "did",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "credId",
                "type": "bytes32"
            }
        ],
        "name": "CredentialRevoked",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "did",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "to",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "credId",
                "type": "bytes32"
            }
        ],
        "name": "CredentialSent",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "did",
                "type": "address"
            }
        ],
        "name": "DIDCreated",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "credId",
                "type": "bytes32"
            },
            {
                "internalType": "string",
                "name": "uri",
                "type": "string"
            },
            {
                "internalType": "uint256",
                "name": "validUntil",
                "type": "uint256"
            }
        ],
        "name": "addCredential",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "did",
                "type": "address"
            }
        ],
        "name": "createDID",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "didExists",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "to",
                "type": "address"
            },
            {
                "internalType": "bytes32",
                "name": "credId",
                "type": "bytes32"
            }
        ],
        "name": "giveCredential",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "did",
                "type": "address"
            },
            {
                "internalType": "bytes32",
                "name": "credId",
                "type": "bytes32"
            }
        ],
        "name": "requestCredential",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "credId",
                "type": "bytes32"
            }
        ],
        "name": "revokeCredential",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "did",
                "type": "address"
            },
            {
                "internalType": "bytes32",
                "name": "credId",
                "type": "bytes32"
            }
        ],
        "name": "verifyCredential",
        "outputs": [
            {
                "internalType": "bool",
                "name": "isValid",
                "type": "bool"
            },
            {
                "internalType": "string",
                "name": "uri",
                "type": "string"
            },
            {
                "internalType": "uint256",
                "name": "validUntil",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];