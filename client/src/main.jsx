import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { HealthDataProvider } from "./contexts/HealthDataContext";
import { BlockchainProvider } from "./contexts/BlockchainContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BlockchainProvider>
      <HealthDataProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </HealthDataProvider>
    </BlockchainProvider>
  </React.StrictMode>
);
