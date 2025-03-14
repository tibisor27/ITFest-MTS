import banner from '../assets/walp.jpg';

const Search = () => {
    return (
        <div className="relative bg-blue-200 grid grid-cols-12 py-24">
            {/* Imaginea de fundal */}
            <img
                src={banner}
                alt="House"
                className="absolute top-0 left-0 w-full h-full object-cover"
            />          
            <div className="relative col-span-6 flex flex-col items-center justify-center">
                <p className="mb-2 text-white font-bold text-5xl">  Search it. Explore it.</p>
                <p className="mb-4 text-white font-bold text-5xl"> Buy it.</p>
                <input
                    className="mt-4 p-6 rounded-xl border border-gray-300 w-[420px]"
                    type="text"
                    placeholder="Enter an address, neighborhood, city, or ZIP code"
                />
            </div>
        </div>

    );
}

export default Search;