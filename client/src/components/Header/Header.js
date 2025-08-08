import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useContract } from '../../hooks/useContract';
import NotificationIcon from '../Notifications/NotificationIcon';
import './Header.css';

const Header = ({ web3State }) => {
  const location = useLocation();
  const { web3, isConnected, isLoading, account } = web3State;
  const { contract, getAdminDID } = useContract(web3);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!contract || !account) {
        setIsAdmin(false);
        return;
      }

      try {
        const adminDID = await getAdminDID();
        if (adminDID) {
          const userDIDs = await contract.methods.getDIDsByController(account).call();
          const userIsAdmin = userDIDs.some(did => did === adminDID);
          setIsAdmin(userIsAdmin);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [contract, account, getAdminDID]);

  const disconnectedNavItems = [
    { path: '/', label: 'Home' }
  ];

  const baseConnectedNavItems = [
    { path: '/manage', label: 'Manage your DID' },
    { path: '/issue', label: 'Issue Verifiable Credential' },
    { path: '/verify', label: 'Verify Verifiable Credential' }
  ];

  const connectedNavItems = isAdmin 
    ? [...baseConnectedNavItems, { path: '/admin', label: 'Admin Panel' }]
    : baseConnectedNavItems;

  const navItems = (isConnected && account && !isLoading) ? connectedNavItems : disconnectedNavItems;

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          DID Registry
        </Link>
        <nav className="nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          {(isConnected && account && !isLoading) && (
            <NotificationIcon web3={web3} account={account} />
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;