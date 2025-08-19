import React from 'react';
import { useContract } from '../../hooks/useContract';
import WalletConnection from '../WalletConnection/WalletConnection';
import AdminPanel from './AdminPanel';

const AdminPanelPage = ({ web3State }) => {
  const { web3, account, isConnected, isLoading, error: web3Error, connectWallet } = web3State;
  const { 
    contract, 
    error: contractError, 
    checkIsTrustedIssuer,
    checkIsAdmin,
    getAdminDID,
    addTrustedIssuer,
    removeTrustedIssuer,
    getAllDIDs,
    getDIDDocument
  } = useContract(web3);

  if (isLoading) {
    return (
      <div className="page-container">
        <h1>Admin Panel</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="page-container">
        <h1>Admin Panel</h1>
        <WalletConnection 
          isConnected={isConnected}
          account={account}
          error={web3Error}
          onConnect={connectWallet}
        />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="page-container">
        <h1>Admin Panel</h1>
        <p>Contract not available. Please ensure the contract is deployed and configured.</p>
        {contractError && <p className="error">Error: {contractError}</p>}
      </div>
    );
  }

  return (
    <div className="page-container">
      <AdminPanel
        web3={web3}
        account={account}
        contract={contract}
        checkIsAdmin={checkIsAdmin}
        getAdminDID={getAdminDID}
        addTrustedIssuer={addTrustedIssuer}
        removeTrustedIssuer={removeTrustedIssuer}
        checkIsTrustedIssuer={checkIsTrustedIssuer}
        getAllDIDs={getAllDIDs}
        getDIDDocument={getDIDDocument}
      />
    </div>
  );
};

export default AdminPanelPage;