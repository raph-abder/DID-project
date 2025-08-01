import React from 'react';
import './WalletConnection.css';

const WalletConnection = ({ isConnected, account, error, onConnect }) => {
  return (
    <div className="wallet-connection card">
      <h3>Wallet Connection</h3>
      <div className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
        {isConnected ? 'Connected to MetaMask' : 'Not connected to MetaMask'}
      </div>
      
      {error && (
        <div className="result error">
          {error}
        </div>
      )}
      
      <button 
        onClick={onConnect} 
        disabled={isConnected}
        className="connect-button"
      >
        {isConnected ? 'Connected' : 'Connect MetaMask'}
      </button>
      
      {isConnected && (
        <div>
          <strong>To disconnect account use the MetaMask extension</strong>
        </div>
      )}
      
      {isConnected && account && (
        <div className="account-info">
          <strong>Connected Account:</strong>
          <span className="account-address">{account}</span>
        </div>
      )}
    </div>
  );
};

export default WalletConnection;