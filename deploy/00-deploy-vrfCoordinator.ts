import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { BASE_FEE, DEV_CHAINS, GAS_PRICE_LINK } from "../hardhat.consts"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {
    deployments: { deploy, log },
    getNamedAccounts,
    network: { name: networkName },
  } = hre
  const { deployer } = await getNamedAccounts()

  // only deploy if we are running it locally
  if (DEV_CHAINS.includes(networkName)) {
    log("Local network detected! Deploying mocks...")
    await deploy("VRFCoordinatorV2Mock", {
      from: deployer,
      log: true,
      args: [BASE_FEE, GAS_PRICE_LINK],
    })
    log("Mocks deployed!");
    log("------------------------------------------");
  }
}
export default func
func.tags = ["all", "mocks"];
