import axios from "axios";

const PINATA_API_KEY = "666e1e3e79f3e29ce4cd";
const PINATA_SECRET_API_KEY = "5125f9625b2b72898e056ecd6b38a233b329783404210455ad54aa122541fd22";

export async function uploadToPinata(metadata) {
  const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;

  try {
    const response = await axios.post(url, metadata, {
      headers: {
        "Content-Type": "application/json",
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_API_KEY,
      },
    });

    return `https://ipfs.io/ipfs/${response.data.IpfsHash}`;
  } catch (error) {
    console.error("Eroare la încărcare pe Pinata:", error);
    return null;
  }
}
