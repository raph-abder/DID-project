import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContract } from '../../hooks/useContract';
import WalletConnection from '../WalletConnection/WalletConnection';
import ContractSetup from '../ContractSetup/ContractSetup';
import './Home.css';

const Home = ({ web3State }) => {
  const navigate = useNavigate();
  const { web3, account, isConnected, isLoading, error: web3Error, connectWallet } = web3State;
  const { contractAddress, error: contractError, setContract } = useContract(web3);

  useEffect(() => {
    if (!isLoading && isConnected && account) {
      navigate('/manage');
    }
  }, [isLoading, isConnected, account, navigate]);

  return (
    <div className="page-container">
      <h1 className="page-title">DID Registry</h1>
      <p className="home-description">
      Decentralized Identity (DID) Registry is an application that allows you to create, 
        manage, and verify decentralized identities on the blockchain.
      </p>
      
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

    </div>
  );
};

export default Home;