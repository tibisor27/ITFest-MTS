import { useEffect, useState } from "react";
import { ethers } from "ethers"; // Asigură-te că folosești v5 corect instalat
import logo from "./assets/logo1.png";
import AddOrgan from "./components/AddOrgan";
import { uploadToPinata } from "./utils/pinata";
import CryptoJS from "crypto-js";



// ABIs
import OrganNFT from "./abis/OrganNFT.json";
import OrganEscrow from "./abis/OrganEscrow.json";
import WaitingList from "./abis/WaitingList.json";
import PatientRegistry from './abis/PatientRegistry.json';

// Config
import config from "./config.json";
import Navigation from "./components/Navigation";
import Search from "./components/Search";
import Home from "./components/Home";


const secretKey = "rosibes2712";
function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [organNFT, setOrganNFT] = useState(null);
  const [waitingList, setWaitingList] = useState(null);
  const [escrow, setEscrow] = useState(null);
  const [organs, setOrgans] = useState([]);
  const [organ, setOrgan] = useState([]);
  const [toggle, setToggle] = useState(false);
  const [patientRegistry, setPatientRegistry] = useState(null);
  const [patients, setPatients] = useState([]); // Lista pacienților adăugați
  const [donorAddress, setDonorAddress] = useState(null);
  const [showForm, setShowForm] = useState(false); // Stare pentru a afișa/ascunde formularul
  const [patientData, setPatientData] = useState({
    address: "",
    name: "",
    prenume: "",
    cnp: "",
    organType: "",
    bloodType: "",
    sex: "",
    age: "",
    greutate: "",
    inaltime: "",
    istoricMedical:"",
    deseaseSeverity: "",
    surgicalRisk: "",
    medicalHistory: "",
    
  });
  const [decryptedPatientData, setDecryptedPatientData] = useState(null);
  const [accessRequests, setAccessRequests] = useState([]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPatientData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
    console.log(`Updated ${name}:`, value); // Afișează câmpul actualizat
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Patient Data to be submitted:", patientData); // Afișează datele pacientului
    const { address, ...details } = patientData;
    await addPatientHandler(address, details);
    setShowForm(false);
    setPatientData({ address: "", name: "", bloodType: "", sex: "", age: "" });
  };


  const loadBlockchainData = async () => {
    console.log("🚀 loadBlockchainData called!");
  
    if (!window.ethereum) {
      console.error("❌ MetaMask nu este instalat!");
      return;
    }
  
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const account = await signer.getAddress();
  
      setAccount(account);
      setProvider(provider);
  
      const network = await provider.getNetwork();
      if (!config[network.chainId]) {
        console.error("❌ Chain ID not found in config:", network.chainId);
        return;
      }
  
      window.ethereum.on('accountsChanged', async () => {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const account = ethers.utils.getAddress(accounts[0]);
        setAccount(account);
      });
  
      const organNFTAddress = config[network.chainId]?.organNFT?.address;
      if (!organNFTAddress) {
        console.error("❌ Adresa OrganNFT este undefined! Verifică config.json");
        return;
      }
  
      const organNFT = new ethers.Contract(organNFTAddress, OrganNFT, signer);
      setOrganNFT(organNFT);
  
      const waitingList = new ethers.Contract(
        config[network.chainId].waitingList.address,
        WaitingList,
        provider
      );
  
      // Încarcă ambele contracte OrganEscrow
      const escrowContracts = config[network.chainId].escrow.map(escrowConfig => {
        return new ethers.Contract(escrowConfig.address, OrganEscrow, provider);
      });
      setEscrow(escrowContracts); // Setează un array de contracte
  
      const patientRegistry = new ethers.Contract(
        config[network.chainId].patientRegistry.address,
        PatientRegistry,
        provider
      );
  
      setWaitingList(waitingList);
      setPatientRegistry(patientRegistry);
  
      console.log("📜 Contracte inițializate!");
  
      // Fetch NFTs
      const totalSupply = await organNFT.totalSupply();
      console.log("🏦 Total Supply:", totalSupply.toString());
  
      let fetchedOrgans = [];
      for (let i = 1; i <= totalSupply; i++) {
        const uri = await organNFT.tokenURI(i);
        if (!uri.startsWith("http")) continue;
        try {
          const response = await fetch(uri);
          const metadata = await response.json();
          metadata.escrowAddress = config[network.chainId].escrow[i - 1].address; // Asociază contractul OrganEscrow
          fetchedOrgans.push(metadata);
        } catch (error) {
          console.error("⚠️ Eroare la încărcarea NFT:", error);
        }
      }
      setOrgans(fetchedOrgans);
      console.log("✅ Organs loaded:", fetchedOrgans);
  
      // Load patients
      const patientList = await patientRegistry.getPatientList();
      setPatients(patientList);
      console.log("✅ Patients loaded:", patientList);
  
      await fetchDonorAddress(organNFT);
    } catch (error) {
      console.error("❌ Eroare în loadBlockchainData:", error);
    }
  };
  


  const fetchDonorAddress = async (organNFT) => {
    if (!organNFT) {
      console.error("❌ organNFT nu este inițializat!");
      return;
    }
  
    try {
      const totalSupply = await organNFT.totalSupply();
      console.log("🏦 Total NFT Supply:", totalSupply.toString());
  
      if (totalSupply > 0) {
        const donor = await organNFT.getDonor(1); // 🩸 Donor pentru primul NFT
        setDonorAddress(donor);
        console.log("🎗 Donor Address setat:", donor);
      } else {
        console.warn("⚠️ Nu există NFT-uri, donorAddress rămâne null.");
      }
    } catch (error) {
      console.error("❌ Eroare la obținerea donorului:", error);
    }
  };
  
  const requestAccess = async (patientAddress) => {
    if (!account) {
      alert("Please connect your wallet.");
      return;
    }
  
    try {
      const signer = provider.getSigner();
      const patientRegistryWithSigner = patientRegistry.connect(signer);
  
      const tx = await patientRegistryWithSigner.requestAccess(patientAddress);
      await tx.wait();
  
      alert("Access request sent successfully!");
    } catch (error) {
      console.error("Error requesting access:", error);
      alert("Failed to request access.");
    }
  };

  const approveAccess = async (patientAddress, doctorAddress, approved) => {
    if (!account) {
      alert("Please connect your wallet.");
      return;
    }
  
    try {
      const signer = provider.getSigner();
      const patientRegistryWithSigner = patientRegistry.connect(signer);
  
      // Approve or reject the access request
      const tx = await patientRegistryWithSigner.approveAccess(patientAddress, doctorAddress, approved);
      await tx.wait();
  
      alert(`Access ${approved ? "approved" : "rejected"} successfully!`);
    } catch (error) {
      console.error("Error approving access:", error);
      alert("Failed to approve access.");
    }
  };
  const loadAccessRequests = async (patientAddress) => {
    if (!account || !patientRegistry) {
      console.error("Account or PatientRegistry not initialized.");
      return;
    }
  
    try {
      // Încarcă cererile de acces pentru pacientul curent
      const requests = await patientRegistry.getAccessRequests(patientAddress);
      setAccessRequests(requests);
    } catch (error) {
      console.error("Error loading access requests:", error);
    }
  };



  const AccessRequests = ({ patientAddress }) => {
    const [requests, setRequests] = useState([]);
  
    useEffect(() => {
      const loadRequests = async () => {
        if (patientAddress && patientRegistry) {
          try {
            // Fetch access requests for the patient
            const requests = await patientRegistry.getAccessRequests(patientAddress);
            setRequests(requests);
          } catch (error) {
            console.error("Error loading access requests:", error);
          }
        }
      };
  
      loadRequests();
    }, [patientAddress, patientRegistry]);
  
    return (
      <div className="mt-4">
        <h3 className="text-lg font-bold">Access Requests</h3>
        {requests.length === 0 ? (
          <p>No access requests found.</p>
        ) : (
          <ul>
            {requests.map((request, index) => (
              <li key={index} className="flex items-center space-x-4">
                <p>{`${request.doctorAddress.slice(0, 6)}...${request.doctorAddress.slice(-4)}`}</p>
                <button
                  onClick={() => approveAccess(patientAddress, request.doctorAddress, true)}
                  className="bg-green-500 text-white p-1 rounded-md text-sm"
                >
                  Approve
                </button>
                <button
                  onClick={() => approveAccess(patientAddress, request.doctorAddress, false)}
                  className="bg-red-500 text-white p-1 rounded-md text-sm"
                >
                  Reject
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };
  const encryptData = (data, secret) => {
    return CryptoJS.AES.encrypt(JSON.stringify(data), secret).toString();
  };
  


const addPatientHandler = async (patientAddress, patientInfo) => {
  if (!account) {
    alert("Please connect your wallet.");
    return;
  }

  const doctorAddress = await patientRegistry.doctor();
  if (account !== doctorAddress) {
    alert("Only the doctor can add patients.");
    return;
  }

  if (!ethers.utils.isAddress(patientAddress)) {
    alert("Invalid address.");
    return;
  }

  try {
    const encryptedPatientInfo = encryptData(patientInfo, secretKey);

    const signer = provider.getSigner();
    const patientRegistryWithSigner = patientRegistry.connect(signer);

    const tx = await patientRegistryWithSigner.addPatient(patientAddress, encryptedPatientInfo);
    console.log("adresa pacient:", patientAddress);
    console.log("patiennt info:", patientInfo);
    console.log("patiennt data:", patientData);
    console.log("ecnrypted patient info:", encryptedPatientInfo);

    await tx.wait(); // 🔥 Așteptăm confirmarea tranzacției
    alert(`Patient ${patientAddress} added successfully`);

    // 🛠 Reîncarcă lista de pacienți după adăugare
    const updatedPatients = await patientRegistry.getPatientList();
    setPatients(updatedPatients); // 🔥 Actualizează starea cu noua listă de pacienți
  } catch (error) {
    console.error("Error adding patient:", error);
    alert("Failed to add patient.");
  }
};

const decryptData = (encryptedData, secret) => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, secret);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  } catch (error) {
    console.error("Decryption failed:", error);
    return null;
  }
};

// Exemplu de utilizare pentru a afișa detaliile pacientului
const fetchPatientData = async (patientAddress) => {
  if (!account) {
    alert("Please connect your wallet.");
    return;
  }

  try {
    // Check if the current account has access to the patient's data
    const hasAccess = await patientRegistry.hasAccess(account, patientAddress);
    if (!hasAccess) {
      alert("You do not have access to this patient's data. Please request access.");
      return;
    }

    // Prompt for the secret key
    const userInputKey = prompt("Enter the secret key to view details:");
    if (userInputKey !== secretKey) {
      alert("Incorrect secret key!");
      return;
    }

    // Fetch and decrypt patient data
    const patient = await patientRegistry.patients(patientAddress);
    const decryptedData = decryptData(patient.patientInfo, secretKey);

    if (decryptedData) {
      setDecryptedPatientData(decryptedData);
      console.log("Decrypted Patient Data:", decryptedData);
    } else {
      alert("Failed to decrypt patient data.");
    }
  } catch (error) {
    console.error("Error fetching patient data:", error);
    alert("Failed to fetch patient data.");
  }
};


const isBloodTypeCompatible = (patientBloodType, donorBloodType) => {
  const compatibilityMap = {
    'A+': ['A+', 'A-', 'O+', 'O-'],
    'A-': ['A-', 'O-'],
    'B+': ['B+', 'B-', 'O+', 'O-'],
    'B-': ['B-', 'O-'],
    'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    'AB-': ['A-', 'B-', 'AB-', 'O-'],
    'O+': ['O+', 'O-'],
    'O-': ['O-'],
  };

  return compatibilityMap[patientBloodType].includes(donorBloodType);
};

const findMatchingPatientForOrgan = async (organNFT) => {
  if (!patientRegistry) {
    console.error("❌ Contractul PatientRegistry nu este inițializat!");
    return null;
  }

  try {
    const patientList = await patientRegistry.getPatientList();
    
    for (const patientAddress of patientList) {
      const patient = await patientRegistry.patients(patientAddress);
      const decryptedData = decryptData(patient.patientInfo, secretKey);

      // Verifică dacă organType și grupa sanguină sunt compatibile
      if (
        decryptedData &&
        decryptedData.organType.toLowerCase() === organNFT.organ.toLowerCase() &&
        isBloodTypeCompatible(decryptedData.bloodType, organNFT.bloodType)
      ) {
        console.log("✅ Pacient găsit care are nevoie de organul:", organNFT.organ);
        return { address: patientAddress, ...decryptedData };
      }
    }

    console.warn("⚠️ Niciun pacient potrivit găsit.");
    return null;
  } catch (error) {
    console.error("❌ Eroare la căutarea pacientului:", error);
    return null;
  }
};



  useEffect(() => {
    loadBlockchainData();
  }, []);

  const togglePop = (home) => {
    setOrgan(home);
    setToggle(!toggle);
  };

  return (
    <div>
      
      <Navigation account={account} setAccount={setAccount} />
 

      <div className="p-7 flex flex-col gap-y-6 items-center">

      
      {/* Buton pentru a adăuga pacienti */}
      {account && (
  <div>
  <button
    onClick={() => setShowForm(true)}
    className="bg-green-500 text-white p-2 rounded-md mb-5 mt-5"
  >
    Add Patient
  </button>

  {showForm && (
    <div className="mt-4 p-4 border rounded-lg bg-gray-100">
      <h3 className="text-lg font-bold mb-4">Add New Patient</h3>
      <form onSubmit={handleSubmit}>
        {/* Container pentru două coloane */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Coloana 1 */}
          <div>
            {/* Adresa pacientului */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Patient Address</label>
              <input
                type="text"
                name="address"
                value={patientData.address}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
                placeholder="Enter patient's address"
                required
              />
            </div>

            {/* Numele pacientului */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                name="name"
                value={patientData.name}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
                placeholder="Enter patient's name"
                required
              />
            </div>

            {/* Prenumele pacientului */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Prenume</label>
              <input
                type="text"
                name="prenume"
                value={patientData.prenume}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
                placeholder="Enter patient's first name"
                required
              />
            </div>

            {/* CNP-ul pacientului */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">CNP</label>
              <input
                type="text"
                name="cnp"
                value={patientData.cnp}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
                placeholder="Enter patient's CNP"
                required
              />
            </div>

            {/* Grupa sanguină */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Blood Type</label>
              <select
                name="bloodType"
                value={patientData.bloodType}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
                required
              >
                <option value="">Select blood type</option>
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

            {/* Sexul pacientului */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Sex</label>
              <select
                name="sex"
                value={patientData.sex}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
                required
              >
                <option value="">Select sex</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Coloana 2 */}
          <div>
            {/* Vârsta pacientului */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Age</label>
              <input
                type="number"
                name="age"
                value={patientData.age}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
                placeholder="Enter patient's age"
                required
              />
            </div>

            {/* Greutatea pacientului */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Greutate</label>
              <input
                type="text"
                name="greutate"
                value={patientData.greutate}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
                placeholder="Enter patient's weight"
                required
              />
            </div>

            {/* Înălțimea pacientului */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Inaltime</label>
              <input
                type="text"
                name="inaltime"
                value={patientData.inaltime}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
                placeholder="Enter patient's height"
                required
              />
            </div>

            {/* Tipul organului necesar */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Organ</label>
              <input
                type="text"
                name="organType"
                value={patientData.organType}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
                placeholder="Enter patient's organ type"
                required
              />
            </div>

            {/* Risc chirurgical */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Surgical Risk</label>
              <select
                name="surgicalRisk"
                value={patientData.surgicalRisk}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
                required
              >
                <option value="">Select risk level</option>
                <option value="Low">Low</option>
                <option value="Moderate">Moderate</option>
                <option value="High">High</option>
              </select>
            </div>

            {/* Gravitatea bolii */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Disease Severity</label>
              <select
                name="diseaseSeverity"
                value={patientData.diseaseSeverity}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
                required
              >
                <option value="">Select severity</option>
                <option value="Mild">Mild</option>
                <option value="Moderate">Moderate</option>
                <option value="Severe">Severe</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>
        </div>

        {/* Istoric medical (ocupă întreaga lățime) */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Medical History</label>
          <textarea
            name="medicalHistory"
            value={patientData.medicalHistory}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-md"
            placeholder="Enter patient's medical history"
            rows="3"
            required
          ></textarea>
        </div>

        {/* Butoane pentru trimitere și anulare */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="mr-2 bg-gray-500 text-white p-2 rounded-md"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-green-500 text-white p-2 rounded-md"
          >
            Add Patient
          </button>
        </div>
      </form>
    </div>
  )}
</div>
      )}

      
<div className="flex">
<div className="mt-5 p-5 ">
  <h3 className="text-xl font-bold">Patients List</h3>
  <ul className="list-disc mt-2">
    {patients.length === 0 ? (
      <li>No patients added yet.</li>
    ) : (
      patients.map((patientAddress, index) => (
        <li key={index} className="flex items-center space-x-4 p-2 ">
          <p>{`${patientAddress.slice(0, 6)}...${patientAddress.slice(-4)}`}</p>
          <div className="p-2 ml-2">

          <button
            onClick={() => fetchPatientData(patientAddress)}
            className="bg-blue-500 text-white p-1 rounded-md text-sm ml-4"
          >
            View Details
          </button>
          </div>
          <button
            onClick={() => requestAccess(patientAddress)}
            className="bg-green-500 text-white p-1 rounded-md text-sm"
          >
            Request Access
          </button>
        </li>
      ))
    )}
  </ul>

  {/* Afișează cererile de acces pentru pacientul curent */}
  {account && patients.includes(account) && (
  <AccessRequests patientAddress={account} />
)}

  {/* Afișează datele decriptate ale pacientului */}
  {/* <button
    onClick={async () => {
      const foundPatient = await findPatientByCriteria({ bloodType: "B+" });
      if (foundPatient) {
        alert(`Pacient găsit: ${foundPatient.name}, Adresă: ${foundPatient.address}`);
      } else {
        alert("Nu s-a găsit niciun pacient cu B+.");
      }
    }}
    className="bg-red-500 text-white p-2 rounded-md"
  >
    Find First B+ Patient
  </button> */}
  {decryptedPatientData && (
    <div className="mt-4 p-4 border rounded-lg bg-gray-100">
      <h3 className="text-lg font-bold mb-2">Patient Details</h3>
      <p><strong>Name:</strong> {decryptedPatientData.name}</p>
      <p><strong>First Name:</strong> {decryptedPatientData.prenume}</p>
      <p><strong>Blood Type:</strong> {decryptedPatientData.bloodType}</p>
      <p><strong>CNP:</strong> {decryptedPatientData.cnp}</p>
      <p><strong>Sex:</strong> {decryptedPatientData.sex}</p>
      <p><strong>Age:</strong> {decryptedPatientData.age}</p>
      <p><strong>Weight:</strong> {decryptedPatientData.inaltime}</p>
      <p><strong>Weight:</strong> {decryptedPatientData.greutate}</p>
      <p><strong>Organ Needen:</strong> {decryptedPatientData.organType}</p>
      <p><strong>surgicalRisk:</strong> {decryptedPatientData.surgicalRisk}</p>
      <p><strong>diseaseSeverity:</strong> {decryptedPatientData.diseaseSeverity}</p>
      <p><strong>istoricMedical:</strong> {decryptedPatientData.medicalHistory}</p>

    </div>
  )}
</div>


  <div className="p-7 flex flex-col gap-y-6 items-center ">
  <p className="text-4xl font-bold mb-5">Organs Ready for Transplant</p>
  <div className="flex justify-center space-x-5 p-1">
    {!organs.length ? (
      <p>Loading...</p>
    ) : (
      organs.map((organ, index) => (
        organ && organ.attributes ? (
          <div key={index} className="rounded-lg shadow-xl" onClick={() => togglePop(organ)}>
            <div>
              <img src={organ.image || "fallback.jpg"} className="w-[350px] h-auto rounded-t-lg" />
            </div>
            <div className="p-3">
              <p><strong>Organ:</strong> {organ.organ || "N/A"}</p>
              <p><strong>Blood Type:</strong> {organ.bloodType || organ.attributes?.find(attr => attr.trait_type === "Blood Type")?.value || "N/A"}</p>
              <p><strong>Description:</strong> {organ.description || "No description"}</p>
              
              {/* Afișează toate atributele disponibile */}
              <div className="mt-2">
                <strong>Attributes:</strong>
                <ul>
                  {organ.attributes.map((attr, i) => (
                    <li key={i}>{attr.trait_type}: {attr.value}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : null
      ))
    )}
  </div>
</div>
</div>


      </div>

      {toggle && (
  <Home 
    organ={organ}  
    provider={provider} 
    account={account} 
    selectedEscrow={escrow.find(e => e.address === organ.escrowAddress)} // Găsește contractul corect
    togglePop={togglePop} 
    findMatchingPatientForOrgan={findMatchingPatientForOrgan}
  />
)}


    </div>
  );
}

export default App;