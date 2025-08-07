import React, { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useContract } from '../../hooks/useContract';
import { validateDIDId } from '../../utils/validation';
import { ipfsService } from '../../utils/ipfsService';
import WalletConnection from '../WalletConnection/WalletConnection';
import ContractSetup from '../ContractSetup/ContractSetup';
import ResultDisplay from '../ResultDisplay/ResultDisplay';
import VCListModal from '../VCList/VCListModal';
import './ManageDID.css';

const ManageDID = ({ web3State }) => {
  const { web3, account, isConnected, isLoading: web3Loading, error: web3Error, connectWallet } = web3State;
  const { 
    contract, 
    contractAddress, 
    error: contractError, 
    setContract,
    checkIsTrustedIssuer,
    checkIsAdmin,
  } = useContract(web3);
  
  const [dids, setDids] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [didToDeactivate, setDidToDeactivate] = useState(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  
  const [showVCModal, setShowVCModal] = useState(false);
  const [selectedDIDForVCs, setSelectedDIDForVCs] = useState(null);
  const [vcCounts, setVcCounts] = useState({});
  
  const [didId, setDidId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createResult, setCreateResult] = useState(null);

  const loadUserDIDs = useCallback(async () => {
    if (!contract || !account) return;

    setIsLoading(true);
    setError(null);

    try {
      const didIds = await contract.methods.getDIDsByController(account).call();
      
      if (didIds && didIds.length > 0) {
        const didDetails = await Promise.all(
          didIds.map(async (didId) => {
            try {
              const didData = await contract.methods.getDIDDocument(didId).call();
              const isTrusted = await checkIsTrustedIssuer(didId);
              const isAdmin = await checkIsAdmin(didId);
              
              return {
                id: didId,
                controller: didData.controller,
                publicKey: didData.publicKey,
                isActive: didData.isActive,
                isTrustedIssuer: isTrusted,
                isAdmin: isAdmin,
                createdAt: new Date(parseInt(didData.created) * 1000).toLocaleDateString(),
                updatedAt: new Date(parseInt(didData.updated) * 1000).toLocaleDateString()
              };
            } catch (error) {
              console.error(`Error loading DID ${didId}:`, error);
              return {
                id: didId,
                controller: account,
                publicKey: 'Error loading',
                isActive: false,
                isTrustedIssuer: false,
                isAdmin: false,
                createdAt: 'Unknown',
                updatedAt: 'Unknown'
              };
            }
          })
        );
        
        const sortedDids = didDetails.sort((a, b) => {
          if (a.isActive && !b.isActive) return -1;
          if (!a.isActive && b.isActive) return 1;
          return 0;
        });
        
        setDids(sortedDids);
        
        const counts = {};
        await Promise.all(
          sortedDids.map(async (did) => {
            try {
              const vcRefs = ipfsService.getVCReferences(did.id);
              counts[did.id] = vcRefs.length;
            } catch (error) {
              console.error(`Error loading VC count for ${did.id}:`, error);
              counts[did.id] = 0;
            }
          })
        );
        setVcCounts(counts);
      } else {
        setDids([]);
        setVcCounts({});
      }
    } catch (error) {
      setError('Error loading DIDs: ' + error.message);
      console.error('Error loading DIDs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [contract, account, checkIsTrustedIssuer, checkIsAdmin]);

  useEffect(() => {
    if (contract && account) {
      loadUserDIDs();
    }
  }, [contract, account, loadUserDIDs]);

  if (web3Loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">Manage your DID</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isConnected) {
    return <Navigate to="/" replace />;
  }

  const handleDeactivateClick = (did) => {
    setDidToDeactivate(did);
    setShowDeactivateModal(true);
  };

  const handleDeactivateConfirm = async () => {
    if (!didToDeactivate || !contract || !account) return;

    setIsDeactivating(true);

    try {
      await contract.methods
        .deactivateDID(didToDeactivate.id)
        .send({ from: account });
        
      await loadUserDIDs();
      setShowDeactivateModal(false);
      setDidToDeactivate(null);
    } catch (error) {
      setError('Error deactivating DID: ' + error.message);
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleDeactivateCancel = () => {
    setShowDeactivateModal(false);
    setDidToDeactivate(null);
  };

  const handleViewVCs = (did) => {
    setSelectedDIDForVCs(did);
    setShowVCModal(true);
  };

  const handleCloseVCModal = () => {
    setShowVCModal(false);
    setSelectedDIDForVCs(null);
  };

  const handleCreateDID = async (e) => {
    e.preventDefault();

    const didError = validateDIDId(didId);
    if (didError) {
      setCreateResult({
        type: 'error',
        message: didError,
      });
      return;
    }

    if (!contract || !account) {
      setCreateResult({
        type: 'error',
        message: 'Please connect wallet and set contract first',
      });
      return;
    }

    setIsCreating(true);
    setCreateResult(null);

    try {
      const { VCEncryption } = await import('../../utils/vcEncryption');
      
      const keyPair = await VCEncryption.generateKeyPair();
      const publicKeyPem = await VCEncryption.exportPublicKey(keyPair.publicKey);
      const privateKeyPem = await VCEncryption.exportPrivateKey(keyPair.privateKey);
      
      const tx = await contract.methods
        .createDID(didId, publicKeyPem)
        .send({ from: account });
      
      try {
        const existingKeys = JSON.parse(localStorage.getItem('didPrivateKeys') || '{}');
        existingKeys[didId] = {
          privateKey: privateKeyPem,
          timestamp: Date.now()
        };
        localStorage.setItem('didPrivateKeys', JSON.stringify(existingKeys));
      } catch (error) {
        console.error('Error storing private key locally:', error);
      }

      setCreateResult({
        type: 'success',
        message: `DID created successfully!\nTransaction hash: ${tx.transactionHash}\nDID ID: ${didId}`,
      });

      setDidId('');
      await loadUserDIDs();
    } catch (err) {
      console.error('Full RPC error creating DID:', err);

      let reason = 'Unknown error';
      
      if (err?.data?.message) {
        reason = err.data.message;
      } else if (err?.message) {
        reason = err.message;
      } else if (err?.reason) {
        reason = err.reason;
      } else if (err?.error?.message) {
        reason = err.error.message;
      }

      reason = reason
        .replace(/^.*VM Exception while processing transaction: revert\s*/, '')
        .replace(/^execution reverted:\s*/, '')
        .replace(/^.*revert\s*/, '');
      
      setCreateResult({
        type: 'error',
        message: `Error creating DID: ${reason}. Please check that you have enough gas and that the DID ID is unique.`,
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="page-container">
      <h1 className="page-title">Manage your DID</h1>
      
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
      
      {error && <ResultDisplay type="error" message={error} />}
      
      {contract && account && (
        <div className="card">
          <h3>Create New DID</h3>
          <form onSubmit={handleCreateDID} className="create-did-form">
            <div className="form-group">
              <label htmlFor="didId">DID ID (Username):</label>
              <input
                type="text"
                id="didId"
                value={didId}
                onChange={(e) => setDidId(e.target.value)}
                placeholder="Enter unique DID identifier (e.g., did:example:username)"
                disabled={!contract || isCreating}
              />
            </div>
            <button type="submit" disabled={!contract || isCreating} className="create-btn">
              {isCreating ? 'Creating DID...' : 'Create DID'}
            </button>
          </form>
          
          {createResult && (
            <ResultDisplay type={createResult.type} message={createResult.message} />
          )}
        </div>
      )}

      {contract && account && (
        <div className="card">
          <div className="did-table-header">
            <h3>Your DIDs</h3>
            <button 
              onClick={loadUserDIDs} 
              disabled={isLoading}
              className="refresh-btn"
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          
          {isLoading ? (
            <p className="loading-text">Loading your DIDs...</p>
          ) : dids.length === 0 ? (
            <p className="no-dids-text">No DIDs found for your wallet address. Create your first DID using the Create DID page.</p>
          ) : (
            <div className="table-container">
              <table className="did-table">
                <thead>
                  <tr>
                    <th>DID ID</th>
                    <th>Status</th>
                    <th>Role</th>
                    <th>VCs</th>
                    <th>Created</th>
                    <th>Public Key</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dids.map((did) => {
                    const canDeactivate = did.isActive && !did.isTrustedIssuer && !did.isAdmin;
                    
                    const vcCount = vcCounts[did.id] || 0;
                    
                    return (
                      <tr key={did.id}>
                        <td className="did-id">
                          <button 
                            className="did-link"
                            onClick={() => handleViewVCs(did)}
                            title="Click to view Verifiable Credentials"
                          >
                            {did.id}
                          </button>
                        </td>
                        <td>
                          <span className={`status-badge ${did.isActive ? 'active' : 'inactive'}`}>
                            {did.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td>
                          <div className="role-badges">
                            {did.isAdmin && <span className="role-badge admin">ADMIN</span>}
                            {did.isTrustedIssuer && <span className="role-badge trusted">TRUSTED ISSUER</span>}
                            {!did.isAdmin && !did.isTrustedIssuer && <span className="role-badge regular">REGULAR</span>}
                          </div>
                        </td>
                        <td className="vc-count">
                          <span className={`vc-badge ${vcCount > 0 ? 'has-vcs' : 'no-vcs'}`}>
                            {vcCount} VC{vcCount !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td>{did.createdAt}</td>
                        <td className="public-key-cell">{did.publicKey}</td>
                        <td>
                          {did.isActive ? (
                            canDeactivate ? (
                              <button 
                                onClick={() => handleDeactivateClick(did)}
                                className="deactivate-btn"
                              >
                                Deactivate
                              </button>
                            ) : (
                              <button 
                                className="deactivate-btn disabled"
                                disabled
                                title={did.isAdmin ? "Admin DID cannot be deactivated" : "Trusted issuer DID cannot be deactivated"}
                              >
                                Protected
                              </button>
                            )
                          ) : (
                            <span className="cannot-reactivate">Cannot reactivate</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showDeactivateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Deactivate DID</h3>
            <p>Are you sure you want to deactivate DID: <strong>{didToDeactivate?.id}</strong>?</p>
            <p className="warning-text">
              Warning: Once a DID is deactivated, it cannot be reactivated. This action is permanent and irreversible.
            </p>
            
            <div className="modal-actions">
              <button 
                onClick={handleDeactivateCancel}
                disabled={isDeactivating}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeactivateConfirm}
                disabled={isDeactivating}
                className="confirm-btn"
              >
                {isDeactivating ? 'Deactivating...' : 'Yes, Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showVCModal && selectedDIDForVCs && (
        <VCListModal
          isOpen={showVCModal}
          onClose={handleCloseVCModal}
          didId={selectedDIDForVCs.id}
          web3={web3}
        />
      )}
    </div>
  );
};

export default ManageDID;