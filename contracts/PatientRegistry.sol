// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract PatientRegistry {
    address public doctor;

    struct Patient {
        address patientAddress;
        string patientInfo;
    }

    mapping(address => Patient) public patients;
    address[] public patientList;

    // Struct to store access requests
    struct AccessRequest {
        address doctorAddress;
        bool approved;
    }

    // Mapping to store access requests for each patient
    mapping(address => AccessRequest[]) public patientAccessRequests;

    modifier onlyDoctor() {
        require(msg.sender == doctor, "Only the doctor can add patients");
        _;
    }

    modifier onlyPatient() {
        require(patients[msg.sender].patientAddress != address(0), "Only patients can perform this action");
        _;
    }

    constructor(address _doctor) {
        doctor = _doctor;
    }

    // Add a new patient
    function addPatient(address patientAddress, string memory info) public onlyDoctor {
        require(patients[patientAddress].patientAddress == address(0), "Patient already exists");
        patients[patientAddress] = Patient(patientAddress, info);
        patientList.push(patientAddress);
    }

    // Get the list of patients
    function getPatientList() public view returns (address[] memory) {
        return patientList;
    }

    // Request access to a patient's data
    function requestAccess(address patientAddress) public {
        require(msg.sender != patientAddress, "Cannot request access to your own data");
        require(patients[patientAddress].patientAddress != address(0), "Patient does not exist");
        
        // Add the access request
        patientAccessRequests[patientAddress].push(AccessRequest({
            doctorAddress: msg.sender,
            approved: false
        }));
    }

    // Approve or reject access
    function approveAccess(address patientAddress, address doctorAddress, bool approved) public onlyPatient {
        require(patients[patientAddress].patientAddress != address(0), "Patient does not exist");

        // Find and update the access request
        for (uint i = 0; i < patientAccessRequests[patientAddress].length; i++) {
            if (patientAccessRequests[patientAddress][i].doctorAddress == doctorAddress) {
                patientAccessRequests[patientAddress][i].approved = approved;
                break;
            }
        }
    }

    // Get access requests for a patient
    function getAccessRequests(address patientAddress) public view returns (AccessRequest[] memory) {
        return patientAccessRequests[patientAddress];
    }

    // Check if a doctor has access to a patient's data
    function hasAccess(address doctorAddress, address patientAddress) public view returns (bool) {
        for (uint i = 0; i < patientAccessRequests[patientAddress].length; i++) {
            if (patientAccessRequests[patientAddress][i].doctorAddress == doctorAddress && patientAccessRequests[patientAddress][i].approved) {
                return true;
            }
        }
        return false;
    }
}