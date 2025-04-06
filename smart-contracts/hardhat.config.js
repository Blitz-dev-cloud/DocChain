require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config(); // Load .env variables

module.exports = {
  solidity: "0.8.17",
  networks: {
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    sepolia: {
      url: process.env.ALCHEMY_URL,
      accounts: [`0x${process.env.PRIVATE_KEY}`],
    },
  },
};
