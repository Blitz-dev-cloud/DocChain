import React from "react";

const Navbar = () => {
  return (
    <nav className="bg-gradient-to-r from-green-600 to-green-400 p-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <a href="/" className="text-white text-2xl font-bold">
          <div className="flex flex-row justify-between items-center">
            <img src="../navimg.png" className="h-[30px] mx-2" />{" "}
            DocChain
          </div>
        </a>
        <div className="flex items-center space-x-6 px-3 py-1 bg-red-600 rounded-lg hover:bg-red-700">
          <a href="/" className="text-white">
            Logout
          </a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
