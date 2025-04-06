import React, { useState, useContext, useEffect } from "react";
import { HealthDataContext } from "../contexts/HealthDataContext";
import { BlockchainContext } from "../contexts/BlockchainContext";
import Navbar from "./Navbar";
import Footer from "./Footer";

function PatientDashboard() {
  const {
    userData,
    medicalRecords,
    addMedicalRecord,
    loading,
    error,
    fetchFromIPFS,
  } = useContext(HealthDataContext);
  const { account, contract, uploadToIPFS, uploadJSONToIPFS } =
    useContext(BlockchainContext);

  // State for various functionalities
  const [newRecordText, setNewRecordText] = useState("");
  const [activeTab, setActiveTab] = useState("records");
  const [fileUpload, setFileUpload] = useState(null);
  const [fileDescription, setFileDescription] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [authorizedDoctors, setAuthorizedDoctors] = useState([]);
  const [newDoctorAddress, setNewDoctorAddress] = useState("");
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  useEffect(() => {
    const fetchAuthorizedDoctors = async () => {
      if (!contract || !account) return;

      try {
        setLoadingDoctors(true);
        console.log("Fetching authorized doctors for account:", account);

        // Use the new getAuthorizedDoctors function from the contract
        const doctorAddresses = await contract.getAuthorizedDoctors(account);
        console.log("Authorized doctor addresses:", doctorAddresses);

        if (doctorAddresses.length === 0) {
          console.log("No authorized doctors found");
          setAuthorizedDoctors([]);
          setLoadingDoctors(false);
          return;
        }

        const doctorsData = await Promise.all(
          doctorAddresses.map(async (doctorAddress) => {
            try {
              const ipfsHash = await contract.getDoctorData(doctorAddress);
              console.log(`Doctor ${doctorAddress} IPFS hash:`, ipfsHash);

              if (!ipfsHash) return null;

              const doctorData = await fetchFromIPFS(ipfsHash);
              console.log(`Doctor ${doctorAddress} data:`, doctorData);

              return { ...doctorData, address: doctorAddress };
            } catch (error) {
              console.error(
                `Error fetching data for doctor ${doctorAddress}:`,
                error
              );
              return null;
            }
          })
        );

        const validDoctors = doctorsData.filter(Boolean);
        console.log("Final authorized doctors:", validDoctors);

        setAuthorizedDoctors(validDoctors);
      } catch (error) {
        console.error("Error fetching authorized doctors:", error);
      } finally {
        setLoadingDoctors(false);
      }
    };

    fetchAuthorizedDoctors();
  }, [contract, account, fetchFromIPFS]);

  const handleAddRecord = async () => {
    if (!newRecordText.trim()) return;
    setUploadError(null);

    try {
      const newRecord = {
        text: newRecordText,
        date: new Date().toISOString(),
        patientAddress: userData?.address || account,
        recordType: "self-reported",
      };

      const ipfsHash = await uploadJSONToIPFS(newRecord);
      if (!ipfsHash) throw new Error("Failed to get IPFS hash");

      await addMedicalRecord(ipfsHash);
      setNewRecordText("");
    } catch (error) {
      console.error("Error adding record:", error);
      setUploadError(`Error adding record: ${error.message}`);
    }
  };

  // Handle file upload
  const handleFileUpload = async () => {
    if (!fileUpload || !fileDescription.trim()) return;
    setUploadError(null);

    try {
      setUploadingFile(true);

      const fileHash = await uploadToIPFS(fileUpload);
      if (!fileHash) throw new Error("Failed to get file IPFS hash");

      const fileRecord = {
        text: fileDescription,
        date: new Date().toISOString(),
        patientAddress: userData?.address || account,
        recordType: "document",
        fileType: fileUpload.type,
        fileName: fileUpload.name,
        fileSize: fileUpload.size,
        fileHash: fileHash,
      };

      const ipfsHash = await uploadJSONToIPFS(fileRecord);
      if (!ipfsHash) throw new Error("Failed to get record IPFS hash");

      await addMedicalRecord(ipfsHash);
      setFileUpload(null);
      setFileDescription("");
    } catch (error) {
      console.error("Error uploading file:", error);
      setUploadError(`Error uploading file: ${error.message}`);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleGrantAccess = async () => {
    if (!newDoctorAddress.trim() || !contract) return;
    setUploadError(null);

    try {
      const tx = await contract.grantAccess(newDoctorAddress);
      await tx.wait(1);

      try {
        const ipfsHash = await contract.getDoctorData(newDoctorAddress);
        if (ipfsHash) {
          const doctorData = await fetchFromIPFS(ipfsHash);
          if (doctorData) {
            setAuthorizedDoctors([
              ...authorizedDoctors,
              {
                ...doctorData,
                address: newDoctorAddress,
              },
            ]);
          }
        }
      } catch (error) {
        console.error("Error fetching new doctor data:", error);
      }

      setNewDoctorAddress("");
    } catch (error) {
      console.error("Error granting access:", error);
      setUploadError(`Error granting access: ${error.message}`);
    }
  };

  const handleRevokeAccess = async (doctorAddress) => {
    if (!contract) return;
    setUploadError(null);

    try {
      const tx = await contract.revokeAccess(doctorAddress);
      await tx.wait(1);

      // Update UI
      setAuthorizedDoctors(
        authorizedDoctors.filter((doc) => doc.address !== doctorAddress)
      );
    } catch (error) {
      console.error("Error revoking access:", error);
      setUploadError(`Error revoking access: ${error.message}`);
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return !isNaN(date.getTime())
        ? date.toLocaleString()
        : "No date available";
    } catch (error) {
      return "No date available";
    }
  };

  if (loading) {
    return (
      <div className="text-center mt-10 text-lg font-medium">
        <div className="animate-pulse">Loading patient data...</div>
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
        <p>Error: Patient data not found.</p>
        <p className="mt-2 text-sm text-gray-600">
          You may need to register first or check your wallet connection.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-800">
        <Navbar />
        <div className="max-w-5xl mx-auto mt-10 p-6 bg-white rounded-lg shadow space-y-6">
          <h2 className="text-2xl font-bold text-center text-indigo-600">
            Patient Dashboard
          </h2>

          {uploadError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              <span className="block sm:inline">{uploadError}</span>
              <span
                className="absolute top-0 bottom-0 right-0 px-4 py-3"
                onClick={() => setUploadError(null)}
              >
                <svg
                  className="fill-current h-6 w-6 text-red-500"
                  role="button"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                >
                  <title>Close</title>
                  <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z" />
                </svg>
              </span>
            </div>
          )}

          <div className="bg-gray-100 p-4 rounded shadow-sm">
            <h3 className="text-xl font-semibold mb-2 text-gray-800">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p>
                  <strong>Name:</strong> {userData.name}
                </p>
                <p>
                  <strong>Age:</strong> {userData.age}
                </p>
                <p>
                  <strong>Gender:</strong> {userData.gender}
                </p>
              </div>
              <div>
                <p>
                  <strong>Blood Group:</strong>{" "}
                  {userData.bloodGroup || "Not specified"}
                </p>
                <p>
                  <strong>Registration Date:</strong>{" "}
                  {formatDate(userData.registrationDate)}
                </p>
                <p>
                  <strong>Wallet Address:</strong>{" "}
                  {account
                    ? `${account.slice(0, 6)}...${account.slice(-4)}`
                    : "Not connected"}
                </p>
              </div>
            </div>
          </div>

          <div className="border-b border-gray-200">
            <nav className="flex space-x-4">
              <button
                onClick={() => setActiveTab("records")}
                className={`py-2 px-4 ${
                  activeTab === "records"
                    ? "border-b-2 border-indigo-500 text-indigo-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Medical Records
              </button>
              <button
                onClick={() => setActiveTab("documents")}
                className={`py-2 px-4 ${
                  activeTab === "documents"
                    ? "border-b-2 border-indigo-500 text-indigo-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Documents
              </button>
              <button
                onClick={() => setActiveTab("doctors")}
                className={`py-2 px-4 ${
                  activeTab === "doctors"
                    ? "border-b-2 border-indigo-500 text-indigo-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Doctor Access
              </button>
            </nav>
          </div>

          <div className="bg-gray-100 p-4 rounded shadow-sm">
            {activeTab === "records" && (
              <>
                <h3 className="text-xl font-semibold mb-4 text-gray-800">
                  Medical Records
                </h3>
                {medicalRecords.length === 0 ? (
                  <p className="text-center text-gray-600">
                    No medical records found.
                  </p>
                ) : (
                  <ul className="space-y-4">
                    {medicalRecords
                      .filter((record) => record.recordType !== "document")
                      .map((record, index) => (
                        <li key={index} className="border-b pb-4">
                          <div className="flex justify-between">
                            <p>
                              <strong>Date:</strong> {formatDate(record.date)}
                            </p>
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                record.recordType === "self-reported"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {record.recordType || "Unknown"}
                            </span>
                          </div>
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
                        </li>
                      ))}
                  </ul>
                )}

                <div className="mt-6 bg-white p-4 rounded shadow-md">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">
                    Add Self-Reported Record
                  </h4>
                  <textarea
                    value={newRecordText}
                    onChange={(e) => setNewRecordText(e.target.value)}
                    placeholder="Enter your health update..."
                    className="w-full p-3 border border-gray-300 rounded mb-4"
                    rows={4}
                  />
                  <button
                    onClick={handleAddRecord}
                    className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition"
                  >
                    Add Record
                  </button>
                </div>
              </>
            )}

            {activeTab === "documents" && (
              <>
                <h3 className="text-xl font-semibold mb-4 text-gray-800">
                  Medical Documents
                </h3>

                {/* Document List */}
                {medicalRecords.filter(
                  (record) => record.recordType === "document"
                ).length === 0 ? (
                  <p className="text-center text-gray-600 mb-6">
                    No documents uploaded yet.
                  </p>
                ) : (
                  <ul className="space-y-4 mb-6">
                    {medicalRecords
                      .filter((record) => record.recordType === "document")
                      .map((record, index) => (
                        <li key={index} className="border p-4 rounded bg-white">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-semibold">
                                {record.fileName || "Document"}
                              </p>
                              <p className="text-sm text-gray-600">
                                {formatDate(record.date)}
                              </p>
                              <p className="text-sm text-gray-600">
                                {record.fileSize
                                  ? `${(record.fileSize / 1024).toFixed(2)} KB`
                                  : ""}
                                {record.fileType ? ` • ${record.fileType}` : ""}
                              </p>
                              <p className="mt-2">
                                {record.text || "No description available"}
                              </p>
                            </div>
                            {record.fileHash ? (
                              <a
                                href={`https://gateway.pinata.cloud/ipfs/${record.fileHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded hover:bg-indigo-200 transition"
                              >
                                View
                              </a>
                            ) : (
                              <button
                                onClick={() =>
                                  window.open(
                                    `data:text/plain;charset=utf-8,${encodeURIComponent(
                                      JSON.stringify(record, null, 2)
                                    )}`
                                  )
                                }
                                className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded hover:bg-indigo-200 transition"
                              >
                                View Details
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                  </ul>
                )}

                <div className="bg-white p-4 rounded shadow-md">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">
                    Upload Medical Document
                  </h4>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select File
                    </label>
                    <input
                      type="file"
                      onChange={(e) => setFileUpload(e.target.files[0])}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={fileDescription}
                      onChange={(e) => setFileDescription(e.target.value)}
                      placeholder="Enter document description..."
                      className="w-full p-3 border border-gray-300 rounded"
                      rows={3}
                    />
                  </div>
                  <button
                    onClick={handleFileUpload}
                    disabled={uploadingFile || !fileUpload}
                    className={`w-full px-4 py-2 rounded transition ${
                      uploadingFile || !fileUpload
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-indigo-600 text-white hover:bg-indigo-700"
                    }`}
                  >
                    {uploadingFile ? "Uploading..." : "Upload Document"}
                  </button>
                </div>
              </>
            )}

            {activeTab === "doctors" && (
              <>
                <h3 className="text-xl font-semibold mb-4 text-gray-800">
                  Doctor Access Management
                </h3>

                {/* Authorized Doctors List */}
                {loadingDoctors ? (
                  <p className="text-center text-gray-600">
                    Loading doctors...
                  </p>
                ) : authorizedDoctors.length === 0 ? (
                  <p className="text-center text-gray-600 mb-6">
                    No doctors authorized yet.
                  </p>
                ) : (
                  <div className="mb-6">
                    <h4 className="text-lg font-medium mb-3">
                      Authorized Doctors
                    </h4>
                    <ul className="space-y-4">
                      {authorizedDoctors.map((doctor, index) => (
                        <li
                          key={index}
                          className="border p-4 rounded bg-white flex justify-between items-center"
                        >
                          <div>
                            <p className="font-semibold">{doctor.name}</p>
                            <p className="text-sm text-gray-600">
                              {doctor.specialization}
                            </p>
                            <p className="text-xs text-gray-500">
                              {doctor.address}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRevokeAccess(doctor.address)}
                            className="bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 transition"
                          >
                            Revoke Access
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="bg-white p-4 rounded shadow-md">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">
                    Authorize New Doctor
                  </h4>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Doctor's Wallet Address
                    </label>
                    <input
                      type="text"
                      value={newDoctorAddress}
                      onChange={(e) => setNewDoctorAddress(e.target.value)}
                      placeholder="0x..."
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                  <button
                    onClick={handleGrantAccess}
                    disabled={!newDoctorAddress}
                    className={`w-full px-4 py-2 rounded transition ${
                      !newDoctorAddress
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-indigo-600 text-white hover:bg-indigo-700"
                    }`}
                  >
                    Grant Access
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    Note: Only grant access to doctors you trust. You can revoke
                    access at any time.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
}

export default PatientDashboard;
