// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EHRContract {
    struct Patient {
        string dataIPFSHash;
        string[] medicalRecords;
        mapping(address => bool) authorizedDoctors;
        bool exists;
    }
    
    struct Doctor {
        string dataIPFSHash;
        string specialization;
        address[] patients;
        bool exists;
    }
    
    mapping(address => Patient) private patients;
    mapping(address => Doctor) private doctors;
    address[] private patientAddresses;
    address[] private doctorAddresses;
    
    // Events
    event PatientRegistered(address indexed patientAddress);
    event DoctorRegistered(address indexed doctorAddress);
    event MedicalRecordAdded(address indexed patientAddress, string ipfsHash);
    event AccessGranted(address indexed patientAddress, address indexed doctorAddress);
    event AccessRevoked(address indexed patientAddress, address indexed doctorAddress);
    
    // Modifiers
    modifier onlyPatient() {
        require(patients[msg.sender].exists, "Only registered patients can call this function");
        _;
    }
    
    modifier onlyDoctor() {
        require(doctors[msg.sender].exists, "Only registered doctors can call this function");
        _;
    }
    
    modifier authorizedForPatient(address patientAddress) {
        require(
            msg.sender == patientAddress || patients[patientAddress].authorizedDoctors[msg.sender],
            "Not authorized to access this patient's records"
        );
        _;
    }
    
    // Registration functions
    function registerPatient(string memory _dataIPFSHash) public {
        require(!patients[msg.sender].exists, "Patient already registered");
        require(!doctors[msg.sender].exists, "Address already registered as doctor");
        
        Patient storage newPatient = patients[msg.sender];
        newPatient.dataIPFSHash = _dataIPFSHash;
        newPatient.exists = true;
        
        patientAddresses.push(msg.sender);
        
        emit PatientRegistered(msg.sender);
    }
    
    function registerDoctor(string memory _dataIPFSHash, string memory _specialization) public {
        require(!doctors[msg.sender].exists, "Doctor already registered");
        require(!patients[msg.sender].exists, "Address already registered as patient");
        
        Doctor storage newDoctor = doctors[msg.sender];
        newDoctor.dataIPFSHash = _dataIPFSHash;
        newDoctor.specialization = _specialization;
        newDoctor.exists = true;
        
        doctorAddresses.push(msg.sender);
        
        emit DoctorRegistered(msg.sender);
    }
    
    // Medical record functions
    function addMedicalRecord(address patientAddress, string memory ipfsHash) public authorizedForPatient(patientAddress) {
        require(patients[patientAddress].exists, "Patient does not exist");
        
        patients[patientAddress].medicalRecords.push(ipfsHash);
        
        emit MedicalRecordAdded(patientAddress, ipfsHash);
    }
    
    // Access control functions
    function grantAccess(address doctorAddress) public onlyPatient {
        require(doctors[doctorAddress].exists, "Doctor does not exist");
        
        patients[msg.sender].authorizedDoctors[doctorAddress] = true;
        
        // Add patient to doctor's list if not already there
        bool patientExists = false;
        for (uint i = 0; i < doctors[doctorAddress].patients.length; i++) {
            if (doctors[doctorAddress].patients[i] == msg.sender) {
                patientExists = true;
                break;
            }
        }
        
        if (!patientExists) {
            doctors[doctorAddress].patients.push(msg.sender);
        }
        
        emit AccessGranted(msg.sender, doctorAddress);
    }
    
    function revokeAccess(address doctorAddress) public onlyPatient {
        require(doctors[doctorAddress].exists, "Doctor does not exist");
        
        patients[msg.sender].authorizedDoctors[doctorAddress] = false;
        
        // Remove patient from doctor's list
        for (uint i = 0; i < doctors[doctorAddress].patients.length; i++) {
            if (doctors[doctorAddress].patients[i] == msg.sender) {
                // Replace with last element and pop
                doctors[doctorAddress].patients[i] = doctors[doctorAddress].patients[doctors[doctorAddress].patients.length - 1];
                doctors[doctorAddress].patients.pop();
                break;
            }
        }
        
        emit AccessRevoked(msg.sender, doctorAddress);
    }
    
    // View functions
    function isPatient(address addr) public view returns (bool) {
        return patients[addr].exists;
    }
    
    function isDoctor(address addr) public view returns (bool) {
        return doctors[addr].exists;
    }
    
    function getPatientData(address patientAddress) public view authorizedForPatient(patientAddress) returns (string memory) {
        require(patients[patientAddress].exists, "Patient does not exist");
        return patients[patientAddress].dataIPFSHash;
    }
    
    function getDoctorData(address doctorAddress) public view returns (string memory) {
        require(doctors[doctorAddress].exists, "Doctor does not exist");
        return doctors[doctorAddress].dataIPFSHash;
    }
    
    function getPatientRecords(address patientAddress) public view authorizedForPatient(patientAddress) returns (string[] memory) {
        require(patients[patientAddress].exists, "Patient does not exist");
        return patients[patientAddress].medicalRecords;
    }
    
    function getDoctorPatients(address doctorAddress) public view returns (address[] memory) {
        require(doctors[doctorAddress].exists, "Doctor does not exist");
        require(
            msg.sender == doctorAddress,
            "Only the doctor can access their patient list"
        );
        
        return doctors[doctorAddress].patients;
    }
    
    function checkAccess(address patientAddress, address doctorAddress) public view returns (bool) {
        require(patients[patientAddress].exists, "Patient does not exist");
        require(doctors[doctorAddress].exists, "Doctor does not exist");
        
        return patients[patientAddress].authorizedDoctors[doctorAddress];
    }

    function getAuthorizedDoctors(address patientAddress) public view returns (address[] memory) {
        require(patients[patientAddress].exists, "Patient does not exist");
        require(
            msg.sender == patientAddress || patients[patientAddress].authorizedDoctors[msg.sender],
            "Not authorized to access this information"
        );
    
        // Count authorized doctors first
        uint count = 0;
        for (uint i = 0; i < doctorAddresses.length; i++) {
            if (patients[patientAddress].authorizedDoctors[doctorAddresses[i]]) {
                count++;
            }
        }
    
        // Create and fill the array
        address[] memory authorizedDocs = new address[](count);
        uint index = 0;
        for (uint i = 0; i < doctorAddresses.length; i++) {
            if (patients[patientAddress].authorizedDoctors[doctorAddresses[i]]) {
                authorizedDocs[index] = doctorAddresses[i];
                index++;
            }
        }
    
        return authorizedDocs;
    }

}