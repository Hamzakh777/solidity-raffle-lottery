import { assert, expect } from "chai"
import { BigNumber } from "ethers"
import { deployments, ethers, getNamedAccounts, network } from "hardhat"
import { DEV_CHAINS, MIN_ETH, NETWORK_CONFIG } from "../../hardhat.consts"
import { Raffle, VRFCoordinatorV2Mock } from "../../typechain-types"

!DEV_CHAINS.includes(network.name)
  ? describe.skip
  : describe("Raffle", () => {
      let raffle: Raffle
      let VRFCoordinatorV2Mock: VRFCoordinatorV2Mock
      let deployer: string
      let entranceFee: BigNumber
      let interval: BigNumber

      const chainId = network.config.chainId || 0

      beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer
        await deployments.fixture("all")
        raffle = await ethers.getContract("Raffle", deployer)
        VRFCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
        entranceFee = await raffle.getEntranceFee()
        interval = await raffle.getInterval()
      })

      describe("constructor", async () => {
        it("Initializes the raffle correctly", async () => {
          // we can test all the other initialized vars but you get the point
          const raffleState = await raffle.getRaffleState()
          const interval = await raffle.getInterval()
          assert.equal(raffleState, 0)
          assert.equal(interval.toString(), BigNumber.from(interval).toString())
        })
      })

      describe("enterRaffle", () => {
        it("Reverts when you don't pay enough", async () => {
          const AMOUNT = ethers.utils.parseEther("0.0000000004")
          const transaction = raffle.enterRaffle({
            value: AMOUNT,
            from: deployer,
          })
          await expect(transaction).to.be.revertedWith("Raffle__EthNotEnough")
        })

        it("Records players when they enter", async () => {
          await raffle.enterRaffle({
            value: entranceFee,
          })
          const raffleParticipant = await raffle.getPlayer(0)
          assert.equal(raffleParticipant, deployer)
        })

        it("Emits an event on raffle enter", async () => {
          const transaction = await raffle.enterRaffle({
            value: entranceFee,
          })
          await expect(transaction).to.emit(raffle, "RaffleEnter")
        })

        it("Reverts if the raffle state is not open", async () => {
          await raffle.enterRaffle({
            value: entranceFee,
          })
          await network.provider.send("evm_increaseTime", [interval.add(1).toNumber()])
          // mine a block to move forward
          await network.provider.send("evm_mine", [])
          // we pretend to be a chainlink keeper
          await raffle.performUpkeep([])
          // now its in calculating state
          await expect(raffle.enterRaffle({ value: entranceFee })).to.be.revertedWith(
            "Raffle_NotOpen"
          )
        })
      })

      describe("checkUpKeep", () => {
        it("Should return false if the raffle has no people", async () => {
          await network.provider.send("evm_increaseTime", [interval.add(1).toNumber()])
          // mine a block to move forward
          await network.provider.send("evm_mine", [])
          // we don't to send the transaction but instead we want to
          // simulate the transaction
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
          assert.equal(upkeepNeeded, false)
        })

        it("Should return false if the raffle is not open", async () => {
          await raffle.enterRaffle({
            value: entranceFee,
          })
          await network.provider.send("evm_increaseTime", [interval.add(1).toNumber()])
          // mine a block to move forward
          await network.provider.send("evm_mine", [])
          // we pretend to be a chainlink keeper
          await raffle.performUpkeep([])

          const raffleState = await raffle.getRaffleState()
          assert.equal(raffleState, 1)

          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
          assert.equal(upkeepNeeded, false)
        })

        it("returns false if enough time hasn't passed", async () => {
          await raffle.enterRaffle({ value: entranceFee })
          await network.provider.send("evm_increaseTime", [interval.toNumber() - 5]) // use a higher number here if this test fails
          await network.provider.request({ method: "evm_mine", params: [] })
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
          assert(!upkeepNeeded)
        })
        it("returns true if enough time has passed, has players, eth, and is open", async () => {
          await raffle.enterRaffle({ value: entranceFee })
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
          await network.provider.request({ method: "evm_mine", params: [] })
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
          assert(upkeepNeeded)
        })
      })

      describe.only("performUpkeep", () => {
        it("Should only run if checkUpKeep is true", async () => {
          await raffle.enterRaffle({ value: entranceFee })
          await network.provider.send("evm_increaseTime", [interval.add(1).toNumber()])
          await network.provider.send("evm_mine", [])
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
          assert.equal(upkeepNeeded, true)
          const transaction = await raffle.performUpkeep([])
          await expect(transaction).to.emit(raffle, "RequestedRaffleWinner")
        })

        it("Should revert when checkUpKeep is false", async () => {
          const transaction = raffle.performUpkeep([])
          const balance = await raffle.provider.getBalance(raffle.address)
          const numberOfPlayers = await raffle.getNumberOfPlayers()
          const raffleState = await raffle.getRaffleState()
          await expect(transaction).to.be.revertedWith(
            `Raffle__UpKeepNotNeeded(${balance.toNumber()}, ${numberOfPlayers}, ${raffleState})`
          )
        })
      })

      describe.only("fulfillRandomWords", () => {
        beforeEach(async () => {
          // we want to make sure that:
          await raffle.enterRaffle({ value: entranceFee })
          await network.provider.send("evm_increaseTime", [interval.add(1).toNumber()])
          await network.provider.send("evm_mine", [])
        })

        it("Can only be called after performUpKeep", async () => {
          await expect(
            VRFCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
          ).to.be.revertedWith("nonexistent request")
        })

        it("picks the winner, resets the lottery and sends the money to the winner", async () => {
          const additionalEntrants = 3
          const startingAccountIndex = 1 // deployer = 0
          const accounts = await ethers.getSigners()
          for (let i = startingAccountIndex; i < additionalEntrants + startingAccountIndex; i++) {
            const accountConnectedRaffle = raffle.connect(accounts[i])
            await accountConnectedRaffle.enterRaffle({ value: entranceFee })
          }
          const startingTimeStamp = await raffle.getLatestTimestamp()
          // performUpKeep (mock being Chainlink Keepers)
          // fulfillRandomWodrs (mock being the Chainlink VRF)
          // We will have to wait for fulfillRandomWords to be called

          await new Promise(async (res, rej) => {
            raffle.once("WinnerPicked", async () => {
              console.log("Found the event")
              try {
                const recentWinner = await raffle.getRecentWinner()
                const raffleState = await raffle.getRaffleState()
                const endingTimeStamp = await raffle.getLatestTimestamp()
                const numPlayers = await raffle.getNumberOfPlayers()
                const winnerEndingBalance = await accounts[1].getBalance()
                assert.equal(numPlayers.toNumber(), 0)
                assert.equal(raffleState, 0)
                assert(endingTimeStamp > startingTimeStamp)
                assert(accounts.some((account) => account.address === recentWinner))
                assert.equal(
                  winnerEndingBalance.toString(),
                  winnerStartingBalance
                    .add(entranceFee.mul(additionalEntrants))
                    .add(entranceFee)
                    .toString()
                )
                res(recentWinner)
              } catch (error) {
                rej(error)
              }
            })
            // setting up the listener
            // below, we will fire the event, and the listener will pick it up, and resole
            const tx = await raffle.performUpkeep([])
            const txReceipt = await tx.wait(1)
            const winnerStartingBalance = await accounts[1].getBalance()
            if (txReceipt.events) {
              await VRFCoordinatorV2Mock.fulfillRandomWords(
                txReceipt.events[1].args?.requestId,
                raffle.address
              )
            } else {
              rej("No events emitted")
            }
          })
        })
      })
    })
