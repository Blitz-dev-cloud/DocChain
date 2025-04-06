import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BlockchainContext } from "../contexts/BlockchainContext";
import { useHealthData } from "../contexts/HealthDataContext";
import ConnectWallet from "./ConnectWallet";

function Login() {
  const { account, connectWallet, connectionError, userType } =
    useContext(BlockchainContext);
  const { userRole, loading } = useHealthData();
  const [localLoading, setLocalLoading] = useState(false);
  const navigate = useNavigate();

  const handleConnect = async () => {
    setLocalLoading(true);
    try {
      await connectWallet();
    } finally {
      setLocalLoading(false);
    }
  };

  const displayRole = userType || userRole || "unregistered";

  useEffect(() => {
    const checkAndNavigate = async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (displayRole === "patient") navigate("/patient");
      else if (displayRole === "doctor") navigate("/doctor");
    };
    if (!localLoading && !loading) checkAndNavigate();
  }, [displayRole, navigate, localLoading, loading]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="text-center p-6 bg-gray-800 rounded-lg shadow-xl text-white"
    >
      <h2 className="text-2xl font-bold mb-4">Login</h2>

      <ConnectWallet onConnect={handleConnect} />

      {localLoading || loading ? (
        <p className="text-gray-400 mt-4">Checking user role...</p>
      ) : connectionError ? (
        <p className="text-red-400 mt-4">{connectionError}</p>
      ) : account ? (
        <>
          <p className="mt-4 text-gray-400">
            Wallet: <span className="font-mono text-blue-400">{account}</span>
          </p>
          <p className="mt-2">
            Role:{" "}
            <span
              className={`font-bold ${
                displayRole === "patient"
                  ? "text-green-400"
                  : displayRole === "doctor"
                  ? "text-blue-400"
                  : "text-red-400"
              }`}
            >
              {displayRole}
            </span>
          </p>
        </>
      ) : (
        <p className="text-gray-400 mt-4">Please connect your wallet.</p>
      )}
    </motion.div>
  );
}

export default Login;
