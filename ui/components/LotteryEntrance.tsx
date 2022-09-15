import { useCallback, useEffect, useState } from "react"
import { BigNumber, ethers } from "ethers"
import { useWeb3Contract, useMoralis } from "react-moralis"
import { contractAddresses, abi } from "../constants"
import { useNotification } from "@web3uikit/core"

interface LotteryEntranceProps {}

export const LotteryEntrance = (props: LotteryEntranceProps) => {
  const [entranceFee, setEntranceFee] = useState<string>("0")
  const [numPlayers, setNumPlayers] = useState<string>("0")
  const [recentWinner, setRecentWinner] = useState<string>("0")
  const { chainId: chainIdHex, isWeb3Enabled } = useMoralis()
  const chainId = (chainIdHex && parseInt(chainIdHex)) || 0
  const raffleAddress = chainId in contractAddresses ? contractAddresses[chainId][0] : null

  const dispatch = useNotification()

  const { runContractFunction: enterRaffle } = useWeb3Contract({
    abi,
    contractAddress: raffleAddress,
    functionName: "enterRaffle",
    params: {},
    msgValue: entranceFee,
  })

  const { runContractFunction: getEntranceFee } = useWeb3Contract({
    abi,
    contractAddress: raffleAddress,
    functionName: "getEntranceFee",
    params: {},
  })

  const { runContractFunction: getNumberOfPlayers } = useWeb3Contract({
    abi,
    contractAddress: raffleAddress,
    functionName: "getNumberOfPlayers",
    params: {},
  })

  const { runContractFunction: getRecentWinner } = useWeb3Contract({
    abi,
    contractAddress: raffleAddress,
    functionName: "getRecentWinner",
    params: {},
  })

  const updateUI = useCallback(async () => {
    const fee: any = await getEntranceFee()
    const numPlayersFromCall: any = await getNumberOfPlayers()
    const recentWinner: any = await getRecentWinner()
    if (fee) {
      setEntranceFee(fee.toString())
    }
    if (numPlayersFromCall) {
      setNumPlayers(numPlayersFromCall.toString())
    }
    if (recentWinner) {
      setRecentWinner(recentWinner)
    }
  }, [setEntranceFee, raffleAddress, getEntranceFee])

  const enterRaffleHandler = async () => {
    try {
      await enterRaffle({
        onSuccess: handleSuccess,
        onError: (error) => console.error(error),
      })
    } catch (error) {
      console.error(error)
    }
  }

  const handleSuccess = async (tx: any) => {
    await tx.wait(1)
    dispatch({
      type: "info",
      message: "Transaction Complete!",
      title: "Tx Notification",
      position: "topR",
      icon: "bell" as any,
    })
    updateUI()
  }

  useEffect(() => {
    if (isWeb3Enabled) {
      updateUI()
    }
  }, [isWeb3Enabled])

  return (
    <div>
      {raffleAddress ? (
        <div>
          <button onClick={enterRaffleHandler}>Enter Raffle</button>
          <div>Entrance fee: {ethers.utils.formatUnits(entranceFee, "ether")} eth</div>
          <div>Number of Players: {numPlayers}</div>
          <div>Recent winner: {recentWinner}</div>
        </div>
      ) : (
        <div>No Raffle address detected</div>
      )}
    </div>
  )
}
