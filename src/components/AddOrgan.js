import { uploadToPinata } from "../utils/pinata";
import { useState } from "react";
import { ethers } from "ethers";

export default function AddOrgan({ organNFT, provider, account, donorAddress }) {
  const [loading, setLoading] = useState(false);

  const handleAddOrgan = async () => {
    if (!donorAddress) {
        console.error("❌ DonorAddress nu este încărcat! Verifică loadBlockchainData()");
        alert("Donor address not found!");
        return;
    }
    
    console.log("organNFT:", organNFT);
    console.log("provider:", provider);
    console.log("account:", account);
    console.log("donorAddress:", donorAddress);
    if (!organNFT || !provider || !account || !donorAddress) {
      alert("Contractul sau wallet-ul nu sunt inițializate!");
      return;
    }

    // 🛑 Verificăm dacă utilizatorul conectat este donor-ul
    if (account.toLowerCase() !== donorAddress.toLowerCase()) {
      alert("Numai donor-ul poate mina NFT-uri!");
      return;
    }

    setLoading(true);

    const nftData = {
      organ: "Plamani",
      BloodType: "A1",
      description: "Test",
      image: "https://ipfs.io/ipfs/bafkreiduadulzcm27f7lo4kgeadyyszk5gbooviueikcydbjbgcearkjia",
      id: Date.now().toString(),
      attributes: [
        { trait_type: "test", value: 20 },
        { trait_type: "test1", value: "Condo" },
        { trait_type: "test2", value: 2 },
        { trait_type: "test3", value: 3 },
        { trait_type: "test4", value: 2200 },
        { trait_type: "test5", value: 2013 },
      ],
    };

    // 🔗 Încărcăm metadata pe Pinata
    const ipfsUrl = await uploadToPinata(nftData);
    if (!ipfsUrl) {
      alert("Eroare la încărcare pe IPFS!");
      setLoading(false);
      return;
    }

    try {
      // 🎯 Conectăm contractul NFT la donor (signer)
      const signer = provider.getSigner();
      const organNFTWithSigner = organNFT.connect(signer);

      // 🔥 Mint NFT ca donor
      const mintTx = await organNFTWithSigner.mintOrganNFT(ipfsUrl);
      await mintTx.wait();
      alert("NFT mintat cu succes!");
    } catch (error) {
      console.error("Eroare la minting:", error);
      alert("Minting failed!");
    }

    setLoading(false);
  };

  return (
    <button
      onClick={handleAddOrgan}
      disabled={loading}
      className="bg-blue-500 text-white p-2 rounded-md mt-3"
    >
      {loading ? "Minting..." : "Add Organ"}
    </button>
  );
}