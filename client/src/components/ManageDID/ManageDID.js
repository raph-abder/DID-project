import React, { useState } from 'react';
import { useWeb3 } from '../../hooks/useWeb3';
import { useContract } from '../../hooks/useContract';
import { validateDIDId, validateEthereumAddress } from '../../utils/validation';
import WalletConnection from '../WalletConnection/WalletConnection';
import ContractSetup from '../ContractSetup/ContractSetup';
import ResultDisplay from '../ResultDisplay/ResultDisplay';

const ManageDID = () => {
  const { web3, account, isConnected, error: web3Error, connectWallet } = useWeb3();
  const { contract, contractAddress, error: contractError, setContract } = useContract(web3);
  
  const [deactivateDidId, setDeactivateDidId] = useState('');
  const [ownerAddress, setOwnerAddress] = useState('');
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [deactivateResult, setDeactivateResult] = useState(null);
  const [lookupResult, setLookupResult] = useState(null);

  const handleDeactivateDID = async (e) => {
    e.preventDefault();
    
    const didError = validateDIDId(deactivateDidId);
    if (didError) {
      setDeactivateResult({ type: 'error', message: didError });
      return;
    }

    if (!contract || !account) {
      setDeactivateResult({ 
        type: 'error', 
        message: 'Please connect wallet and set contract first' 
      });
      return;
    }

    setIsDeactivating(true);
    setDeactivateResult(null);

    try {
      const tx = await contract.methods
        .deactivateDID(deactivateDidId)
        .send({ from: account });
        
      setDeactivateResult({
        type: 'success',
        message: `DID deactivated successfully!\nTransaction hash: ${tx.transactionHash}`
      });
      
      setDeactivateDidId('');
    } catch (error) {
      setDeactivateResult({ 
        type: 'error', 
        message: 'Error deactivating DID: ' + error.message 
      });
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleFindDIDByOwner = async (e) => {
    e.preventDefault();
    
    const addressError = validateEthereumAddress(ownerAddress);
    if (addressError) {
      setLookupResult({ type: 'error', message: addressError });
      return;
    }

    if (!contract) {
      setLookupResult({ 
        type: 'error', 
        message: 'Please connect wallet and set contract first' 
      });
      return;
    }

    setIsLookingUp(true);
    setLookupResult(null);

    try {
      const didId = await contract.methods.getDIDByOwner(ownerAddress).call();
      
      if (didId) {
        setLookupResult({
          type: 'success',
          message: `DID ID for owner ${ownerAddress}: ${didId}`
        });
      } else {
        setLookupResult({
          type: 'error',
          message: `No DID found for owner ${ownerAddress}`
        });
      }
    } catch (error) {
      setLookupResult({ 
        type: 'error', 
        message: 'Error looking up DID: ' + error.message 
      });
    } finally {
      setIsLookingUp(false);
    }
  };

  return (
    <div className="page-container">
      <h1 className="page-title">Manage DID</h1>
      
      <WalletConnection 
        isConnected={isConnected}
        account={account}
        error={web3Error}
        onConnect={connectWallet}
      />
      
      <ContractSetup 
        contractAddress={contractAddress}
        error={contractError}
        onSetContract={setContract}
        disabled={!isConnected}
      />
      
      <div className="grid">
        <div className="card">
          <h3>Deactivate DID</h3>
          <form onSubmit={handleDeactivateDID}>
            <div className="form-group">
              <label htmlFor="deactivateDidId">DID ID:</label>
              <input
                type="text"
                id="deactivateDidId"
                value={deactivateDidId}
                onChange={(e) => setDeactivateDidId(e.target.value)}
                placeholder="Enter DID ID to deactivate"
                disabled={!contract || isDeactivating}
              />
            </div>
            
            <button 
              type="submit" 
              disabled={!contract || isDeactivating}
            >
              {isDeactivating ? 'Deactivating...' : 'Deactivate DID'}
            </button>
          </form>
          
          {deactivateResult && (
            <ResultDisplay type={deactivateResult.type} message={deactivateResult.message} />
          )}
        </div>

        <div className="card">
          <h3>Find DID by Owner</h3>
          <form onSubmit={handleFindDIDByOwner}>
            <div className="form-group">
              <label htmlFor="ownerAddress">Owner Address:</label>
              <input
                type="text"
                id="ownerAddress"
                value={ownerAddress}
                onChange={(e) => setOwnerAddress(e.target.value)}
                placeholder="0x..."
                disabled={!contract || isLookingUp}
              />
            </div>
            
            <button 
              type="submit" 
              disabled={!contract || isLookingUp}
            >
              {isLookingUp ? 'Searching...' : 'Find DID'}
            </button>
          </form>
          
          {lookupResult && (
            <ResultDisplay type={lookupResult.type} message={lookupResult.message} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageDID;