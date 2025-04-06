import React, { createContext, useState, useEffect, useCallback } from "react";
import { BrowserProvider, Contract } from "ethers";
import EHRContract from "../abis/EHRContract.json";

export const BlockchainContext = createContext();

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
const pinataJWT = import.meta.env.VITE_PINATA_JWT;

export const BlockchainProvider = ({ children, onRoleUpdate }) => {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [userType, setUserType] = useState(null);
  const [connectionError, setConnectionError] = useState(null);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      const error = "MetaMask not detected! Please install MetaMask.";
      setConnectionError(error);
      console.error(error);
      return;
    }

    try {
      setConnectionError(null);
      const provider = new BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      setAccount(userAddress);

      const ehrContract = new Contract(
        contractAddress,
        EHRContract.abi,
        signer
      );
      setContract(ehrContract);

      const isPatient = await ehrContract.isPatient(userAddress);
      const isDoctor = await ehrContract.isDoctor(userAddress);
      const role = isPatient ? "patient" : isDoctor ? "doctor" : null;
      setUserType(role);
      if (onRoleUpdate) onRoleUpdate(role);
    } catch (error) {
      const errorMessage = `Error connecting wallet: ${error.message || error}`;
      setConnectionError(errorMessage);
      console.error(errorMessage);
    }
  }, [onRoleUpdate]);

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) connectWallet();
        else {
          setAccount(null);
          setContract(null);
          setUserType(null);
          if (onRoleUpdate) onRoleUpdate(null);
        }
      });

      window.ethereum.on("chainChanged", () => {
        setAccount(null);
        setContract(null);
        setUserType(null);
        if (onRoleUpdate) onRoleUpdate(null);
        connectWallet();
      });

      connectWallet();
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", connectWallet);
        window.ethereum.removeListener("chainChanged", connectWallet);
      }
    };
  }, [connectWallet, onRoleUpdate]);

  // Extract the actual JWT token by removing the 'Bearer ' prefix if present
  const getCleanJWT = () => {
    if (!pinataJWT || pinataJWT.trim() === "") {
      throw new Error(
        "Pinata JWT token is missing. Please check your environment variables."
      );
    }

    const jwt = pinataJWT.trim().startsWith("Bearer ")
      ? pinataJWT.trim().substring(7)
      : pinataJWT.trim();

    return jwt;
  };

  const uploadJSONToIPFS = async (jsonData) => {
    try {
      // Validate that we have proper data
      if (!jsonData) {
        throw new Error("Invalid JSON data provided");
      }

      const dataToUpload =
        typeof jsonData === "string" ? JSON.parse(jsonData) : jsonData;

      const jwt = getCleanJWT();

      const requestBody = {
        pinataContent: dataToUpload,
        pinataMetadata: {
          name: `medical-record-${Date.now()}`,
        },
      };

      console.log("Sending to Pinata:", JSON.stringify(requestBody));

      const response = await fetch(
        "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        let errorMessage = `Pinata API error: ${response.status}`;

        try {
          const errorData = await response.json();
          errorMessage += ` - ${JSON.stringify(errorData)}`;
        } catch (e) {
          try {
            const errorText = await response.text();
            errorMessage += ` - ${errorText}`;
          } catch (e2) {
            errorMessage += " - Unable to parse error response";
          }
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("✅ Successfully uploaded JSON to IPFS:", data.IpfsHash);
      return data.IpfsHash;
    } catch (error) {
      console.error("❌ Error uploading JSON to IPFS:", error);
      throw new Error(
        `Failed to upload medical record to Pinata: ${error.message}`
      );
    }
  };

  const uploadToIPFS = async (file) => {
    try {
      if (!file || !(file instanceof File)) {
        throw new Error("Invalid file provided");
      }

      const jwt = getCleanJWT();

      const formData = new FormData();
      formData.append("file", file);

      formData.append(
        "pinataMetadata",
        JSON.stringify({
          name: `medical-doc-${Date.now()}-${file.name}`,
        })
      );

      const response = await fetch(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        let errorMessage = `Pinata API error: ${response.status}`;

        const contentType = response.headers.get("Content-Type") || "";
        if (contentType.includes("application/json")) {
          try {
            const errorData = await response.json();
            errorMessage += ` - ${JSON.stringify(errorData)}`;
          } catch (e) {
            // JSON parse failed
          }
        } else {
          try {
            const errorText = await response.text();
            errorMessage += ` - ${errorText}`;
          } catch (e) {}
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("✅ Successfully uploaded file to IPFS:", data.IpfsHash);
      return data.IpfsHash;
    } catch (error) {
      console.error("❌ Error uploading file to IPFS:", error);
      throw new Error(`Failed to upload file to Pinata: ${error.message}`);
    }
  };

  return (
    <BlockchainContext.Provider
      value={{
        account,
        contract,
        userType,
        uploadToIPFS,
        uploadJSONToIPFS,
        connectWallet,
        connectionError,
      }}
    >
      {children}
    </BlockchainContext.Provider>
  );
};

export default BlockchainContext;
