import { assert, expect } from "chai"
import { BigNumber } from "ethers"
import { deployments, ethers, getNamedAccounts, network } from "hardhat"
import { DEV_CHAINS, MIN_ETH, NETWORK_CONFIG } from "../../hardhat.consts"
import { Raffle, VRFCoordinatorV2Mock } from "../../typechain-types"

!DEV_CHAINS.includes(network.name)
  ? describe.skip
  : describe("Raffle", async () => {
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

      describe("enterRaffle", async () => {
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

      describe.only("checkUpKeep", async () => {
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
      })
    })
