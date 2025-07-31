import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useWeb3 } from "./hooks/useWeb3";
import Header from "./components/Header/Header";
import Home from "./components/Home/Home";
import LookupDID from "./components/LookupDID/LookupDID";
import ManageDID from "./components/ManageDID/ManageDID";
import "./App.css";

function App() {
  const web3State = useWeb3(); // Custom hook to manage Web3 state for the dynamic pages

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
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
