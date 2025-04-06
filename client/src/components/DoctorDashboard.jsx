import React, { useState, useContext, useEffect } from "react";
import { HealthDataContext } from "../contexts/HealthDataContext";
import { BlockchainContext } from "../contexts/BlockchainContext";
import Navbar from "./Navbar";
import Footer from "./Footer";

function DoctorDashboard() {
  const {
    userData,
    patients,
    addMedicalRecord,
    loading,
    userRole,
    error,
    fetchFromIPFS,
  } = useContext(HealthDataContext);
  const { account, contract, uploadToIPFS, uploadJSONToIPFS } =
    useContext(BlockchainContext);

  const [selectedPatient, setSelectedPatient] = useState("");
  const [newRecordText, setNewRecordText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [recordSuccess, setRecordSuccess] = useState(false);
  const [patientRecords, setPatientRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // New state for file upload
  const [fileUpload, setFileUpload] = useState(null);
  const [fileDescription, setFileDescription] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileSuccess, setFileSuccess] = useState(false);

  useEffect(() => {
    if (userRole !== "doctor" || loading) {
      return;
    }

    console.log("DoctorDashboard - loading:", loading);
    console.log("DoctorDashboard - userRole:", userRole);
    console.log("DoctorDashboard - userData:", userData);
    console.log("DoctorDashboard - patients:", patients);
  }, [loading, userRole, userData, patients]);

  // Fetch patient records when a patient is selected
  useEffect(() => {
    const fetchPatientRecords = async () => {
      if (!selectedPatient || !contract) return;

      try {
        setLoadingRecords(true);
        const recordHashes = await contract.getPatientRecords(selectedPatient);
        console.log("Fetched record hashes:", recordHashes);

        if (!recordHashes.length) {
          setPatientRecords([]);
          return;
        }

        const records = await Promise.all(
          recordHashes.map(async (hash, index) => {
            try {
              console.log(
                `Fetching record ${index + 1}/${
                  recordHashes.length
                } with hash: ${hash}`
              );
              return await fetchFromIPFS(hash);
            } catch (error) {
              console.error(`Error fetching record with hash ${hash}:`, error);
              return null;
            }
          })
        );

        const validRecords = records.filter(Boolean);
        console.log("Fetched valid records:", validRecords);
        setPatientRecords(validRecords);
      } catch (error) {
        console.error("Error fetching patient records:", error);
      } finally {
        setLoadingRecords(false);
      }
    };

    fetchPatientRecords();
  }, [selectedPatient, contract, fetchFromIPFS]);

  const handleAddRecord = async () => {
    if (!selectedPatient || !newRecordText.trim()) {
      alert("Please select a patient and enter record details");
      return;
    }

    try {
      setSubmitting(true);
      setRecordSuccess(false);

      const newRecord = {
        text: newRecordText,
        date: new Date().toISOString(),
        patientAddress: selectedPatient,
        doctorAddress: userData?.address || account,
        doctorName: userData?.name || "Unknown Doctor",
        doctorSpecialization: userData?.specialization || "Not specified",
        recordType: "doctor-reported",
      };

      console.log("Submitting new record:", newRecord);

      // Upload record to IPFS first
      const ipfsHash = await uploadJSONToIPFS(newRecord);
      console.log("Record uploaded to IPFS with hash:", ipfsHash);

      // Add record to blockchain
      await addMedicalRecord(ipfsHash, selectedPatient);
      setNewRecordText("");
      setRecordSuccess(true);

      // Refresh patient records
      const recordHashes = await contract.getPatientRecords(selectedPatient);
      const records = await Promise.all(
        recordHashes.map(async (hash) => {
          try {
            return await fetchFromIPFS(hash);
          } catch (error) {
            return null;
          }
        })
      );

      setPatientRecords(records.filter(Boolean));
    } catch (err) {
      console.error("Error in handleAddRecord:", err);
      alert(`Failed to add record: ${err.message || "Unknown error"}`);
    } finally {
      setSubmitting(false);
    }
  };

  // New function to handle file uploads
  const handleFileUpload = async () => {
    if (!selectedPatient || !fileUpload || !fileDescription.trim()) {
      alert("Please select a patient, file, and enter a description");
      return;
    }

    try {
      setUploadingFile(true);
      setFileSuccess(false);

      // Upload file to IPFS
      const fileHash = await uploadToIPFS(fileUpload);
      console.log("File uploaded to IPFS with hash:", fileHash);

      // Create record with file metadata
      const fileRecord = {
        text: fileDescription,
        date: new Date().toISOString(),
        patientAddress: selectedPatient,
        doctorAddress: userData?.address || account,
        doctorName: userData?.name || "Unknown Doctor",
        doctorSpecialization: userData?.specialization || "Not specified",
        recordType: "document",
        fileType: fileUpload.type,
        fileName: fileUpload.name,
        fileSize: fileUpload.size,
        fileHash: fileHash,
      };

      // Upload record metadata to IPFS
      const ipfsHash = await uploadJSONToIPFS(fileRecord);
      console.log("File record uploaded to IPFS with hash:", ipfsHash);

      // Add record to blockchain
      await addMedicalRecord(ipfsHash, selectedPatient);
      setFileUpload(null);
      setFileDescription("");
      setFileSuccess(true);

      // Refresh patient records
      const recordHashes = await contract.getPatientRecords(selectedPatient);
      const records = await Promise.all(
        recordHashes.map(async (hash) => {
          try {
            return await fetchFromIPFS(hash);
          } catch (error) {
            return null;
          }
        })
      );

      setPatientRecords(records.filter(Boolean));
    } catch (error) {
      console.error("Error uploading file:", error);
      alert(`Failed to upload file: ${error.message || "Unknown error"}`);
    } finally {
      setUploadingFile(false);
    }
  };

  // Render logic for loading, errors, and user role validation
  if (loading) {
    return (
      <div className="text-center mt-10 text-lg font-medium">
        <div className="animate-pulse">Loading doctor data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center mt-10 text-red-600 text-lg font-semibold">
        <p>Error: {error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Reload Page
        </button>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="text-center mt-10 text-red-600 text-lg font-semibold">
        <p>Error: Doctor data not found.</p>
        <p className="mt-2 text-sm text-gray-600">
          You may need to register first or check your wallet connection.
        </p>
      </div>
    );
  }

  if (userRole !== "doctor") {
    return (
      <div className="text-center mt-10 text-red-600 text-lg font-semibold">
        <p>Access Denied: You are not authorized as a doctor.</p>
        <p className="mt-2 text-sm text-gray-600">
          Please connect with a registered doctor account.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      {/* Main Dashboard */}
      <div className="max-w-6xl mx-auto mt-10 p-6 bg-white rounded-lg shadow space-y-6">
        <h2 className="text-2xl font-bold text-center text-indigo-600">
          Doctor Dashboard
        </h2>

        <div className="bg-gray-100 p-4 rounded shadow-sm">
          <h3 className="text-xl font-semibold mb-2 text-gray-800">
            Doctor Info
          </h3>
          <p>
            <strong>Name:</strong> {userData.name}
          </p>
          <p>
            <strong>Specialization:</strong> {userData.specialization}
          </p>
          <p>
            <strong>Wallet Address:</strong>{" "}
            {account
              ? `${account.slice(0, 6)}...${account.slice(-4)}`
              : "Not connected"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-100 p-4 rounded shadow-sm">
            <h3 className="text-xl font-semibold mb-3 text-gray-800">
              Patient Management
            </h3>

            {patients.length === 0 ? (
              <div className="text-center py-4 text-gray-600">
                You don't have any patients assigned yet.
              </div>
            ) : (
              <>
                <label className="block mb-2 font-medium">
                  Select Patient:
                </label>
                <select
                  value={selectedPatient}
                  onChange={(e) => setSelectedPatient(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded mb-4"
                  disabled={submitting || uploadingFile}
                >
                  <option value="">-- Select Patient --</option>
                  {patients.map((patient) => (
                    <option key={patient.address} value={patient.address}>
                      {patient.name} ({patient.address.slice(0, 6)}…
                      {patient.address.slice(-4)})
                    </option>
                  ))}
                </select>

                {selectedPatient && (
                  <>
                    <div className="mt-4">
                      <h4 className="text-lg font-semibold mb-2">
                        Add Medical Record
                      </h4>
                      <textarea
                        value={newRecordText}
                        onChange={(e) => setNewRecordText(e.target.value)}
                        placeholder="Enter record details..."
                        className="w-full p-2 border border-gray-300 rounded mb-3"
                        rows={4}
                        disabled={submitting || uploadingFile}
                      />
                      <div className="flex items-center">
                        <button
                          onClick={handleAddRecord}
                          className={`${
                            submitting || uploadingFile
                              ? "bg-gray-400 cursor-not-allowed"
                              : "bg-indigo-600 hover:bg-indigo-700"
                          } text-white px-4 py-2 rounded transition`}
                          disabled={submitting || uploadingFile}
                        >
                          {submitting ? "Submitting..." : "Submit Record"}
                        </button>

                        {recordSuccess && (
                          <span className="ml-3 text-green-600 animate-pulse">
                            Record added successfully!
                          </span>
                        )}
                      </div>
                    </div>

                    {/* File Upload Section */}
                    <div className="mt-6 pt-6 border-t border-gray-300">
                      <h4 className="text-lg font-semibold mb-2">
                        Upload Medical Document
                      </h4>
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select File
                        </label>
                        <input
                          type="file"
                          onChange={(e) => setFileUpload(e.target.files[0])}
                          className="w-full p-2 border border-gray-300 rounded"
                          disabled={submitting || uploadingFile}
                        />
                      </div>
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Document Description
                        </label>
                        <textarea
                          value={fileDescription}
                          onChange={(e) => setFileDescription(e.target.value)}
                          placeholder="Enter document description..."
                          className="w-full p-2 border border-gray-300 rounded"
                          rows={2}
                          disabled={submitting || uploadingFile}
                        />
                      </div>
                      <div className="flex items-center">
                        <button
                          onClick={handleFileUpload}
                          className={`${
                            submitting || uploadingFile || !fileUpload
                              ? "bg-gray-400 cursor-not-allowed"
                              : "bg-indigo-600 hover:bg-indigo-700"
                          } text-white px-4 py-2 rounded transition`}
                          disabled={submitting || uploadingFile || !fileUpload}
                        >
                          {uploadingFile ? "Uploading..." : "Upload Document"}
                        </button>

                        {fileSuccess && (
                          <span className="ml-3 text-green-600 animate-pulse">
                            File uploaded successfully!
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {selectedPatient && (
            <div className="bg-gray-100 p-4 rounded shadow-sm">
              <h3 className="text-xl font-semibold mb-3 text-gray-800">
                Patient Details
              </h3>
              {patients.find((p) => p.address === selectedPatient) ? (
                <div>
                  <p>
                    <strong>Name:</strong>{" "}
                    {patients.find((p) => p.address === selectedPatient).name}
                  </p>
                  <p>
                    <strong>Age:</strong>{" "}
                    {patients.find((p) => p.address === selectedPatient).age}
                  </p>
                  <p>
                    <strong>Gender:</strong>{" "}
                    {patients.find((p) => p.address === selectedPatient).gender}
                  </p>
                  <p>
                    <strong>Blood Group:</strong>{" "}
                    {patients.find((p) => p.address === selectedPatient)
                      .bloodGroup || "Not specified"}
                  </p>
                  <p>
                    <strong>Address:</strong> {selectedPatient}
                  </p>
                </div>
              ) : (
                <p>Loading patient details...</p>
              )}
            </div>
          )}
        </div>

        {selectedPatient && (
          <div className="bg-gray-100 p-4 rounded shadow-sm">
            <h3 className="text-xl font-semibold mb-3 text-gray-800">
              Patient Medical Records
            </h3>

            {loadingRecords ? (
              <p className="text-center py-4 text-gray-600">
                Loading records...
              </p>
            ) : patientRecords.length === 0 ? (
              <p className="text-center py-4 text-gray-600">
                No medical records found for this patient.
              </p>
            ) : (
              <ul className="space-y-4">
                {patientRecords.map((record, index) => (
                  <li key={index} className="border-b pb-4">
                    <div className="flex justify-between">
                      <p>
                        <strong>Date:</strong>{" "}
                        {record.date && !isNaN(new Date(record.date).getTime())
                          ? new Date(record.date).toLocaleString()
                          : "No date available"}
                      </p>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          record.recordType === "self-reported"
                            ? "bg-blue-100 text-blue-800"
                            : record.recordType === "document"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {record.recordType || "Unknown"}
                      </span>
                    </div>

                    {record.recordType === "document" ? (
                      <div>
                        <p className="font-semibold">
                          {record.fileName || "Document"}
                        </p>
                        {record.fileSize && (
                          <p className="text-sm text-gray-600">
                            {(record.fileSize / 1024).toFixed(2)} KB •{" "}
                            {record.fileType || "Unknown"}
                          </p>
                        )}
                        <p className="mt-2">{record.text}</p>
                        {record.fileHash && (
                          <a
                            href={`https://gateway.pinata.cloud/ipfs/${record.fileHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-2 bg-indigo-100 text-indigo-700 px-3 py-1 rounded hover:bg-indigo-200 transition"
                          >
                            View Document
                          </a>
                        )}
                      </div>
                    ) : (
                      <div>
                        {record.doctorName && (
                          <p>
                            <strong>Doctor:</strong> {record.doctorName} (
                            {record.doctorSpecialization})
                          </p>
                        )}
                        <p className="mt-2">
                          {record.text || "No content available"}
                        </p>
                        <button
                          onClick={() =>
                            window.open(
                              `data:text/plain;charset=utf-8,${encodeURIComponent(
                                JSON.stringify(record, null, 2)
                              )}`
                            )
                          }
                          className="mt-2 bg-indigo-100 text-indigo-700 px-3 py-1 rounded hover:bg-indigo-200 transition"
                        >
                          View Details
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

export default DoctorDashboard;
