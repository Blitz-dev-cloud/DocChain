import React from "react";
import { Routes, Route } from "react-router-dom";
import { BlockchainProvider } from "./contexts/BlockchainContext";
import { HealthDataProvider } from "./contexts/HealthDataContext";
import Hero from "./components/Hero";
import Login from "./components/Login";
import DoctorDashboard from "./components/DoctorDashboard";
import PatientDashboard from "./components/PatientDashboard";
import Registration from "./components/Registration";
import "./index.css";

function App() {
  return (
    <BlockchainProvider>
      <HealthDataProvider>
        <Routes>
          <Route path="/" element={<Hero />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Registration />} />
          <Route path="/doctor" element={<DoctorDashboard />} />
          <Route path="/patient" element={<PatientDashboard />} />
        </Routes>
      </HealthDataProvider>
    </BlockchainProvider>
  );
}

export default App;
