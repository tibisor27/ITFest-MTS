import logo from '../assets/logo.png';

const Navigation = ({ account, setAccount }) => {
    const connectHandler = async () => {
        // Verifică dacă MetaMask (window.ethereum) este disponibil
        if (window.ethereum) {
            try {
                // Solicită conturile Ethereum de la MetaMask
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });  //e lista cu conturile disponibile
                setAccount(accounts[0]); // Setează primul cont găsit
            } catch (error) {
                // Dacă utilizatorul refuză conectarea, gestionează eroarea
                if (error.code === 4001) {
                    console.log("User rejected the request"); // Log pentru refuzul conectării
                } else {
                    console.error(error); // Alte erori (de ex. probleme de rețea)
                }
            }
        } else {
            alert('Please install MetaMask to connect your wallet!');
        }
    };

    return (
        <nav className='grid grid-cols-12 items-center  px-20'>
            {/* Secțiunea din stânga */}
            <div className='col-span-4 flex space-x-4'>
                <p className='cursor-pointer transition-all duration-300 hover:text-lg'>med</p>
                <p className='cursor-pointer transition-all duration-300 hover:text-lg'>med</p>
                <p className='cursor-pointer transition-all duration-300 hover:text-lg'>med</p>
            </div>

            {/* Logo-ul în mijloc */}
            <div className='col-span-4 flex justify-center'>
                <img src={logo} alt="Logo" className="w-40 h-auto transition-all duration-300 hover:w-[190px]" />
            </div>

            {/* Butonul în dreapta */}
            <div className='col-span-4 flex justify-end'>
                {account ? (
                    <button className='bg-slate-500 text-white px-4 py-2 rounded hover:bg-slate-700'>
                        {account.slice(0, 6)}...{account.slice(-4)}
                    </button>
                ) : (
                    <button
                        onClick={connectHandler}
                        className='bg-slate-500 text-white px-4 py-2 rounded hover:bg-slate-700'
                    >
                        Connect
                    </button>
                )}
            </div>
        </nav>
    );
};

export default Navigation;
