import { useNavigate } from "react-router-dom";

const { default: Navigation } = require("./components/Navigation")

const PaginaPornire = () => {
    const navigate = useNavigate();

  return (
    <div>
      <Navigation />
      <div className="text-center mt-24">
        <h1 className="text-4xl font-bold">
        Transforming the Future of <span className="text-blue-500">Healthcare</span></h1>
        <p className="text-gray-600 mt-4"> A next-generation sistem leveraging blockchain for secure, transparent, and efficient organ transplant management. </p>
         <p className="text-gray-500 mt-2"> Empowering healthcare, saving lives with <span className="text-blue-500">Blockchain</span>. </p>
        <div className="mt-6 space-x-4">
          <button onClick={() => navigate('/med')} className="bg-blue-500 text-white px-5 py-2 rounded-lg">
            Learn More
          </button>
          <button onClick={() => navigate('/med')} className="bg-blue-700 text-white px-5 py-2 rounded-lg">
            Get Started
          </button>
        </div>
      </div>

      {/* Feature Section */}
      <div className="grid grid-cols-3 gap-6 text-center mt-40">
        <div>
          <h2 className="text-3xl text-blue-500 font-bold">100%</h2>
          <p className="text-gray-600">Data Security</p>
        </div>
        <div>
          <h2 className="text-3xl text-blue-500 font-bold">100%</h2>
          <p className="text-gray-600">Transparency</p>
        </div>
        <div>
          <h2 className="text-3xl text-blue-500 font-bold">100%</h2>
          <p className="text-gray-600">immutability</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 bg-gray-100 p-10 text-center">
        <div className="grid grid-cols-3 gap-6">
          <div>
            <h3 className="font-bold">Life Chain</h3>
            <p className="text-gray-600 text-sm">
              Because we save lives with blockchain.
            </p>
          </div>
          <div>
            <h3 className="font-bold">Quick Links</h3>
            <ul className="text-gray-600 text-sm">
              <li>About Us</li>
              <li>Our Team</li>
              <li>How It Works</li>
              <li>Blog</li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold">Stay Updated</h3>
            <p className="text-gray-600 text-sm">
              Subscribe to our newsletter for the latest updates.
            </p>
            <div className="mt-3 flex">
              <input
                type="email"
                placeholder="Enter your email"
                className="border p-2 w-full rounded-l-lg"
              />
              <button className="bg-blue-500 text-white px-4 rounded-r-lg">
                Subscribe
              </button>
            </div>
          </div>
        </div>
        <p className="text-gray-500 text-sm mt-6">
          © 2024 LifeChain. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default PaginaPornire;