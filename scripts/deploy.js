const hre = require("hardhat"); // ✅ Import corect

async function main() {
  const [donor, doctor, donor2, pacient] = await hre.ethers.getSigners();
  console.log("Doctor Address: ", doctor.address); // Asigură-te că aceasta este adresa medicului

  

  // Deploy OrganNFT Contract
  const OrganNFT = await hre.ethers.getContractFactory("OrganNFT");
  const organNFT = await OrganNFT.deploy();
  await organNFT.deployed();
  console.log(`Deployed OrganNFT Contract at: ${organNFT.address}`);

  // Deploy WaitingList Contract
  const WaitingList = await hre.ethers.getContractFactory("WaitingList");
  const waitingList = await WaitingList.deploy();
  await waitingList.deployed();
  console.log(`Deployed WaitingList Contract at: ${waitingList.address}`);

  // Deploy PatientRegistry Contract
// Deploy PatientRegistry Contract cu adresa medicului (doctor.address)
const PatientRegistry = await hre.ethers.getContractFactory("PatientRegistry");
const patientRegistry = await PatientRegistry.deploy(doctor.address);  // Aici treci adresa medicului
await patientRegistry.deployed();
console.log(`Deployed PatientRegistry Contract at: ${patientRegistry.address}`);


  // Medicul (doctor) poate adăuga pacientul la registru
// Înainte de a adăuga pacientul, verifică dacă adresa este doctor
// Verifică dacă adresa medicului din contract este aceeași cu adresa care semnează tranzacția
const doctorFromContract = await patientRegistry.doctor();
console.log("Doctor from contract:", doctorFromContract);

// Verifică dacă adresa medicului din contract este aceeași cu adresa care semnează tranzacția
if (doctor.address !== doctorFromContract) {
    console.error("Adresa medicului nu este corectă.");
    return;
}


// const addPatientTx = await patientRegistry.connect(doctor).addPatient(patient.address, "Patient Info Here");
// await addPatientTx.wait();
// console.log(`✅ Patient ${patient.address} added to registry`);




  console.log("Minting organ NFT...");

  // const mintTx = await organNFT.connect(donor).mintOrganNFT(
  //   "https://ipfs.io/ipfs/bafkreieuvaq5m4ckzha6y43wsgrg7laf3hrqb2bmgyhl3gtqtqjbalzi3e"
  // );

  const mintTx = await organNFT.connect(donor).mintOrganNFT(
    "https://ipfs.io/ipfs/bafkreicz3nnxkuvj7vaxaotzpun7mfzunv2adt6mc6udhgvugkkwyyhvoy"
  );
  
  const mintReceipt = await mintTx.wait();
  const nftId = mintReceipt.events[0].args.tokenId.toNumber(); // Extragem ID-ul NFT-ului

  console.log(`✅ Minted Organ NFT with ID: ${nftId}`);

  const mintTx2 = await organNFT.connect(donor2).mintOrganNFT(
    "https://ipfs.io/ipfs/bafkreidrw56d4o7n7typlfnv3o5f6znybsldudmyzul46plnlong3zpb3a" // URI pentru al doilea organ
  );
  const mintReceipt2 = await mintTx2.wait();
  const nftId2 = mintReceipt2.events[0].args.tokenId.toNumber(); // ID-ul celui de-al doilea NFT
  console.log(`✅ Minted second Organ NFT with ID: ${nftId2}`);

  // Deploy OrganEscrow Contract cu ID-ul corect al NFT-ului
  const OrganEscrow = await hre.ethers.getContractFactory("OrganEscrow");
  const organEscrow = await OrganEscrow.deploy(
    donor.address,
    nftId, // Folosim ID-ul obținut din mintTx
    organNFT.address,
    doctor.address
  );

  await organEscrow.deployed();
  console.log(`Deployed OrganEscrow Contract at: ${organEscrow.address}`);

  // Aprobare NFT pentru escrow
  const approveTx = await organNFT.connect(donor).approve(organEscrow.address, nftId);
  await approveTx.wait();
  console.log(`✅ NFT ID ${nftId} approved for escrow`);


    // Deploy OrganEscrow2 Contract cu ID-ul corect al NFT-ului
    const OrganEscrow2 = await hre.ethers.getContractFactory("OrganEscrow");
    const organEscrow2 = await OrganEscrow2.deploy(
      donor2.address,
      nftId2, // Folosim ID-ul obținut din mintTx
      organNFT.address,
      doctor.address
    );
  
    await organEscrow2.deployed();
    console.log(`Deployed OrganEscrow2 Contract at: ${organEscrow2.address}`);
  
    // Aprobare NFT pentru escrow
    const approveTx2 = await organNFT.connect(donor2).approve(organEscrow2.address, nftId2);
    await approveTx2.wait();
    console.log(`✅ NFT ID ${nftId2} approved for escrow`);


  
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
