import React from "react";

const Navbar = () => {
  return (
    <nav className="bg-indigo-600 p-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <a href="/" className="text-white text-2xl font-bold">
          DocChain
        </a>
        <div className="flex items-center space-x-6">
          <a href="/" className="text-white hover:text-indigo-200">
            Logout
          </a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
