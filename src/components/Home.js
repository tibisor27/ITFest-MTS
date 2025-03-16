import { useState, useEffect } from 'react';

const Home = ({
  organ,
  provider,
  account,
  selectedEscrow,
  togglePop,
  findMatchingPatientForOrgan, // Înlocuiește findPatientByCriteria cu findMatchingPatientForOrgan
}) => {
  const [donor, setDonor] = useState(null);
  const [patient, setPatient] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [organId, setOrganId] = useState(null);
  const [doctorApproved, setDoctorApproved] = useState(false);
  const [currentOwner, setCurrentOwner] = useState(null);
  const [futureOwner, setFutureOwner] = useState(null);
  const [patientSet, setPatientSet] = useState(false); // Stare pentru a verifica dacă pacientul a fost setat

  const fetchDetails = async () => {
    if (!selectedEscrow) {
      console.error('❌ Contractul OrganEscrow nu a fost găsit!');
      return;
    }

    const donor = await selectedEscrow.donor();
    const doctor = await selectedEscrow.doctor();
    const patient = await selectedEscrow.patient();
    const organId = await selectedEscrow.organNFT();
    const doctorApproved = await selectedEscrow.doctorApproved();
    const owners = await selectedEscrow.getOwners();

    setDonor(donor);
    setDoctor(doctor);
    setPatient(patient);
    setOrganId(organId.toString());
    setDoctorApproved(doctorApproved);
    setCurrentOwner(owners[0]);
    setFutureOwner(owners[1]);
  };

  useEffect(() => {
    const checkIfPatientIsSet = async () => {
      if (!selectedEscrow || !organ) return;

      const isSet = await selectedEscrow.isPatientSet();
      if (!isSet && !patientSet) {
        // Folosește findMatchingPatientForOrgan pentru a găsi un pacient potrivit
        const foundPatient = await findMatchingPatientForOrgan(organ);

        if (foundPatient) {
          console.log('🔍 Pacient găsit automat:', foundPatient);
          await setPatientHandler(foundPatient.address);
          setPatientSet(true); // Marchează că pacientul a fost setat
        } else {
          console.log('⚠️ Niciun pacient potrivit găsit.');
        }
      }
    };

    fetchDetails(); // Încarcă detaliile inițiale
    checkIfPatientIsSet();
  }, [patientSet, selectedEscrow, organ]); // Adaugă `organ` ca dependență

  // Funcție pentru a seta adresa pacientului
  const setPatientHandler = async (address) => {
    try {
      if (!address) {
        alert('Patient address cannot be empty.');
        return;
      }

      console.log('🔹 Setting patient to:', address); // Log nou

      const signer = provider.getSigner(); // Obține semnatarul de la provider
      const escrowWithSigner = selectedEscrow.connect(signer); // Conectează semnatarul la contract

      // Apelează funcția contractului pentru a seta pacientul
      const tx = await escrowWithSigner.setPatient(address);
      await tx.wait(); // Așteaptă confirmarea tranzacției

      alert('Patient address set successfully!');
      fetchDetails(); // Refresh details after setting the patient
    } catch (error) {
      console.error('Error setting patient address:', error);
      alert('Failed to set patient address. Please try again.');
    }
  };

  // Funcție pentru a transfera organul
  const transferOrganHandler = async () => {
    try {
      if (!doctorApproved) {
        alert('Doctor approval is required before transferring the organ.');
        return;
      }

      const signer = provider.getSigner();
      const escrowWithSigner = selectedEscrow.connect(signer);

      // 🏦 Apelează contractul pentru a transfera organul
      const tx = await escrowWithSigner.transferOrgan(); // Corectează typo-ul: `transferOrgan` în loc de `transferOrgan`
      await tx.wait();

      setCurrentOwner(futureOwner); // Setăm noul proprietar pe moment
      setFutureOwner(null); // Eliminăm viitorul proprietar temporar
      alert('Organ transferred successfully!');

      fetchDetails(); // 🔄 Reîmprospătăm datele oficiale după confirmare
    } catch (error) {
      console.error('Error transferring organ:', error);
      alert('Failed to transfer organ. Please try again.');
    }
  };

  // Funcție pentru ca doctorul să aprobe transplantul
  const approveTransplantHandler = async () => {
    try {
      const signer = provider.getSigner();
      const escrowWithSigner = selectedEscrow.connect(signer);

      // Apelează funcția contractului pentru a aproba transplantul
      const tx = await escrowWithSigner.approveTransplant();
      await tx.wait();

      // Actualizăm instant UI ca să pară că s-a aprobat deja
      setDoctorApproved(true);

      alert('Transplant approved successfully!');
      fetchDetails(); // Reîmprospătăm datele oficiale
    } catch (error) {
      console.error('Error approving transplant:', error);
      alert('Failed to approve transplant. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-11/12 md:w-[800px] p-5 relative">
        <button
          onClick={() => togglePop()}
          className="absolute -top-1 right-1 text-2xl text-gray-700 hover:text-red-500"
        >
          &times;
        </button>

        <h2 className="text-2xl font-bold text-center mb-4">
          Organ Transplant Details
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p>
              <strong>Donor:</strong>{' '}
              {donor ? `${donor.slice(0, 6)}...${donor.slice(-4)}` : 'N/A'}
            </p>
            <p>
              <strong>Patient:</strong>{' '}
              {patient
                ? `${patient.slice(0, 6)}...${patient.slice(-4)}`
                : 'Not assigned yet'}
            </p>
            <p>
              <strong>Doctor:</strong>{' '}
              {doctor ? `${doctor.slice(0, 6)}...${doctor.slice(-4)}` : 'N/A'}
            </p>
            <p>
              <strong>Organ NFT ID:</strong> {organId || 'Loading...'}
            </p>
            <p>
              <strong>Doctor Approval:</strong>{' '}
              {doctorApproved ? '✅ Approved' : '❌ Not Approved'}
            </p>
            <p>
              <strong>Current NFT Owner:</strong>{' '}
              {currentOwner
                ? `${currentOwner.slice(0, 6)}...${currentOwner.slice(-4)}`
                : 'Loading...'}
            </p>
            <p>
              <strong>Future NFT Owner:</strong>{' '}
              {futureOwner
                ? `${futureOwner.slice(0, 6)}...${futureOwner.slice(-4)}`
                : 'Not assigned yet'}
            </p>
          </div>

          <div className="flex flex-col items-center">
            <img
              src={organ.image || 'fallback.jpg'}
              className="w-[200px] h-auto rounded-lg"
            />
          </div>
        </div>

        {organ && (
          <div className="mt-5">
            <h3 className="text-xl font-bold">Organ Details</h3>

            <p>
              <strong>Organ:</strong> {organ.organ || 'N/A'}
            </p>
            <p>
              <strong>Blood Type:</strong> {organ.bloodType || 'N/A'}
            </p>
            <p>
              <strong>Description:</strong>{' '}
              {organ.description || 'No description'}
            </p>
            <h4 className="font-semibold">Attributes:</h4>
            <ul className="list-disc ml-5">
              {organ.attributes?.map((attr, i) => (
                <li key={i}>
                  {attr.trait_type}: {attr.value}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-3 mt-5">
          {account === doctor && (
            <button
              onClick={approveTransplantHandler}
              className="bg-green-500 text-white p-2 rounded-md"
            >
              Approve Transplant
            </button>
          )}

          {account === donor && (
            <button
              onClick={transferOrganHandler}
              className={`p-2 rounded-md ${
                doctorApproved
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-400 text-gray-700 cursor-not-allowed'
              }`}
              disabled={!doctorApproved}
            >
              Transfer Organ
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;