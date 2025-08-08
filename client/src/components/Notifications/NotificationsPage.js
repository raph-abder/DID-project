import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';
import NotificationItem from './NotificationItem';
import './NotificationsPage.css';

const NotificationsPage = ({ web3State }) => {
  const { isConnected, isLoading } = web3State;
  const { 
    notifications, 
    markAllAsRead, 
    clearAllNotifications,
    unreadCount 
  } = useNotifications();
  
  const [filter, setFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

  if (isLoading) {
    return (
      <div className="page-container">
        <h1 className="page-title">Notifications</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isConnected) {
    return <Navigate to="/" replace />;
  }

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.read;
    if (filter === 'requests') return notification.type === 'verification_request';
    if (filter === 'responses') return notification.type === 'verification_response';
    if (filter === 'incoming') return notification.direction === 'incoming';
    if (filter === 'outgoing') return notification.direction === 'outgoing';
    return true;
  });

  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    if (sortOrder === 'newest') {
      return new Date(b.timestamp) - new Date(a.timestamp);
    } else {
      return new Date(a.timestamp) - new Date(b.timestamp);
    }
  });

  const handleMarkAllRead = () => {
    if (window.confirm('Mark all notifications as read?')) {
      markAllAsRead();
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to delete all notifications? This action cannot be undone.')) {
      clearAllNotifications();
    }
  };

  const getFilterCount = (filterType) => {
    switch (filterType) {
      case 'all':
        return notifications.length;
      case 'unread':
        return notifications.filter(n => !n.read).length;
      case 'requests':
        return notifications.filter(n => n.type === 'verification_request').length;
      case 'responses':
        return notifications.filter(n => n.type === 'verification_response').length;
      case 'incoming':
        return notifications.filter(n => n.direction === 'incoming').length;
      case 'outgoing':
        return notifications.filter(n => n.direction === 'outgoing').length;
      default:
        return 0;
    }
  };

  return (
    <div className="page-container">
      <div className="notifications-header">
        <h1 className="page-title">Notifications</h1>
        <div className="notifications-summary">
          {notifications.length === 0 ? (
            <p className="no-notifications-text">No notifications</p>
          ) : (
            <p className="notifications-count">
              {unreadCount > 0 && `${unreadCount} unread • `}
              {notifications.length} total
            </p>
          )}
        </div>
      </div>

      <div className="notifications-controls">
        <div className="filter-section">
          <h3>Filter by:</h3>
          <div className="filter-buttons">
            {[
              { key: 'all', label: 'All' },
              { key: 'unread', label: 'Unread' },
              { key: 'requests', label: 'Requests' },
              { key: 'responses', label: 'Responses' },
              { key: 'incoming', label: 'Incoming' },
              { key: 'outgoing', label: 'Outgoing' }
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`filter-btn ${filter === key ? 'active' : ''}`}
                onClick={() => setFilter(key)}
              >
                {label} ({getFilterCount(key)})
              </button>
            ))}
          </div>
        </div>

        <div className="sort-section">
          <h3>Sort by:</h3>
          <div className="sort-buttons">
            <button
              className={`sort-btn ${sortOrder === 'newest' ? 'active' : ''}`}
              onClick={() => setSortOrder('newest')}
            >
              Newest First
            </button>
            <button
              className={`sort-btn ${sortOrder === 'oldest' ? 'active' : ''}`}
              onClick={() => setSortOrder('oldest')}
            >
              Oldest First
            </button>
          </div>
        </div>

        {notifications.length > 0 && (
          <div className="bulk-actions">
            <h3>Actions:</h3>
            <div className="action-buttons">
              {unreadCount > 0 && (
                <button
                  className="action-btn mark-read-btn"
                  onClick={handleMarkAllRead}
                >
                  Mark All Read
                </button>
              )}
              <button
                className="action-btn clear-btn"
                onClick={handleClearAll}
              >
                Clear All
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="notifications-content">
        {sortedNotifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#bdc3c7" strokeWidth="2" fill="none"/>
                <polyline points="22,6 12,13 2,6" stroke="#bdc3c7" strokeWidth="2"/>
                <line x1="6" y1="10" x2="18" y2="10" stroke="#bdc3c7" strokeWidth="1" strokeDasharray="2,2"/>
                <line x1="6" y1="14" x2="14" y2="14" stroke="#bdc3c7" strokeWidth="1" strokeDasharray="2,2"/>
              </svg>
            </div>
            <h3>No notifications to show</h3>
            <p>
              {filter === 'all' 
                ? "You don't have any notifications yet. Start by sending or receiving verification requests."
                : `No notifications match the "${filter}" filter. Try a different filter or check back later.`}
            </p>
          </div>
        ) : (
          <div className="notifications-list">
            {sortedNotifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                isCompact={false}
                onAction={() => {}}
                web3={web3State.web3}
                account={web3State.account}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;