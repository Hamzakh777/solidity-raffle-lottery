import { assert, expect } from "chai"
import { BigNumber } from "ethers"
import { deployments, ethers, getNamedAccounts, network } from "hardhat"
import { DEV_CHAINS, MIN_ETH, NETWORK_CONFIG } from "../../../hardhat.consts"
import { Raffle, VRFCoordinatorV2Mock } from "../../../typechain-types"

DEV_CHAINS.includes(network.name)
  ? describe.skip
  : describe("Raffle", () => {
      let raffle: Raffle
      let deployer: string
      let entranceFee: BigNumber

      const chainId = network.config.chainId || 0

      beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer
        raffle = await ethers.getContract("Raffle", deployer)
        entranceFee = await raffle.getEntranceFee()
      })

      describe("fulfillRandomWords", () => {
        it("works with live chainlink keepers and Chainlink VRF, we get a random winner", async () => {
          // enter the raffle
          const startingTimeStamp = await raffle.getLatestTimestamp()
          const accounts = await ethers.getSigners()

          await new Promise(async (res, rej) => {
            // setup the linstener before we enter the raffle just in case
            // the blockchain moves really fast
            raffle.once("WinnerPicked", async () => {
              try {
                const recentWinner = await raffle.getRecentWinner()
                const raffleState = await raffle.getRaffleState()
                const endingTimeStamp = await raffle.getLatestTimestamp()
                const winnerEndingBalance = await accounts[0].getBalance()

                // check if our players array has been reset
                await expect(raffle.getPlayer(0)).to.be.reverted
                assert.equal(recentWinner, accounts[0].address)
                assert.equal(raffleState, 0)
                assert.equal(winnerEndingBalance.toString(), winnerStartingBalance.add(entranceFee).toString())
                assert(endingTimeStamp > startingTimeStamp)
                
                res(recentWinner)
              } catch (error) {
                console.log(error)
                rej(error)
              }
            })

            await raffle.enterRaffle({ value: entranceFee })
            const winnerStartingBalance = await accounts[0].getBalance()
          })
        })
      })
    })
