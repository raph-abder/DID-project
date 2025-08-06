import React, { useState, useEffect, useCallback } from 'react';
import './AdminPanel.css';

const AdminPanel = ({ 
  web3, 
  account, 
  contract, 
  checkIsAdmin, 
  getAdminDID, 
  addTrustedIssuer, 
  removeTrustedIssuer, 
  checkIsTrustedIssuer,
  getAllDIDs,
  getDIDDocument
}) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminDID, setAdminDID] = useState('');
  const [allDIDs, setAllDIDs] = useState([]);
  const [filteredDIDs, setFilteredDIDs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const loadAllDIDs = useCallback(async () => {
    if (!contract) return;

    try {
      setLoading(true);
      const didIds = await getAllDIDs();
      
      const didsWithDetails = await Promise.all(
        didIds.map(async (didId) => {
          try {
            const didDoc = await getDIDDocument(didId);
            const isTrusted = await checkIsTrustedIssuer(didId);
            const isAdminDID = await checkIsAdmin(didId);
            
            return {
              id: didId,
              controller: didDoc.controller,
              isActive: didDoc.isActive,
              isTrustedIssuer: isTrusted,
              isAdmin: isAdminDID,
              created: new Date(parseInt(didDoc.created) * 1000).toLocaleDateString(),
            };
          } catch (error) {
            console.error(`Error loading DID ${didId}:`, error);
            return {
              id: didId,
              controller: 'Unknown',
              isActive: false,
              isTrustedIssuer: false,
              isAdmin: false,
              created: 'Unknown',
            };
          }
        })
      );

      const sortedDIDs = didsWithDetails.sort((a, b) => {
        if (a.isAdmin && !b.isAdmin) return -1;
        if (!a.isAdmin && b.isAdmin) return 1;
        if (a.isTrustedIssuer && !b.isTrustedIssuer) return -1;
        if (!a.isTrustedIssuer && b.isTrustedIssuer) return 1;
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        return 0;
      });

      setAllDIDs(sortedDIDs);
      setFilteredDIDs(sortedDIDs);
    } catch (error) {
      console.error('Error loading DIDs:', error);
    } finally {
      setLoading(false);
    }
  }, [contract, getAllDIDs, getDIDDocument, checkIsTrustedIssuer, checkIsAdmin]);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!contract || !account) return;

      try {
        const adminDIDValue = await getAdminDID();
        setAdminDID(adminDIDValue || '');

        if (adminDIDValue) {
          const userDIDs = await contract.methods.getDIDsByController(account).call();
          const isUserAdmin = userDIDs.some(did => did === adminDIDValue);
          setIsAdmin(isUserAdmin);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };

    checkAdminStatus();
  }, [contract, account, getAdminDID]);

  useEffect(() => {
    if (isAdmin) {
      loadAllDIDs();
    }
  }, [isAdmin, loadAllDIDs]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredDIDs(allDIDs);
    } else {
      const filtered = allDIDs.filter(did =>
        did.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        did.controller.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredDIDs(filtered);
    }
  }, [searchQuery, allDIDs]);

  const handleToggleTrustedStatusDirect = async (did) => {
    if (!did || !account) return;

    try {
      setLoading(true);
      setResult(null);

      if (did.isTrustedIssuer) {
        await removeTrustedIssuer(did.id, account);
        setResult({ 
          type: 'success', 
          message: `Successfully removed ${did.id} as trusted issuer` 
        });
      } else {
        await addTrustedIssuer(did.id, account);
        setResult({ 
          type: 'success', 
          message: `Successfully added ${did.id} as trusted issuer` 
        });
      }

      await loadAllDIDs();
    } catch (error) {
      setResult({ 
        type: 'error', 
        message: `Error updating trusted status: ${error.message}` 
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="admin-panel">
        <h2>Admin Panel</h2>
        <p className="no-admin">You do not have admin privileges.</p>
        {adminDID && (
          <p className="admin-info">Current admin DID: <code>{adminDID}</code></p>
        )}
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <h2>Admin Panel</h2>
      <p className="admin-status">✅ You have admin privileges</p>
      <p className="admin-did">Admin DID: <code>{adminDID}</code></p>

      <div className="did-management">
        <div className="management-header">
          <h3>Manage Trusted Issuers</h3>
          <button onClick={loadAllDIDs} disabled={loading} className="refresh-btn">
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        <div className="search-container">
          <input
            type="text"
            placeholder="Search DIDs by ID or controller address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        {loading && <p className="loading-text">Loading DIDs...</p>}

        {!loading && filteredDIDs.length === 0 && (
          <p className="no-results">No DIDs found matching your search.</p>
        )}

        {!loading && filteredDIDs.length > 0 && (
          <div className="did-list-container">
            <div className="did-list">
              {filteredDIDs.map((did) => (
                <div 
                  key={did.id} 
                  className={`did-item ${!did.isActive ? 'inactive' : ''}`}
                >
                  <div className="did-item-header">
                    <span className="did-id">{did.id}</span>
                    <div className="role-badges">
                      {did.isAdmin && <span className="role-badge admin">ADMIN</span>}
                      {did.isTrustedIssuer && <span className="role-badge trusted">TRUSTED ISSUER</span>}
                      {!did.isAdmin && !did.isTrustedIssuer && <span className="role-badge regular">REGULAR</span>}
                    </div>
                  </div>
                  <div className="did-item-content">
                    <div className="did-item-details">
                      <p className="controller">Controller: {did.controller}</p>
                      <p className="created">Created: {did.created}</p>
                      <p className="status">
                        Status: 
                        <span className={`status-badge ${did.isActive ? 'active' : 'inactive'}`}>
                          {did.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </p>
                    </div>
                    <div className="did-actions">
                      {did.isAdmin ? (
                        <span className="admin-notice-small">Admin DID - Protected</span>
                      ) : !did.isActive ? (
                        <span className="inactive-notice-small">Inactive - Cannot Modify</span>
                      ) : (
                        <button 
                          onClick={() => handleToggleTrustedStatusDirect(did)}
                          disabled={loading}
                          className={`action-btn-small ${did.isTrustedIssuer ? 'remove' : 'add'}`}
                        >
                          {loading ? 'Processing...' : did.isTrustedIssuer ? 'Remove Trusted' : 'Add Trusted'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {result && (
          <div className={`result ${result.type}`}>
            {result.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;