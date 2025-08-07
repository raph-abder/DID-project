import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useContract } from '../../hooks/useContract';
import { useDIDData } from '../../hooks/useDIDData';
import WalletConnection from '../WalletConnection/WalletConnection';
import ContractSetup from '../ContractSetup/ContractSetup';
import ResultDisplay from '../ResultDisplay/ResultDisplay';
import IssuerCapabilityCheck from './IssuerCapabilityCheck';
import DIDSelector from './DIDSelector';
import VCForm from './VCForm';
import { createVerifiableCredential } from '../../utils/vcCreator';
import './IssueVC.css';

const IssueVC = ({ web3State }) => {
  const { web3, account, isConnected, isLoading: web3Loading, error: web3Error, connectWallet } = web3State;
  const { 
    contract, 
    contractAddress, 
    error: contractError, 
    setContract,
    checkIsTrustedIssuer,
    getAllDIDs,
    getDIDDocument
  } = useContract(web3);

  const { userDIDs, allDIDs, canIssue, loading, loadUserDIDs, loadAllDIDs } = useDIDData(
    contract, account, getDIDDocument, checkIsTrustedIssuer, getAllDIDs
  );

  const [selectedIssuerDID, setSelectedIssuerDID] = useState('');
  const [selectedRecipientDID, setSelectedRecipientDID] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState(null);
  
  const [vcData, setVcData] = useState({
    type: 'EducationCredential',
    subject: '',
    achievement: '',
    issueDate: new Date().toISOString().split('T')[0],
    description: ''
  });

  useEffect(() => {
    if (contract && account) {
      loadUserDIDs();
      loadAllDIDs();
    }
  }, [contract, account, loadUserDIDs, loadAllDIDs]);

  useEffect(() => {
    if (userDIDs.length > 0 && !selectedIssuerDID) {
      const firstIssuerDID = userDIDs.find(did => did.canIssue);
      if (firstIssuerDID) {
        setSelectedIssuerDID(firstIssuerDID.id);
      }
    }
  }, [userDIDs, selectedIssuerDID]);

  const handleVcDataChange = (field, value) => {
    setVcData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateVC = async () => {
    try {
      setIsCreating(true);
      setResult(null);

      const vcResult = await createVerifiableCredential({
        web3,
        account,
        selectedIssuerDID,
        selectedRecipientDID,
        vcData,
        getDIDDocument
      });

      setResult({
        type: 'success',
        message: `Verifiable Credential issued successfully!\n\nRecipient: ${vcResult.recipient}\nIPFS Hash: ${vcResult.ipfsHash}\nIPFS URL: ${vcResult.ipfsUrl}\nStored at: ${vcResult.timestamp}\n${vcResult.isSimulated ? '\nUsing local simulation (IPFS keys not configured)' : '\nSuccessfully stored on IPFS network'}\n\nThe recipient can now view their encrypted VC by clicking on their DID in the Manage DIDs page.`
      });

      setVcData({
        type: 'EducationCredential',
        subject: '',
        achievement: '',
        issueDate: new Date().toISOString().split('T')[0],
        description: ''
      });
      setSelectedRecipientDID('');

    } catch (error) {
      setResult({
        type: 'error',
        message: `Error creating Verifiable Credential: ${error.message}`
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (web3Loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">Issue Verifiable Credential</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isConnected) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="page-container">
      <h1 className="page-title">Issue Verifiable Credential</h1>

      {contract && account && (
        <>
          <IssuerCapabilityCheck userDIDs={userDIDs} canIssue={canIssue} />
          
          {canIssue && (
            <div className="card">
              <h3>Create Verifiable Credential</h3>
              
              <div className="vc-form">
                <DIDSelector
                  userDIDs={userDIDs}
                  allDIDs={allDIDs}
                  selectedIssuerDID={selectedIssuerDID}
                  selectedRecipientDID={selectedRecipientDID}
                  onIssuerChange={setSelectedIssuerDID}
                  onRecipientChange={setSelectedRecipientDID}
                  loading={loading || isCreating}
                />

                <VCForm
                  vcData={vcData}
                  onDataChange={handleVcDataChange}
                  loading={loading || isCreating}
                />

                <button 
                  onClick={handleCreateVC}
                  disabled={isCreating || !selectedIssuerDID || !selectedRecipientDID || !vcData.subject}
                  className="issue-btn"
                >
                  {isCreating ? 'Creating VC...' : 'Issue Verifiable Credential'}
                </button>
              </div>
            </div>
          )}

          {result && (
            <ResultDisplay type={result.type} message={result.message} />
          )}
        </>
      )}
    </div>
  );
};

export default IssueVC;