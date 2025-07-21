import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Header.css';

const Header = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/create', label: 'Create DID' },
    { path: '/lookup', label: 'Lookup DID' },
    { path: '/manage', label: 'Manage DID' }
  ];

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