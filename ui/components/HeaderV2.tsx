import { ConnectButton } from '@web3uikit/web3'

interface HeaderV2Props {

}

export const HeaderV2 = (props: HeaderV2Props) => {
  return <div>
    <ConnectButton moralisAuth={false} />
  </div>
}