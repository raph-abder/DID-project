import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useWeb3 } from "./hooks/useWeb3";
import { NotificationProvider, useNotifications } from "./contexts/NotificationContext";
import Header from "./components/Header/Header";
import Home from "./components/Home/Home";
import IssueVC from "./components/IssueVC/IssueVC";
import VerifyVC from "./components/VerifyVC/VerifyVC";
import ManageDID from "./components/ManageDID/ManageDID";
import AdminPanelPage from "./components/AdminPanel/AdminPanelPage";
import NotificationsPage from "./components/Notifications/NotificationsPage";
import "./App.css";

const AppContent = ({ web3State }) => {
  const { loadNotifications } = useNotifications();
  const { account, isConnected } = web3State;

  useEffect(() => {
    if (isConnected && account) {
      loadNotifications(account);
    } else {
      loadNotifications(null);
    }
  }, [account, isConnected, loadNotifications]);

  return (
    <Router>
      <div className="App">
        <Header web3State={web3State} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home web3State={web3State} />} />
            <Route path="/issue" element={<IssueVC web3State={web3State} />} />
            <Route path="/manage" element={<ManageDID web3State={web3State} />} />
            <Route path="/verify" element={<VerifyVC web3State={web3State} />} />
            <Route path="/notifications" element={<NotificationsPage web3State={web3State} />} />
            <Route path="/admin" element={<AdminPanelPage web3State={web3State} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

function App() {
  const web3State = useWeb3();

  return (
    <NotificationProvider>
      <AppContent web3State={web3State} />
    </NotificationProvider>
  );
}

export default App;
