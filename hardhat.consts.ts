import { BigNumber, ethers } from "ethers";

interface NetworkConfig {
  name: string
  vrfCoordinatorAddress: string
  // key hash - how much gas im willing to pay for the request
  gasLane: string
  callbackGasLimit: number
}

export const SUBSCRIPTION_ID = process.env.SUBSCRIPTION_ID;

export const DEV_CHAINS: string[] = ["hardhat", "localhost"]
export const BASE_FEE: BigNumber = ethers.utils.parseEther('0.25');
export const GAS_PRICE_LINK: number = 1e9; // link per gas - calculated value based on the price of gas
export const NETWORK_CONFIG: { [key: string]: NetworkConfig } = {
  "4": {
    name: "rinkeby",
    vrfCoordinatorAddress: "0x271682DEB8C4E0901D1a1550aD2e64D568E69909",
    gasLane: "0x9fe0eebf5e446e3c998ec9bb19951541aee00bb90ea201ae456421a2ded86805",
    callbackGasLimit: 1000000
  }
}
