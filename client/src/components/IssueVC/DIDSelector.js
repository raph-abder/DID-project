import React from 'react';

const DIDSelector = ({ 
  userDIDs, 
  allDIDs, 
  selectedIssuerDID, 
  selectedRecipientDID, 
  onIssuerChange, 
  onRecipientChange, 
  loading 
}) => {
  return (
    <>
      <div className="form-section">
        <div className="form-group">
          <label htmlFor="issuerDID">Select your Issuer DID:</label>
          <select
            id="issuerDID"
            value={selectedIssuerDID}
            onChange={(e) => onIssuerChange(e.target.value)}
            disabled={loading}
          >
            <option value="">Select an issuer DID</option>
            {userDIDs.filter(did => did.canIssue).map(did => (
              <option key={did.id} value={did.id}>
                {did.id} (Trusted Issuer)
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-section">
        <div className="form-group">
          <label htmlFor="recipientDID">Target DID (Recipient):</label>
          <input
            type="text"
            id="recipientDID"
            value={selectedRecipientDID}
            onChange={(e) => onRecipientChange(e.target.value)}
            placeholder="Enter the DID ID of the recipient"
            disabled={loading}
          />
          <p className="help-text">
            Enter the DID ID of the person who will receive this verifiable credential
          </p>
        </div>
      </div>
    </>
  );
};

export default DIDSelector;