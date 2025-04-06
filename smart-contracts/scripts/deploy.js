const hre = require("hardhat");

async function main() {
  const EHRContract = await hre.ethers.getContractFactory("EHRContract");
  const ehrContract = await EHRContract.deploy();

  console.log("Deploying EHR Contract...");
  // With ethers v6, we use deploymentTransaction().wait() instead of deployed()
  await ehrContract.waitForDeployment();
  // Or if you need the receipt: await ehrContract.deploymentTransaction().wait();

  console.log("EHR Contract deployed to:", await ehrContract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
