import React, { useState } from "react";
import { motion } from "framer-motion";
import { BrowserProvider, Contract } from "ethers";
import axios from "axios";
import EHRContract from "../abis/EHRContract.json";
import ConnectWallet from "./ConnectWallet";

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;

// ✅ Upload data to IPFS
const uploadToIPFS = async (data) => {
  console.log("📤 Uploading to IPFS:", data);

  try {
    const formattedData = JSON.stringify(data, null, 2);
    const res = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      formattedData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PINATA_JWT}`,
        },
      }
    );

    if (!res.data?.IpfsHash) {
      console.error("❌ IPFS upload failed:", res.data);
      return null;
    }

    console.log("✅ IPFS Hash:", res.data.IpfsHash);
    return res.data.IpfsHash;
  } catch (error) {
    console.error(
      "❌ IPFS Upload Error:",
      error.response?.data || error.message
    );
    return null;
  }
};

function Registration() {
  const [account, setAccount] = useState(null);
  const [userType, setUserType] = useState("patient");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");
  const [allergies, setAllergies] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!account) {
      alert("⚠️ Please connect your wallet first.");
      setLoading(false);
      return;
    }

    if (!name || !age || (userType === "doctor" && !specialization)) {
      alert("⚠️ Please fill in all required fields.");
      setLoading(false);
      return;
    }

    const userData = {
      name,
      age: parseInt(age),
      gender,
      bloodGroup,
      contactNumber,
      email,
      walletAddress: account,
      userType,
      registrationDate: new Date().toISOString(),
    };

    if (userType === "patient") {
      userData.allergies = allergies;
      userData.emergencyContact = emergencyContact;
    } else {
      userData.specialization = specialization;
      userData.yearsOfExperience = "";
      userData.licenseNumber = "";
    }

    console.log("📌 User data:", userData);

    const ipfsHash = await uploadToIPFS(userData);
    if (!ipfsHash) {
      alert("❌ IPFS upload failed! Try again.");
      setLoading(false);
      return;
    }

    try {
      if (!EHRContract?.abi) {
        console.error("❌ ABI is missing or undefined.");
        alert("Smart contract ABI is missing!");
        setLoading(false);
        return;
      }

      const provider = new BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const contract = new Contract(contractAddress, EHRContract.abi, signer);

      let tx;
      if (userType === "patient") {
        console.log("📜 Registering patient...");
        tx = await contract.registerPatient(ipfsHash);
      } else {
        console.log("📜 Registering doctor...");
        tx = await contract.registerDoctor(ipfsHash, specialization);
      }

      console.log("⏳ Sending transaction:", tx);
      await tx.wait();
      console.log("✅ Transaction successful!");

      alert("🎉 Registration successful!");
    } catch (error) {
      console.error("❌ Registration failed:", error);
      alert(`❌ Registration failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div className="text-center p-6 bg-gray-800 rounded-lg text-white">
      <h2 className="text-2xl font-bold mb-4">Registration</h2>

      <ConnectWallet onConnect={setAccount} />

      <form onSubmit={handleRegister} className="space-y-4 mt-4">
        <select
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          value={userType}
          onChange={(e) => setUserType(e.target.value)}
        >
          <option value="patient">Patient</option>
          <option value="doctor">Doctor</option>
        </select>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="number"
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            placeholder="Age"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>

          <select
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            value={bloodGroup}
            onChange={(e) => setBloodGroup(e.target.value)}
          >
            <option value="">Blood Group (Optional)</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="tel"
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            placeholder="Contact Number"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
          />
          <input
            type="email"
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {userType === "patient" && (
          <>
            <textarea
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              placeholder="Allergies (if any)"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              rows={2}
            />
            <input
              type="text"
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              placeholder="Emergency Contact"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
            />
          </>
        )}

        {userType === "doctor" && (
          <>
            <input
              type="text"
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              placeholder="Specialization"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                placeholder="License Number"
              />
              <input
                type="number"
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                placeholder="Years of Experience"
              />
            </div>
          </>
        )}

        <motion.button
          type="submit"
          className="mt-4 px-6 py-3 bg-green-600 text-white rounded-lg shadow-lg w-full"
          disabled={loading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {loading ? "Registering..." : "Register"}
        </motion.button>
      </form>
    </motion.div>
  );
}

export default Registration;
