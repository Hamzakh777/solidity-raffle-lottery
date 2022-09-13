import { HardhatRuntimeEnvironment } from "hardhat/types"
import fs from "fs"
import { DeployFunction } from "hardhat-deploy/types"
import { BASE_FEE, DEV_CHAINS, GAS_PRICE_LINK } from "../hardhat.consts"
import { ethers, network } from "hardhat"

const FRONT_END_ADDRESSES_FILE = "./ui/constants/contractAddresses.json"
const FRONT_END_ABI_FILE = "./ui/constants/abi.json"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getChainId } = hre

  const chainId = await getChainId()
  if (process.env.UPDATE_FRONT_END) {
    console.log("updating front end...")
    updateContractAddresses(chainId)
    updateAbi();
  }
}

const updateContractAddresses = async (chainId: string) => {
  const raffle = await ethers.getContract("Raffle")
  const contractAddresses = JSON.parse(fs.readFileSync(FRONT_END_ADDRESSES_FILE, "utf-8"))

  if (chainId in contractAddresses) {
    if (!contractAddresses[chainId].includes(raffle.address)) {
      contractAddresses[chainId].push(raffle.address)
    }
  } else {
    contractAddresses[chainId] = [raffle.address]
  }

  fs.writeFileSync(FRONT_END_ADDRESSES_FILE, JSON.stringify(contractAddresses))
}

const updateAbi = async () => {
  const raffle = await ethers.getContract("Raffle")
  fs.writeFileSync(FRONT_END_ABI_FILE, raffle.interface.format(ethers.utils.FormatTypes.json) as string)
}

export default func
func.tags = ["all", "frontend"]
