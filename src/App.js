import { useEffect, useState } from "react";
import { ethers } from "ethers"; // Asigură-te că folosești v5 corect instalat
import logo from "./assets/logo1.png";
import AddOrgan from "./components/AddOrgan";
import { uploadToPinata } from "./utils/pinata";
import { AES } from "crypto-js";


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
      console.log("🔑 Conectat cu adresa:", account);
  
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
  
      // Load patients cu informatii
      const patientList = await patientRegistry.getPatientList();
      setPatients(patientList);
      console.log("✅ Patients loaded:", patientList);
      const patientDataPromises = patientList.map(async (address) => {
        const patient = await patientRegistry.patients(address);
        return {
          address: address,
          info: patient.patientInfo,
          bloodType: patient.bloodType,
          diseaseSeverity: patient.diseaseSeverity,
          surgicalRisk: patient.surgicalRisk,
        };
      });
      const allPatientData = await Promise.all(patientDataPromises);

      console.log("All Patient Data:", allPatientData);
      return allPatientData;
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
  


const addPatientHandler = async () => {
  if (!account) {
    alert("Please connect your wallet.");
    return;
  }

  const doctorAddress = await patientRegistry.doctor();
  if (account !== doctorAddress) {
    alert("Only the doctor can add patients.");
    return;
  }

  const patientAddress = prompt("Enter patient's address:");
  if (!ethers.utils.isAddress(patientAddress)) {
    alert("Invalid address.");
    return;
  }

  const patientInfo = prompt("Enter patient information:");
  const bloodType = prompt("Enter patient bloodType:");
  const diseaseSeverity = prompt("Enter patient diseaseSeverity:");
  const surgicalRisk = prompt("Enter patient surgicalRisk:");

    console.log("Original Data:");
  console.log("Patient Info:", patientInfo);
  console.log("Blood Type:", bloodType);
  console.log("Disease Severity:", diseaseSeverity);
  console.log("Surgical Risk:", surgicalRisk);
    const secretKey = "your-secret-key";  // Cheia secretă folosită pentru criptare
  const encryptedInfo = AES.encrypt(patientInfo, secretKey).toString();  // Criptăm info pacientului
  const encryptedBloodType = AES.encrypt(bloodType, secretKey).toString();  // Criptăm bloodType
  const encryptedDiseaseSeverity = AES.encrypt(diseaseSeverity, secretKey).toString();  // Criptăm diseaseSeverity
  const encryptedSurgicalRisk = AES.encrypt(surgicalRisk, secretKey).toString();  // Criptăm surgicalRisk
  console.log("Encrypted Info:", encryptedInfo);


  try {
    const signer = provider.getSigner();
    const patientRegistryWithSigner = patientRegistry.connect(signer);
    console.log("patientRegistryWithSigner!!!!", patientRegistryWithSigner.address);
    const tx = await patientRegistryWithSigner.addPatient(patientAddress, encryptedInfo,bloodType,diseaseSeverity,surgicalRisk);
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
            onClick={addPatientHandler}
            className="bg-green-500 text-white p-2 rounded-md"
          >
            Add Patient
          </button>

          

        </div>
      )}

      

<div className="mt-5">
    <h3 className="text-xl font-bold">Patients List</h3>
    <ul className="list-disc mt-2">
      {patients.length === 0 ? (
        <li>No patients added yet.</li>
      ) : (
        patients.map((patientAddress, index) => (
          <li key={index}>
            <p>{`${patientAddress.slice(0, 6)}...${patientAddress.slice(-4)}`}</p>
          </li>
        ))
      )}
    </ul>
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
        <Home organ={organ} provider={provider} account={account} escrow={escrow} togglePop={togglePop} />
      )}
    </div>
  );
}

export default App;