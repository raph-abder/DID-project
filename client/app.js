// Global variables
let web3;
let contract;
let currentAccount;

// Wallet connection functions
async function connectWallet() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            web3 = new Web3(window.ethereum);
            const accounts = await web3.eth.getAccounts();
            currentAccount = accounts[0];
            
            updateConnectionStatus(true);
            
            // Set up account change listener
            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', handleChainChanged);
            
        } catch (error) {
            showResult('connectionStatus', 'Error connecting to MetaMask: ' + error.message, 'error');
        }
    } else {
        showResult('connectionStatus', 'MetaMask is not installed. Please install MetaMask to use this dApp.', 'error');
    }
}

function handleAccountsChanged(accounts) {
    if (accounts.length > 0) {
        currentAccount = accounts[0];
        document.getElementById('currentAccount').textContent = currentAccount;
    } else {
        disconnectWallet();
    }
}

function handleChainChanged(chainId) {
    // Reload the page when chain changes
    window.location.reload();
}

function disconnectWallet() {
    web3 = null;
    currentAccount = null;
    contract = null;
    updateConnectionStatus(false);
}

function updateConnectionStatus(isConnected) {
    const statusElement = document.getElementById('connectionStatus');
    const connectBtn = document.getElementById('connectBtn');
    const accountInfo = document.getElementById('accountInfo');
    
    if (isConnected) {
        statusElement.textContent = 'Connected to MetaMask';
        statusElement.className = 'status connected';
        document.getElementById('currentAccount').textContent = currentAccount;
        accountInfo.style.display = 'block';
        connectBtn.textContent = 'Connected';
        connectBtn.disabled = true;
    } else {
        statusElement.textContent = 'Not connected to MetaMask';
        statusElement.className = 'status disconnected';
        accountInfo.style.display = 'none';
        connectBtn.textContent = 'Connect MetaMask';
        connectBtn.disabled = false;
    }
}

// Contract functions
function setContract() {
    const address = document.getElementById('contractAddress').value;
    if (!address) {
        showResult('contractResult', 'Please enter a contract address', 'error');
        return;
    }
    
    if (!web3) {
        showResult('contractResult', 'Please connect to MetaMask first', 'error');
        return;
    }
    
    try {
        contract = new web3.eth.Contract(contractABI, address);
        showResult('contractResult', 'Contract set successfully at address: ' + address, 'success');
    } catch (error) {
        showResult('contractResult', 'Error setting contract: ' + error.message, 'error');
    }
}

// DID functions
async function createDID() {
    if (!checkPrerequisites()) return;
    
    const didAddress = document.getElementById('didAddress').value;
    if (!didAddress) {
        showResult('createResult', 'Please enter a DID address', 'error');
        return;
    }
    
    if (!web3.utils.isAddress(didAddress)) {
        showResult('createResult', 'Please enter a valid Ethereum address', 'error');
        return;
    }
    
    try {
        const tx = await contract.methods.createDID(didAddress).send({ from: currentAccount });
        showResult('createResult', 'DID created successfully!\nTransaction hash: ' + tx.transactionHash, 'success');
    } catch (error) {
        showResult('createResult', 'Error creating DID: ' + error.message, 'error');
    }
}

// Credential functions
async function addCredential() {
    if (!checkPrerequisites()) return;
    
    const credId = document.getElementById('credentialId').value;
    const uri = document.getElementById('credentialUri').value;
    const validUntil = document.getElementById('validUntil').value || '0';
    
    if (!credId || !uri) {
        showResult('addResult', 'Please enter credential ID and URI', 'error');
        return;
    }
    
    try {
        const credIdBytes32 = web3.utils.keccak256(credId);
        const tx = await contract.methods.addCredential(credIdBytes32, uri, validUntil).send({ from: currentAccount });
        showResult('addResult', 'Credential added successfully!\nTransaction hash: ' + tx.transactionHash + '\nCredential ID (bytes32): ' + credIdBytes32, 'success');
    } catch (error) {
        showResult('addResult', 'Error adding credential: ' + error.message, 'error');
    }
}

async function verifyCredential() {
    if (!checkPrerequisites()) return;
    
    const didAddress = document.getElementById('verifyDidAddress').value;
    const credId = document.getElementById('verifyCredentialId').value;
    
    if (!didAddress || !credId) {
        showResult('verifyResult', 'Please enter DID address and credential ID', 'error');
        return;
    }
    
    if (!web3.utils.isAddress(didAddress)) {
        showResult('verifyResult', 'Please enter a valid Ethereum address for DID', 'error');
        return;
    }
    
    try {
        const credIdBytes32 = web3.utils.keccak256(credId);
        const result = await contract.methods.verifyCredential(didAddress, credIdBytes32).call();
        
        const isValid = result.isValid;
        const uri = result.uri;
        const validUntil = result.validUntil;
        
        let resultText = `Credential verification result:
Valid: ${isValid}
URI: ${uri}
Valid Until: ${validUntil === '0' ? 'Forever' : new Date(validUntil * 1000).toLocaleString()}
Credential ID (bytes32): ${credIdBytes32}`;
        
        showResult('verifyResult', resultText, isValid ? 'success' : 'error');
    } catch (error) {
        showResult('verifyResult', 'Error verifying credential: ' + error.message, 'error');
    }
}

async function revokeCredential() {
    if (!checkPrerequisites()) return;
    
    const credId = document.getElementById('revokeCredentialId').value;
    
    if (!credId) {
        showResult('revokeResult', 'Please enter credential ID', 'error');
        return;
    }
    
    try {
        const credIdBytes32 = web3.utils.keccak256(credId);
        const tx = await contract.methods.revokeCredential(credIdBytes32).send({ from: currentAccount });
        showResult('revokeResult', 'Credential revoked successfully!\nTransaction hash: ' + tx.transactionHash + '\nCredential ID (bytes32): ' + credIdBytes32, 'success');
    } catch (error) {
        showResult('revokeResult', 'Error revoking credential: ' + error.message, 'error');
    }
}

// Utility functions
function generateHash() {
    const input = document.getElementById('stringToHash').value;
    if (!input) {
        showResult('hashResult', 'Please enter a string to hash', 'error');
        return;
    }
    
    if (!web3) {
        showResult('hashResult', 'Please connect to MetaMask first', 'error');
        return;
    }
    
    try {
        const hash = web3.utils.keccak256(input);
        showResult('hashResult', 'Hash (bytes32): ' + hash, 'success');
    } catch (error) {
        showResult('hashResult', 'Error generating hash: ' + error.message, 'error');
    }
}

function checkPrerequisites() {
    if (!web3) {
        alert('Please connect to MetaMask first');
        return false;
    }
    if (!contract) {
        alert('Please set the contract address first');
        return false;
    }
    return true;
}

function showResult(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = 'result ' + type;
    element.style.display = 'block';
}

// Initialize the application
window.addEventListener('load', async () => {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                await connectWallet();
            }
        } catch (error) {
            console.error('Error checking existing connection:', error);
        }
    }
});