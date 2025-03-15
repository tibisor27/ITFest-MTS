import { useState } from 'react';
import { uploadToPinata } from '../utils/pinata';
import { ethers } from 'ethers';

export default function AddOrgan({
  organNFT,
  provider,
  account,
  donorAddress,
}) {
  const [formData, setFormData] = useState({
    organ: '',
    BloodType: '',
    description: '',
    image: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddOrgan = async () => {
    if (!donorAddress) {
      alert('Donor address not found!');
      return;
    }

    if (
      !formData.organ ||
      !formData.BloodType ||
      !formData.description ||
      !formData.image
    ) {
      alert('All fields are required!');
      return;
    }

    if (account.toLowerCase() !== donorAddress.toLowerCase()) {
      alert('Only the donor can mint NFTs!');
      return;
    }

    setLoading(true);

    const nftData = {
      ...formData,
      id: Date.now().toString(),
      attributes: [
        { trait_type: 'Blood Type', value: formData.BloodType },
        { trait_type: 'Organ', value: formData.organ },
      ],
    };

    const ipfsUrl = await uploadToPinata(nftData);
    if (!ipfsUrl) {
      alert('Error uploading to IPFS!');
      setLoading(false);
      return;
    }

    try {
      const signer = provider.getSigner();
      const organNFTWithSigner = organNFT.connect(signer);
      const mintTx = await organNFTWithSigner.mintOrganNFT(ipfsUrl);
      await mintTx.wait();
      alert('NFT minted successfully!');
      setFormData({ organ: '', BloodType: '', description: '', image: '' });
    } catch (error) {
      console.error('Minting error:', error);
      alert('Minting failed!');
    }

    setLoading(false);
  };

  return (
    <div className="p-4 bg-gray-100 rounded-md w-80">
      <h3 className="text-lg font-bold mb-2">Donate an Organ</h3>
      <input
        type="text"
        name="organ"
        placeholder="Organ Type"
        value={formData.organ}
        onChange={handleChange}
        className="border p-2 mb-2 w-full"
      />
      <input
        type="text"
        name="BloodType"
        placeholder="Blood Type"
        value={formData.BloodType}
        onChange={handleChange}
        className="border p-2 mb-2 w-full"
      />
      <textarea
        name="description"
        placeholder="Description"
        value={formData.description}
        onChange={handleChange}
        className="border p-2 mb-2 w-full"
      />
      <input
        type="text"
        name="image"
        placeholder="IPFS Image URL"
        value={formData.image}
        onChange={handleChange}
        className="border p-2 mb-2 w-full"
      />
      <button
        onClick={handleAddOrgan}
        disabled={loading}
        className="bg-blue-500 text-white p-2 rounded-md w-full"
      >
        {loading ? 'Minting...' : 'Add Organ'}
      </button>
    </div>
  );
}
