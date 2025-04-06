import React, { createContext, useContext, useState, useEffect } from "react";
import { getAddress } from "ethers";
import { BlockchainContext } from "./BlockchainContext";

const HealthDataContext = createContext();

export const useHealthData = () => {
  const context = useContext(HealthDataContext);
  if (!context) {
    throw new Error("useHealthData must be used within a HealthDataProvider");
  }
  return context;
};

export const HealthDataProvider = ({ children }) => {
  const { account, contract, userType } = useContext(BlockchainContext);
  const [userRole, setUserRole] = useState(userType);
  const [userData, setUserData] = useState(null);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const pinataApiKey = import.meta.env.VITE_PINATA_API_KEY;
  const pinataSecretApiKey = import.meta.env.VITE_PINATA_SECRET_API_KEY;

  // Sync userRole with BlockchainContext's userType
  useEffect(() => {
    setUserRole(userType);
    console.log(
      "HealthDataContext: userRole updated from BlockchainContext:",
      userType
    );
  }, [userType]);

  useEffect(() => {
    if (contract && account) {
      console.log(
        "HealthDataProvider: Contract and account available, loading data"
      );
      loadUserData();
    } else {
      console.log("HealthDataProvider: Waiting for contract and account");
      setLoading(false);
    }
  }, [contract, account, userRole]);

  const fetchFromIPFS = async (ipfsHash) => {
    if (!ipfsHash) return null;

    const cleanHash = ipfsHash.includes("/ipfs/")
      ? ipfsHash.split("/ipfs/")[1]
      : ipfsHash;

    console.log("Fetching from IPFS with hash:", cleanHash);

    const gateways = [
      `https://gateway.pinata.cloud/ipfs/${cleanHash}`,
      `https://ipfs.io/ipfs/${cleanHash}`,
      `https://cloudflare-ipfs.com/ipfs/${cleanHash}`,
    ];

    for (const gateway of gateways) {
      try {
        console.log(`Trying gateway: ${gateway}`);
        const response = await fetch(gateway);

        if (!response.ok) continue;

        const data = await response.json();
        console.log("Successfully fetched data:", data);

        // Check if this is a wrapper object with a data property containing another hash
        if (
          data &&
          data.data &&
          typeof data.data === "string" &&
          data.data.startsWith("Qm")
        ) {
          console.log(
            "Found nested IPFS hash, fetching actual content:",
            data.data
          );
          // Recursive call to fetch the actual content
          return await fetchFromIPFS(data.data);
        }

        return data;
      } catch (error) {
        console.warn(`Failed to fetch from ${gateway}:`, error);
      }
    }

    throw new Error("Failed to fetch from all IPFS gateways");
  };

  const loadUserData = async () => {
    if (!contract || !account || !userRole) {
      console.log("Cannot load user data: missing contract, account, or role");
      setLoading(false);
      return;
    }

    try {
      const normalizedAccount = await getAddress(account);
      const isDoctor = userRole === "doctor";
      console.log(
        `Loading ${isDoctor ? "doctor" : "patient"} data for:`,
        normalizedAccount
      );

      const ipfsHash = isDoctor
        ? await contract.getDoctorData(normalizedAccount)
        : await contract.getPatientData(normalizedAccount);

      console.log("IPFS Hash returned from contract:", ipfsHash);

      if (!ipfsHash || ipfsHash === "" || ipfsHash === "0x0") {
        console.warn("No IPFS hash found for user");
        setLoading(false);
        return;
      }

      const data = await fetchFromIPFS(ipfsHash);
      setUserData(data);
      console.log("User data loaded successfully:", data);

      if (isDoctor) {
        await loadDoctorPatients();
      } else {
        await loadMedicalRecords(normalizedAccount);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      setError(`Error loading user data: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const loadMedicalRecords = async (patientAddress) => {
    if (!contract) return;

    try {
      const normalizedAddress = await getAddress(patientAddress);
      console.log("Loading medical records for patient:", normalizedAddress);

      const recordHashes = await contract.getPatientRecords(normalizedAddress);
      console.log("Record hashes retrieved:", recordHashes);

      if (!recordHashes.length) {
        console.log("No medical records found");
        setMedicalRecords([]);
        return;
      }

      const records = await Promise.all(
        recordHashes.map(async (hash, index) => {
          try {
            console.log(
              `Fetching record ${index + 1}/${recordHashes.length} with hash:`,
              hash
            );
            return await fetchFromIPFS(hash);
          } catch (error) {
            console.error(`Error fetching record ${index}:`, error);
            return null;
          }
        })
      );

      const validRecords = records.filter(Boolean);
      console.log("Medical records loaded:", validRecords.length);
      setMedicalRecords(validRecords);
    } catch (error) {
      console.error("Error loading medical records:", error);
      setError(`Error loading medical records: ${error.message || error}`);
    }
  };

  const loadDoctorPatients = async () => {
    if (!contract || !account) return;

    try {
      const normalizedAccount = await getAddress(account);
      console.log("Loading patients for doctor:", normalizedAccount);

      const patientAddresses = await contract.getDoctorPatients(
        normalizedAccount
      );
      console.log("Patient addresses retrieved:", patientAddresses);

      if (!patientAddresses.length) {
        console.log("No patients found for doctor");
        setPatients([]);
        return;
      }

      const patientData = await Promise.all(
        patientAddresses.map(async (patientAddress, index) => {
          try {
            const normalizedPatient = await getAddress(patientAddress);
            console.log(
              `Fetching data for patient ${index + 1}/${
                patientAddresses.length
              }:`,
              normalizedPatient
            );

            const ipfsHash = await contract.getPatientData(normalizedPatient);
            if (!ipfsHash || ipfsHash === "0x0") {
              console.warn(
                `No IPFS hash found for patient ${normalizedPatient}`
              );
              return null;
            }

            const data = await fetchFromIPFS(ipfsHash);
            return { address: normalizedPatient, ...data };
          } catch (error) {
            console.error(
              `Error fetching patient ${patientAddress} data:`,
              error
            );
            return null;
          }
        })
      );

      const validPatients = patientData.filter(Boolean);
      console.log("Patients loaded:", validPatients.length);
      setPatients(validPatients);
    } catch (error) {
      console.error("Error loading patients:", error);
      setError(`Error loading patients: ${error.message || error}`);
    }
  };

  const addMedicalRecord = async (record, patientAddress = account) => {
    if (!contract || !account) {
      console.error("Cannot add record: contract or account missing");
      setError("Wallet not connected properly");
      return;
    }

    try {
      setError(null);
      const normalizedAddress = await getAddress(patientAddress);
      console.log("Adding medical record for patient:", normalizedAddress);

      // If record is already an IPFS hash string, use it directly
      // Otherwise, upload the record object to IPFS
      let ipfsHash;
      if (typeof record === "string" && record.startsWith("Qm")) {
        ipfsHash = record;
        console.log("Using provided IPFS hash:", ipfsHash);
      } else {
        // Make sure record is an object with required fields
        const recordObject =
          typeof record === "string" ? { text: record } : record;
        console.log("Record data to upload:", recordObject);

        ipfsHash = await uploadJSONToIPFS(recordObject);
        console.log("Record uploaded to IPFS with hash:", ipfsHash);
      }

      console.log("Submitting transaction to contract...");
      const tx = await contract.addMedicalRecord(normalizedAddress, ipfsHash);
      console.log("Transaction submitted:", tx.hash);

      await tx.wait(1);
      console.log("Transaction confirmed");

      await loadMedicalRecords(normalizedAddress);
    } catch (error) {
      console.error("Error adding medical record:", error);
      setError(`Error adding medical record: ${error.message || error}`);
    }
  };

  return (
    <HealthDataContext.Provider
      value={{
        userRole,
        setUserRole,
        userData,
        medicalRecords,
        patients,
        loading,
        error,
        loadMedicalRecords,
        addMedicalRecord,
        fetchFromIPFS,
      }}
    >
      {children}
    </HealthDataContext.Provider>
  );
};

export { HealthDataContext };
