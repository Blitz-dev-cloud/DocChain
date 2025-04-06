import React, { useState, useEffect } from "react";
import {
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
} from "framer-motion";
import { Sparkles, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import BlockchainModel from "./BlockchainModel";
import Login from "./Login";
import Registration from "./Registration";

const COLORS = [
  "#00FFAA",
  "#33CCFF",
  "#0077FF",
  "#8844EE",
  "#FF44CC",
  "#550088",
];

const Hero = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("login");

  const color = useMotionValue(COLORS[0]);
  const backgroundImage = useMotionTemplate`radial-gradient(125% 125% at 50% 0%, #020617 50%, ${color})`;
  const boxShadow = useMotionTemplate`0px 4px 24px ${color}`;

  const border1 = useMotionTemplate`1px solid #00FFAA`;
  const boxShadow1 = useMotionTemplate`0px 4px 24px #00FFAA`;

  const border2 = useMotionTemplate`1px solid #8844EE`;
  const boxShadow2 = useMotionTemplate`0px 4px 24px #8844EE`;

  const border3 = useMotionTemplate`1px solid #FF44CC`;
  const boxShadow3 = useMotionTemplate`0px 4px 24px #FF44CC`;

  const backgroundColor = useMotionTemplate`${color}`;

  useEffect(() => {
    animate(color, COLORS, {
      ease: "easeInOut",
      duration: 10,
      repeat: Infinity,
      repeatType: "mirror",
    });
  }, []);

  const handleGetStarted = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setActiveTab("login");
  };

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        return accounts[0];
      } catch (error) {
        console.error("Failed to connect wallet", error);
        throw error;
      }
    } else {
      alert("MetaMask not found. Please install MetaMask.");
      throw new Error("No wallet found");
    }
  };

  const handleLogin = async (loginData) => {
    try {
      console.log("Login attempted with:", loginData);
      // API logic here
    } catch (error) {
      console.error("Login failed", error);
      alert("Login failed. Please check your credentials.");
    }
  };

  const handleRegister = async (registrationData) => {
    try {
      console.log("Registration Data:", registrationData);
      // API logic here
    } catch (error) {
      console.error("Registration failed", error);
      alert("Registration failed. Please try again.");
    }
  };

  return (
    <>
      <motion.section
        style={{ backgroundImage }}
        className="relative min-h-screen overflow-hidden bg-gray-950 text-gray-400 flex justify-center items-center flex-col text-center px-4 cursor-grab"
      >
        <div className="absolute inset-0 z-0">
          <Canvas camera={{ position: [0, 2, 8], fov: 45 }}>
            <ambientLight intensity={0.4} />
            <pointLight position={[10, 10, 10]} intensity={0.8} />
            <pointLight
              position={[-10, -10, -10]}
              intensity={0.5}
              color="#33CCFF"
            />
            <React.Suspense fallback={null}>
              <BlockchainModel />
            </React.Suspense>
            <Sparkles
              count={1200}
              scale={[15, 10, 15]}
              size={2}
              color={"#ffffff"}
              speed={0.3}
              opacity={0.7}
              noise={0}
              fade
            />
            <OrbitControls
              enableZoom={false}
              autoRotate
              autoRotateSpeed={0.5}
              minPolarAngle={Math.PI / 3}
              maxPolarAngle={Math.PI / 1.5}
            />
          </Canvas>
        </div>

        <div className="z-10 flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <p className="text-3xl sm:text-4xl md:text-5xl font-bold max-w-[80%] md:max-w-[60%] mx-auto text-white">
              DocChain - Your Health, Your Data Fully Protected
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <p className="md:text-2xl max-w-[90%] md:max-w-[70%] mt-6 mx-auto">
              DocChain ensures secure, transparent, and tamper-proof medical
              records, giving you complete control over your healthcare journey.
              Connect with trusted professionals and access your records
              anytime, anywhere.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex justify-between mt-6 flex-wrap"
          >
            <motion.div
              style={{ border: border1, boxShadow: boxShadow1 }}
              className="px-4 py-1 rounded-3xl mx-4 bg-gray-950 mb-2"
            >
              Secure
            </motion.div>
            <motion.div
              style={{ border: border2, boxShadow: boxShadow2 }}
              className="px-4 py-1 rounded-3xl mx-4 bg-gray-950 mb-2"
            >
              Reliable
            </motion.div>
            <motion.div
              style={{ border: border3, boxShadow: boxShadow3 }}
              className="px-4 py-1 rounded-3xl mx-4 bg-gray-950 mb-2"
            >
              Effortless
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-10"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ boxShadow, backgroundColor }}
              className="px-6 py-3 rounded-2xl bg-gray-900 text-white font-semibold cursor-pointer"
              onClick={handleGetStarted}
            >
              Get Started
            </motion.button>
          </motion.div>
        </div>
      </motion.section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-10">
          <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">
                Welcome to DocChain
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-white hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            <div className="flex mb-4">
              <button
                className={`w-1/2 py-2 ${
                  activeTab === "login"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400"
                }`}
                onClick={() => setActiveTab("login")}
              >
                Login
              </button>
              <button
                className={`w-1/2 py-2 ${
                  activeTab === "register"
                    ? "bg-green-600 text-white"
                    : "bg-gray-800 text-gray-400"
                }`}
                onClick={() => setActiveTab("register")}
              >
                Register
              </button>
            </div>
            {activeTab === "login" ? (
              <Login onLogin={handleLogin} />
            ) : (
              <Registration
                onRegister={handleRegister}
                connectWallet={connectWallet}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Hero;
