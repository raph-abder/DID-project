import React, { useState } from 'react';
import ResultDisplay from '../ResultDisplay/ResultDisplay';
import './ContractSetup.css';

const ContractSetup = ({ contractAddress, error, onSetContract, disabled }) => {
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSetContract = async () => {
    if (!address.trim()) {
      setResult({ type: 'error', message: 'Please enter a contract address' });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const contract = await onSetContract(address);
      if (contract) {
        setResult({ 
          type: 'success', 
          message: `Contract set successfully at address: ${address}` 
        });
      }
    } catch (err) {
      setResult({ type: 'error', message: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="contract-setup card">
      <h3>Contract Configuration</h3>
      
      {contractAddress ? (
        <div className="current-contract">
          <strong>Connected Contract Address:</strong>
          <span className="contract-address">{contractAddress}</span>
          <div className="contract-status">Automatically connected</div>
        </div>
      ) : (
        <>
          <div className="form-group">
            <label htmlFor="contractAddress">Contract Address:</label>
            <input
              type="text"
              id="contractAddress"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter deployed contract address"
              disabled={disabled}
            />
          </div>
          <button 
            onClick={handleSetContract} 
            disabled={disabled || isLoading}
            className="set-contract-button"
          >
            {isLoading ? 'Setting Contract...' : 'Set Contract'}
          </button>
        </>
      )}
      
      {error && <ResultDisplay type="error" message={error} />}
      {result && <ResultDisplay message={result.message} />}
    </div>
  );
};

export default ContractSetup;