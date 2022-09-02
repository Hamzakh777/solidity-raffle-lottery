import { HardhatRuntimeEnvironment } from "hardhat/types"
import { Address, DeployFunction } from "hardhat-deploy/types"
import { DEV_CHAINS, MIN_ETH, NETWORK_CONFIG } from "../hardhat.consts"
import { parseEther } from "ethers/lib/utils"
import { ethers, network } from "hardhat"
import { VRFConsumerBaseV2, VRFCoordinatorV2Mock } from "../typechain-types"
import { BigNumber } from "ethers"
import { verify } from "../utils/verify"

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("30")

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  // code here
  const {
    deployments: { deploy, log },
    getNamedAccounts,
    network: { name: networkName },
    ethers,
    getChainId,
  } = hre
  const chainId = await getChainId()
  const { deployer } = await getNamedAccounts()
  const isDevEnv = DEV_CHAINS.includes(networkName)

  let vrfCoordinatorAddress: Address = ""
  let subscriptionId: BigNumber
  let gasLane: Address = ""
  let callbackGasLimit: number
  let interval: number
  if (DEV_CHAINS.includes(networkName)) {
    const VRFCoordinatorV2Mock: VRFCoordinatorV2Mock = await ethers.getContract(
      "VRFCoordinatorV2Mock",
      deployer
    )
    vrfCoordinatorAddress = VRFCoordinatorV2Mock.address
    // create a subscription
    const transactionResponse = await VRFCoordinatorV2Mock.createSubscription()
    const transactionReceipt = await transactionResponse.wait(1)
    subscriptionId = transactionReceipt.events && transactionReceipt.events[0].args?.subId
    callbackGasLimit = 1000000
    // gas lane can be anything locally
    gasLane = "0x9fe0eebf5e446e3c998ec9bb19951541aee00bb90ea201ae456421a2ded86805"
    // Fund the subscription
    await VRFCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT)
  } else {
    vrfCoordinatorAddress = NETWORK_CONFIG[chainId].vrfCoordinatorAddress || ''
    callbackGasLimit = NETWORK_CONFIG[chainId].callbackGasLimit
    gasLane = NETWORK_CONFIG[chainId].gasLane
    subscriptionId = BigNumber.from(NETWORK_CONFIG[chainId].subscriptionId)
  }
  
  log(`addres ${vrfCoordinatorAddress}`)
  
  interval = NETWORK_CONFIG[chainId].interval;
  log("Deploying Raffle")
  const minEth = parseEther(MIN_ETH)
  const args = [vrfCoordinatorAddress, minEth, gasLane, subscriptionId, callbackGasLimit, interval]
  const raffle = await deploy("Raffle", {
    from: deployer,
    args,
    log: DEV_CHAINS.includes(networkName),
    waitConfirmations: isDevEnv ? 1 : 6,
  })

  if (!DEV_CHAINS.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    await verify(raffle.address, args)
  }

  if(DEV_CHAINS.includes(networkName)) {
    const VRFCoordinatorV2Mock: VRFCoordinatorV2Mock = await ethers.getContract(
      "VRFCoordinatorV2Mock",
      deployer
    )
    await VRFCoordinatorV2Mock.addConsumer(subscriptionId.toNumber(), raffle.address)
  }

  log("Raffle Deployed")
  log("--------------------------------------------------")
}
export default func
func.tags = ["all", "mocks"];