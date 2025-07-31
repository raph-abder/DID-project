import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Header.css';

const Header = ({ web3State }) => {
  const location = useLocation();
  const { isConnected, isLoading, account } = web3State;

  const disconnectedNavItems = [
    { path: '/', label: 'Home' }
  ];

  const connectedNavItems = [
    { path: '/manage', label: 'Manage your DID' },
    { path: '/issue', label: 'Issue Verifiable Credential' },
    { path: '/verify', label: 'Verify Verifiable Credential' }
  ];

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
      </div>
    </header>
  );
};

export default Header;