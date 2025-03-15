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
    bloodType: "",
    sex: "",
    age: "",
  });
  const [decryptedPatientData, setDecryptedPatientData] = useState(null);

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
  
      window.ethereum.on('accountsChanged', async() => {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const account = ethers.utils.getAddress(accounts[0])
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
  
      const escrow = new ethers.Contract(
        config[network.chainId].escrow.address,
        OrganEscrow,
        provider
      );
  
      const patientRegistry = new ethers.Contract(
        config[network.chainId].patientRegistry.address,
        PatientRegistry,
        provider
      );
  
      setWaitingList(waitingList);
      setEscrow(escrow);
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
  
      // 🔥 Apelează fetchDonorAddress DOAR după ce organNFT este setat!
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
    console.log("adresa pacient:", patientAddress)
    console.log("patiennt info:", patientInfo)
    console.log("patiennt data:", patientData)
    console.log("ecnrypted patient info:", encryptedPatientInfo)

    await tx.wait(); // 🔥 Așteptăm confirmarea tranzacției
    alert(`Patient ${patientAddress} added successfully`);

    // 🛠 Actualizăm manual lista pacienților
    const updatedPatients = await patientRegistry.getPatientList();
    setPatients(updatedPatients); // 🔥 Acum pacienții sunt actualizați în interfață
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
  const userInputKey = prompt("Enter the secret key to view details:");

  if (userInputKey !== secretKey) {
    alert("Incorrect secret key!");
    return;
  }

  try {
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
  }
};



const findPatientByCriteria = async (criteria) => {
  if (!patientRegistry) {
    console.error("❌ Contractul PatientRegistry nu este inițializat!");
    return null;
  }

  try {
    const patientList = await patientRegistry.getPatientList();
    
    for (const patientAddress of patientList) {
      const patient = await patientRegistry.patients(patientAddress);
      const decryptedData = decryptData(patient.patientInfo, secretKey);

      if (decryptedData && decryptedData.bloodType === criteria.bloodType) {
        console.log("✅ Pacient găsit:", decryptedData);
        return { address: patientAddress, ...decryptedData };
      }
    }

    console.warn("⚠️ Niciun pacient nu corespunde criteriului.");
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
      <Search />

      <div className="p-7 flex flex-col gap-y-6 items-center">
  <p className="text-4xl font-bold">Organs For You</p>



{account && organNFT && (
  <div className="mt-5">
    <h3 className="text-xl font-bold">Donate an Organ</h3>
    <AddOrgan organNFT={organNFT} provider={provider} account={account} donorAddress={donorAddress} />
  </div>
)}


      
      {/* Buton pentru a adăuga pacienti */}
      {account && (
  <div>
    <button
      onClick={() => setShowForm(true)}
      className="bg-green-500 text-white p-2 rounded-md"
    >
      Add Patient
    </button>

    {showForm && (
  <div className="mt-4 p-4 border rounded-lg bg-gray-100">
    <h3 className="text-lg font-bold mb-2">Add New Patient</h3>
    <form onSubmit={handleSubmit}>
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

      

<div className="mt-5">
  <h3 className="text-xl font-bold">Patients List</h3>
  <ul className="list-disc mt-2">
    {patients.length === 0 ? (
      <li>No patients added yet.</li>
    ) : (
      patients.map((patientAddress, index) => (
        <li key={index} className="flex items-center space-x-4">
          <p>{`${patientAddress.slice(0, 6)}...${patientAddress.slice(-4)}`}</p>
          <button
            onClick={() => fetchPatientData(patientAddress)}
            className="bg-blue-500 text-white p-1 rounded-md text-sm"
          >
            View Details
          </button>
        </li>
      ))
    )}
  </ul>

  {/* Afișează datele decriptate ale pacientului */}
  <button
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
  </button>
  {decryptedPatientData && (
    <div className="mt-4 p-4 border rounded-lg bg-gray-100">

      <h3 className="text-lg font-bold mb-2">Patient Details</h3>
      <p><strong>Name:</strong> {decryptedPatientData.name}</p>
      <p><strong>Blood Type:</strong> {decryptedPatientData.bloodType}</p>
      <p><strong>Sex:</strong> {decryptedPatientData.sex}</p>
      <p><strong>Age:</strong> {decryptedPatientData.age}</p>
    </div>
  )}
</div>


  <div className="p-7 flex flex-col gap-y-6 items-center">
  <p className="text-4xl font-bold">Organs For You</p>
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
              <p><strong>Blood Type:</strong> {organ.BloodType || organ.attributes?.find(attr => attr.trait_type === "Blood Type")?.value || "N/A"}</p>
              <p><strong>Description:</strong> {organ.description || "No description"}</p>
              <p><strong>ID:</strong> {organ.id}</p>
              
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

{toggle && (
  <Home 
    organ={organ}  
    provider={provider} 
    account={account} 
    escrow={escrow} 
    togglePop={togglePop} 
    organs={organs} 
    findPatientByCriteria={findPatientByCriteria} // 🔥 Adăugat aici!
  />
)}


    </div>
  );
}

export default App;