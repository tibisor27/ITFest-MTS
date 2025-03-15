contract PatientRegistry {
    address public doctor;

    struct Patient {
        address patientAddress;
        string patientInfo; // Informații suplimentare (ex: nume, descriere etc.)
        uint bloodType; // Grupa sanguină (ex: 0 pentru O+, 1 pentru A+, etc.)
        uint diseaseSeverity; // Gravitatea bolii (1 - 10)
        uint surgicalRisk; // Risc chirurgical (1 - 10)
    }

    mapping(address => Patient) public patients;
    address[] public patientList;

    modifier onlyDoctor() {
        require(msg.sender == doctor, "Only the doctor can add patients");
        _;
    }

    // Modificăm constructorul pentru a primi adresa medicului
    constructor(address _doctor) {
        doctor = _doctor;
    }

    // Funcția pentru adăugarea unui pacient
    function addPatient(
        address patientAddress,
        string memory info,
        uint bloodType,
        uint diseaseSeverity,
        uint surgicalRisk
    ) public onlyDoctor {
        require(
            patients[patientAddress].patientAddress == address(0),
            "Patient already exists"
        );
        patients[patientAddress] = Patient(
            patientAddress,
            info,
            bloodType,
            diseaseSeverity,
            surgicalRisk
        );
        patientList.push(patientAddress);
    }

    function getPatientList() public view returns (address[] memory) {
        return patientList;
    }
}
