import React, { useState, useEffect, useCallback } from 'react';
import { ipfsService } from '../../utils/ipfsService';
import { VCEncryption } from '../../utils/vcEncryption';
import './VCListModal.css';

const VCListModal = ({ isOpen, onClose, didId, web3 }) => {
  const [vcs, setVCs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVC, setSelectedVC] = useState(null);
  const [decryptedVCs, setDecryptedVCs] = useState({});
  const [error, setError] = useState(null);

  const loadVCs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const vcData = await ipfsService.getVCsForDID(didId);
      setVCs(vcData);
      
      if (vcData.length === 0) {
        setError('No Verifiable Credentials found for this DID.');
      }
    } catch (error) {
      console.error('Error loading VCs:', error);
      setError('Failed to load Verifiable Credentials: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [didId]);

  useEffect(() => {
    if (isOpen && didId) {
      loadVCs();
    }
  }, [isOpen, didId, loadVCs]);

  const decryptVC = async (vc) => {
    try {
      setLoading(true);
      
      if (decryptedVCs[vc.reference.ipfsHash]) {
        setSelectedVC(decryptedVCs[vc.reference.ipfsHash]);
        return;
      }
      
      let decrypted;
      if (vc.encryptedVC) {
        decrypted = await VCEncryption.decryptVCForDID(vc.encryptedVC, didId);
      } else {
        decrypted = vc;
      }
      
      setDecryptedVCs(prev => ({
        ...prev,
        [vc.reference.ipfsHash]: decrypted
      }));
      
      setSelectedVC(decrypted);
    } catch (error) {
      console.error('Error decrypting VC:', error);
      setError('Failed to decrypt VC: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const getVCTypeColor = (type) => {
    const colors = {
      'EducationCredential': '#28a745',
      'EmploymentCredential': '#007bff',
      'SkillCredential': '#17a2b8',
      'IdentityCredential': '#ffc107'
    };
    return colors[type] || '#6c757d';
  };

  if (!isOpen) return null;

  return (
    <div className="vc-modal-overlay">
      <div className="vc-modal">
        <div className="vc-modal-header">
          <h3>Verifiable Credentials</h3>
          <p className="did-info">DID: <code>{didId}</code></p>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="vc-modal-content">
          {loading && <div className="loading">Loading VCs...</div>}
          
          {error && (
            <div className="error-message">
              <p>{error}</p>
              <button onClick={loadVCs} className="retry-btn">Retry</button>
            </div>
          )}

          {!loading && !error && vcs.length > 0 && (
            <div className="vc-container">
              <div className="vc-list">
                <h4>Your Credentials ({vcs.length})</h4>
                {vcs.map((vc, index) => (
                  <div key={vc.reference.ipfsHash} className="vc-card">
                    <div className="vc-card-header">
                      <span 
                        className="vc-type"
                        style={{ backgroundColor: getVCTypeColor(vc.reference.vcType) }}
                      >
                        {vc.reference.vcType.replace('Credential', '')}
                      </span>
                      <span className="vc-date">
                        {formatDate(vc.reference.timestamp)}
                      </span>
                    </div>
                    
                    <div className="vc-card-body">
                      <p className="vc-subject">
                        <strong>Subject:</strong> {vc.metadata?.subject || 'Unknown'}
                      </p>
                      <p className="vc-issuer">
                        <strong>Issuer:</strong> <code>{vc.metadata?.issuer || vc.reference.issuer}</code>
                      </p>
                      <p className="vc-ipfs">
                        <strong>IPFS:</strong> <code>{vc.reference.ipfsHash}</code>
                      </p>
                    </div>
                    
                    <div className="vc-card-actions">
                      <button 
                        onClick={() => decryptVC(vc)}
                        className="decrypt-btn"
                        disabled={loading}
                      >
                        {decryptedVCs[vc.reference.ipfsHash] ? 'View Details' : 'Decrypt & View'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {selectedVC && (
                <div className="vc-details">
                  <h4>Credential Details</h4>
                  <div className="vc-details-content">
                    <div className="detail-group">
                      <label>ID:</label>
                      <code>{selectedVC.id}</code>
                    </div>
                    
                    <div className="detail-group">
                      <label>Type:</label>
                      <span>{selectedVC.type?.join(', ')}</span>
                    </div>
                    
                    <div className="detail-group">
                      <label>Issuer:</label>
                      <code>{selectedVC.issuer}</code>
                    </div>
                    
                    <div className="detail-group">
                      <label>Issue Date:</label>
                      <span>{formatDate(selectedVC.issuanceDate)}</span>
                    </div>
                    
                    <div className="detail-group">
                      <label>Subject:</label>
                      <div className="subject-details">
                        <p><strong>ID:</strong> <code>{selectedVC.credentialSubject?.id}</code></p>
                        <p><strong>Subject:</strong> {selectedVC.credentialSubject?.subject}</p>
                        {selectedVC.credentialSubject?.achievement && (
                          <p><strong>Achievement:</strong> {selectedVC.credentialSubject.achievement}</p>
                        )}
                        {selectedVC.credentialSubject?.description && (
                          <p><strong>Description:</strong> {selectedVC.credentialSubject.description}</p>
                        )}
                      </div>
                    </div>
                    
                    {selectedVC.proof && (
                      <div className="detail-group">
                        <label>Proof:</label>
                        <div className="proof-details">
                          <p><strong>Type:</strong> {selectedVC.proof.type}</p>
                          <p><strong>Created:</strong> {formatDate(selectedVC.proof.created)}</p>
                          <p><strong>Method:</strong> <code>{selectedVC.proof.verificationMethod}</code></p>
                          <p><strong>Signature:</strong> <code className="signature">{selectedVC.proof.signature.substring(0, 20)}...</code></p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VCListModal;