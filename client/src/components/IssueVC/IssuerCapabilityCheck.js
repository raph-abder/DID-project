import React from 'react';

const IssuerCapabilityCheck = ({ userDIDs, canIssue }) => {
  if (canIssue) return null;

  return (
    <div className="card">
      <div className="no-issuing-capability">
        <h3>Cannot Issue Credentials</h3>
        <p>
          You need to have an <strong>active DID</strong> to issue Verifiable Credentials.
        </p>
        <div className="your-dids">
          <h4>Your DIDs:</h4>
          {userDIDs.length === 0 ? (
            <p>No DIDs found. Please create a DID first.</p>
          ) : (
            <ul>
              {userDIDs.map(did => (
                <li key={did.id} className={`did-status ${did.canIssue ? 'can-issue' : 'cannot-issue'}`}>
                  <code>{did.id}</code>
                  <span className={`status ${did.canIssue ? 'can-issue' : 'cannot-issue'}`}>
                    {did.canIssue ? 'Can Issue' : 'Cannot Issue'}
                  </span>
                  {!did.isActive && <span className="inactive">(Inactive)</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="help-text">
          Create an active DID to start issuing Verifiable Credentials.
        </p>
      </div>
    </div>
  );
};

export default IssuerCapabilityCheck;