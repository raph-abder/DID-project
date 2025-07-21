import React from 'react';
import { useWeb3 } from '../../hooks/useWeb3';
import { useContract } from '../../hooks/useContract';
import WalletConnection from '../WalletConnection/WalletConnection';
import ContractSetup from '../ContractSetup/ContractSetup';
import './Home.css';

const Home = () => {
  const { web3, account, isConnected, error: web3Error, connectWallet } = useWeb3();
  const { contractAddress, error: contractError, setContract } = useContract(web3);

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