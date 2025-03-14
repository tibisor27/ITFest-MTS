// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract WaitingList {
    address[] public patients;

    // Adaugă pacientul la lista de așteptare
    function addPatient(address patient) external {
        patients.push(patient);
    }

    // Returnează lista de pacienți
    function getPatients() external view returns (address[] memory) {
        return patients;
    }

    // Selectează aleatoriu un pacient din lista de așteptare
    function selectRandomPatient() external view returns (address) {
        require(patients.length > 0, "No patients in waiting list");
        uint256 randomIndex = uint256(
            keccak256(abi.encodePacked(block.timestamp))
        ) % patients.length;
        return patients[randomIndex];
    }
}
