import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header/Header";
import Home from "./components/Home/Home";
import CreateDID from "./components/CreateDID/CreateDID";
import LookupDID from "./components/LookupDID/LookupDID";
import VerifySignature from "./components/VerifySignature/VerifySignature";
import ManageDID from "./components/ManageDID/ManageDID";
import "./App.css";

function App() {
  return (
    <Router>
      <div className="App">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreateDID />} />
            <Route path="/lookup" element={<LookupDID />} />
            <Route path="/verify" element={<VerifySignature />} />
            <Route path="/manage" element={<ManageDID />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
