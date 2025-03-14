pragma solidity ^0.8.0;

import "./OrganNFT.sol";  // Importăm contractul OrganNFT

contract OrganEscrow {
    address public donor;
    address public patient;
    address public doctor;
    uint256 public organNFT;
    bool public doctorApproved;

    OrganNFT public organNFTContract;

    // Constructor corect
    constructor(address _donor, uint256 _organNFT, address _organNFTContract, address _doctor) {
        donor = _donor;
        organNFT = _organNFT;  // Setează ID-ul NFT-ului
        organNFTContract = OrganNFT(_organNFTContract); // Setează adresa contractului OrganNFT
        doctor = _doctor;
        doctorApproved = false; // Inițial nu este aprobat
    }

    // Funcția pentru a seta pacientul
    function setPatient(address _patient) external {
        require(msg.sender == donor, "Only donor can set the patient");
        patient = _patient;  // Setează pacientul în contract
    }

    // Funcția care permite medicului să aprobe transplantul
    function approveTransplant() external {
        require(msg.sender == doctor, "Only doctor can approve the transplant");
        doctorApproved = true;
    }

    // Funcția care transferă organul (NFT-ul) către pacient
    function transferOrgan() external {
        require(doctorApproved, "Doctor must approve the transplant first");
        require(msg.sender == donor, "Only donor can transfer organ");

        // Verificăm că NFT-ul cu ID-ul organNFT există
        require(organNFTContract.ownerOf(organNFT) != address(0), "NFT does not exist");

        // Transferă organul (NFT-ul) către pacient
        organNFTContract.safeTransferFrom(donor, patient, organNFT);
    }

    function getOrganID() external view returns (uint256) {
    return organNFT;
}

function getOwners() external view returns (address currentOwner, address futureOwner) {
    currentOwner = organNFTContract.ownerOf(organNFT); // Proprietarul actual al NFT-ului
    futureOwner = patient; // Viitorul proprietar
}


}