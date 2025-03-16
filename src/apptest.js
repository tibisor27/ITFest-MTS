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

  const [decryptedPatientData, setDecryptedPatientData] = useState(null);


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

      const escrow1 = new ethers.Contract(
        config[network.chainId].escrow1.address,
        OrganEscrow,
        provider
      );

      setEscrow(escrow);




  
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