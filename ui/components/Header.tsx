import { useCallback, useEffect } from "react"
import { useMoralis } from "react-moralis"

interface HeaderProps {}

const LOCAL_STORAGE_KEY_CONNECTED = "LOCAL_STORAGE_KEY_CONNECTED"

export const Header = (props: HeaderProps) => {
  const { enableWeb3, account, isWeb3Enabled, Moralis, deactivateWeb3 } = useMoralis()

  const connect = async () => {
    await enableWeb3()

    if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCAL_STORAGE_KEY_CONNECTED, "injected")
    }
  }

  const buttonNode = <button onClick={connect}>Connect</button>

  const connectedNode = useCallback(() => {
    if (!account) {
      return null
    }

    const ellipsisAccount = `${account.slice(0, 6)}...${account.slice(account.length - 4)}`

    return <div>Conneted to {ellipsisAccount}</div>
  }, [account])

  useEffect(() => {
    if (!isWeb3Enabled && typeof window !== "undefined") {
      if (window.localStorage.getItem(LOCAL_STORAGE_KEY_CONNECTED)) {
        enableWeb3()
      }
    }
  }, [isWeb3Enabled])

  useEffect(() => {
    Moralis.onAccountChanged((account) => {
      if (account === null) {
        window.localStorage.removeItem(LOCAL_STORAGE_KEY_CONNECTED)
        deactivateWeb3()
      }
    })
  }, [])

  return <div>{account ? connectedNode() : buttonNode}</div>
}
