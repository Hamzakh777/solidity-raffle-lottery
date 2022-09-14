import { useCallback, useEffect, useState } from "react"
import { BigNumber, ethers } from "ethers"
import { useWeb3Contract, useMoralis } from "react-moralis"
import { contractAddresses, abi } from "../constants"
import { useNotification } from "@web3uikit/core"

interface LotteryEntranceProps {}

export const LotteryEntrance = (props: LotteryEntranceProps) => {
  const [entranceFee, setEntranceFee] = useState<string>("0")
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
  })

  const updateUI = useCallback(async () => {
    const fee: any = await getEntranceFee()
    if (fee) {
      setEntranceFee(fee.toString())
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
          Entrance fee: {ethers.utils.formatUnits(entranceFee, "ether")} eth
        </div>
      ) : (
        <div>No Raffle address detected</div>
      )}
    </div>
  )
}
