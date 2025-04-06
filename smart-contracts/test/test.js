const { expect } = require("chai");

describe("EHRContract", function () {
  let ehrContract;
  let owner, patient, doctor, otherAccount;
  const patientIpfsHash = "QmPatientDataHash";
  const doctorIpfsHash = "QmDoctorDataHash";
  const medicalRecordHash = "QmMedicalRecordHash";

  beforeEach(async function () {
    [owner, patient, doctor, otherAccount] = await ethers.getSigners();

    const EHRContract = await ethers.getContractFactory("EHRContract");
    ehrContract = await EHRContract.deploy();
  });

  describe("Registration", function () {
    it("Should register a patient", async function () {
      await ehrContract.connect(patient).registerPatient(patientIpfsHash);
      expect(await ehrContract.isPatient(patient.address)).to.equal(true);
    });

    it("Should register a doctor", async function () {
      await ehrContract
        .connect(doctor)
        .registerDoctor(doctorIpfsHash, "Cardiology");
      expect(await ehrContract.isDoctor(doctor.address)).to.equal(true);
    });

    it("Should not allow double registration", async function () {
      await ehrContract.connect(patient).registerPatient(patientIpfsHash);
      await expect(
        ehrContract.connect(patient).registerPatient(patientIpfsHash)
      ).to.be.revertedWith("Patient already registered");
    });
  });

  describe("Medical Records", function () {
    beforeEach(async function () {
      await ehrContract.connect(patient).registerPatient(patientIpfsHash);
      await ehrContract
        .connect(doctor)
        .registerDoctor(doctorIpfsHash, "Cardiology");
    });

    it("Should allow patient to add medical record", async function () {
      await ehrContract
        .connect(patient)
        .addMedicalRecord(patient.address, medicalRecordHash);
      const records = await ehrContract
        .connect(patient)
        .getPatientRecords(patient.address);
      expect(records.length).to.equal(1);
      expect(records[0]).to.equal(medicalRecordHash);
    });

    it("Should allow authorized doctor to add medical record", async function () {
      await ehrContract.connect(patient).grantAccess(doctor.address);
      await ehrContract
        .connect(doctor)
        .addMedicalRecord(patient.address, medicalRecordHash);
      const records = await ehrContract
        .connect(patient)
        .getPatientRecords(patient.address);
      expect(records.length).to.equal(1);
    });

    it("Should not allow unauthorized doctor to add medical record", async function () {
      await expect(
        ehrContract
          .connect(doctor)
          .addMedicalRecord(patient.address, medicalRecordHash)
      ).to.be.revertedWith("Not authorized to access this patient's records");
    });
  });

  describe("Access Control", function () {
    beforeEach(async function () {
      await ehrContract.connect(patient).registerPatient(patientIpfsHash);
      await ehrContract
        .connect(doctor)
        .registerDoctor(doctorIpfsHash, "Cardiology");
    });

    it("Should grant access to doctor", async function () {
      await ehrContract.connect(patient).grantAccess(doctor.address);
      expect(
        await ehrContract.checkAccess(patient.address, doctor.address)
      ).to.equal(true);
    });

    it("Should revoke access from doctor", async function () {
      await ehrContract.connect(patient).grantAccess(doctor.address);
      await ehrContract.connect(patient).revokeAccess(doctor.address);
      expect(
        await ehrContract.checkAccess(patient.address, doctor.address)
      ).to.equal(false);
    });
  });
});
