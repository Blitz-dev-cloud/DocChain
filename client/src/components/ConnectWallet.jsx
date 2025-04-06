import React, { useState, useEffect } from "react";
import { BrowserProvider } from "ethers";
import { motion } from "framer-motion";

function ConnectWallet({ onConnect }) {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(false);

  async function connectWallet() {
    if (!window.ethereum) {
      alert("MetaMask not detected! Please install it.");
      return;
    }

    try {
      setLoading(true);
      const provider = new BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setAccount(address);
      onConnect(address);
    } catch (error) {
      console.error("Wallet connection failed:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        setAccount(accounts.length > 0 ? accounts[0] : null);
        onConnect(accounts.length > 0 ? accounts[0] : null);
      });
    }
  }, []);

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg shadow-lg w-full"
      onClick={connectWallet}
      disabled={loading}
    >
      {account
        ? `Connected: ${account.slice(0, 6)}...${account.slice(-4)}`
        : "Connect Wallet"}
    </motion.button>
  );
}

export default ConnectWallet;
