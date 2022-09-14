import { BigNumber, ethers } from "ethers"

interface NetworkConfig {
  name: string
  vrfCoordinatorAddress?: string
  // key hash - how much gas im willing to pay for the request
  gasLane: string
  callbackGasLimit: number
  subscriptionId: number
  interval: number
}

export const DEV_CHAINS: string[] = ["hardhat", "localhost"]
export const BASE_FEE: BigNumber = ethers.utils.parseEther("0.25")
export const GAS_PRICE_LINK: number = 1e9 // link per gas - calculated value based on the price of gas
export const MIN_ETH: string = "0.5"
export const NETWORK_CONFIG: { [key: string]: NetworkConfig } = {
  "4": {
    name: "rinkeby",
    vrfCoordinatorAddress: "0x6168499c0cFfCaCD319c818142124B7A15E857ab",
    gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
    callbackGasLimit: 500000,
    subscriptionId: 18428,
    interval: 30,
  },
  "31337": {
    name: "localhost",
    subscriptionId: 588,
    gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc", // 30 gwei
    interval: 30,
    callbackGasLimit: 500000, // 500,000 gas
  },
}
