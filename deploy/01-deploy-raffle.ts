import { HardhatRuntimeEnvironment } from "hardhat/types"
import { Address, DeployFunction } from "hardhat-deploy/types"
import { DEV_CHAINS, NETWORK_CONFIG, SUBSCRIPTION_ID } from "../hardhat.consts"
import { parseEther } from "ethers/lib/utils"
import { network } from "hardhat"
import { VRFConsumerBaseV2, VRFCoordinatorV2Mock } from "../typechain-types"
import { BigNumber } from "ethers"

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
  } else {
    vrfCoordinatorAddress = NETWORK_CONFIG[chainId].vrfCoordinatorAddress
    callbackGasLimit = NETWORK_CONFIG[chainId].callbackGasLimit
    gasLane = NETWORK_CONFIG[chainId].gasLane
    subscriptionId = BigNumber.from(SUBSCRIPTION_ID)
  }

  log(`addres ${vrfCoordinatorAddress}`)
 
  log("Deploying Raffle")
  const minEth = parseEther("0.0000000005")
  await deploy("Raffle", {
    from: deployer,
    // address vrfCoordinator,
    // uint256 minEth,
    // bytes32 gasLane,
    // uint64 subscriptionId,
    // uint32 callbackGasLimit,
    // uint256 interval
    args: [vrfCoordinatorAddress, minEth, gasLane, subscriptionId, callbackGasLimit, 30000],
    log: DEV_CHAINS.includes(networkName),
    waitConfirmations: isDevEnv ? 1 : 6,
  })
  log("Raffle Deployed")
  // add this function to be a consumer of the vrfcoordinator if we are working locally
}
export default func
