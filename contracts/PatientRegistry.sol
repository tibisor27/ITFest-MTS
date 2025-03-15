contract PatientRegistry {
    address public doctor;

    struct Patient {
        address patientAddress;
        string patientInfo;
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

  function addPatient(
        address patientAddress,
        string memory info
    ) public onlyDoctor {
        require(
            patients[patientAddress].patientAddress == address(0),
            "Patient already exists"
        );
        patients[patientAddress] = Patient(patientAddress, info);
        patientList.push(patientAddress);
    }

    function getPatientList() public view returns (address[] memory) {
        return patientList;
    }
}
