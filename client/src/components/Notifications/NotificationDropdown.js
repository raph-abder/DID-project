import React, { useState } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import NotificationItem from './NotificationItem';
import './NotificationDropdown.css';

const NotificationDropdown = ({ onClose, onViewAll, web3, account }) => {
  const { notifications, markAllAsRead } = useNotifications();
  const [filter, setFilter] = useState('all');
  
  const recentNotifications = notifications.slice(0, 5);
  
  const filteredNotifications = recentNotifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'requests') return notification.type === 'verification_request';
    if (filter === 'responses') return notification.type === 'verification_response';
    return true;
  });

  const handleMarkAllRead = () => {
    markAllAsRead();
  };

  return (
    <div className="notification-dropdown">
      <div className="notification-header">
        <h3>Notifications</h3>
        <div className="notification-actions">
          {notifications.some(n => !n.read) && (
            <button 
              className="mark-all-read-btn"
              onClick={handleMarkAllRead}
              title="Mark all as read"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>
      
      <div className="notification-filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button 
          className={`filter-btn ${filter === 'requests' ? 'active' : ''}`}
          onClick={() => setFilter('requests')}
        >
          Requests
        </button>
        <button 
          className={`filter-btn ${filter === 'responses' ? 'active' : ''}`}
          onClick={() => setFilter('responses')}
        >
          Responses
        </button>
      </div>

      <div className="notification-list">
        {filteredNotifications.length === 0 ? (
          <div className="no-notifications">
            <p>No notifications to display</p>
          </div>
        ) : (
          filteredNotifications.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              isCompact={true}
              onAction={() => {}}
              web3={web3}
              account={account}
            />
          ))
        )}
      </div>

      <div className="notification-footer">
        <button 
          className="view-all-btn"
          onClick={onViewAll}
        >
          View All Notifications
        </button>
      </div>
    </div>
  );
};

export default NotificationDropdown;