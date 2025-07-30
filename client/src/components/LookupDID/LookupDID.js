import React, { useState } from 'react';
import { useWeb3 } from '../../hooks/useWeb3';
import { useContract } from '../../hooks/useContract';
import { validateDIDId } from '../../utils/validation';
import WalletConnection from '../WalletConnection/WalletConnection';
import ContractSetup from '../ContractSetup/ContractSetup';
import ResultDisplay from '../ResultDisplay/ResultDisplay';

const LookupDID = () => {
  const { web3, account, isConnected, error: web3Error, connectWallet } = useWeb3();
  const { contract, contractAddress, error: contractError, setContract } = useContract(web3);
  
  const [didId, setDidId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleLookupDID = async (e) => {
    e.preventDefault();
    
    const didError = validateDIDId(didId);
    if (didError) {
      setResult({ type: 'error', message: didError });
      return;
    }

    if (!contract) {
      setResult({ 
        type: 'error', 
        message: 'Please connect wallet and set contract first' 
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const didInfo = await contract.methods.getDIDDocument(didId).call();
      
      const resultText = `DID Document Information:
ID: ${didInfo.id}
Controller: ${didInfo.controller}
Public Key: ${didInfo.publicKey}
Created: ${new Date(didInfo.created * 1000).toLocaleString()}
Updated: ${new Date(didInfo.updated * 1000).toLocaleString()}
Active: ${didInfo.isActive}`;
      
      setResult({ type: 'success', message: resultText });
    } catch (error) {
      setResult({ 
        type: 'error', 
        message: 'Error looking up DID: ' + error.message 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-container">
      <h1 className="page-title">Lookup DID</h1>
      
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
      
      <div className="card">
        <h3>Lookup DID Information</h3>
        <form onSubmit={handleLookupDID}>
          <div className="form-group">
            <label htmlFor="didId">Username (DID ID):</label>
            <input
              type="text"
              id="didId"
              value={didId}
              onChange={(e) => setDidId(e.target.value)}
              placeholder="Enter Username (DID ID) to lookup"
              disabled={!contract || isLoading}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={!contract || isLoading}
          >
            {isLoading ? 'Looking up DID...' : 'Get DID Info'}
          </button>
        </form>
        
        {result && <ResultDisplay type={result.type} message={result.message} />}
      </div>
    </div>
  );
};

export default LookupDID;