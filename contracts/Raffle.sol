// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Raffle the lottery (paying some amount)
// pick a random winner (verifiably random)
// winner to be selected every x minutes -> completely automated
// chainlink oracle => randomness, chainlink keepers => auto exec
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/KeeperCompatible.sol";

error Raffle__EthNotEnough();
error Raffle__SendingEthFailed();
error Raffle_NotOpen();
error Raffle__UpKeepNotNeeded(uint256 balance, uint256 players, uint256 raffleState);

/**
 * @title Simple Raffle contract
 * @dev This implemented Chainlink VRF v2 and Chainlink Keepers
 */
contract Raffle is VRFConsumerBaseV2, KeeperCompatibleInterface {
  /* Type declarations */
  enum RaffleState {
    OPEN,
    CALCULATING
  }

  /* State varaibles */
  VRFCoordinatorV2Interface immutable i_vrfCoordinator;
  RaffleState private s_raffleState;
  address payable[] private s_players;
  address private immutable i_owner;
  uint256 private immutable i_entranceFee;
  bytes32 private immutable i_gasLane;
  uint64 private immutable i_subscriptionId;
  uint32 private immutable i_callbackGasLimit;
  uint16 private constant REQUEST_CONFIRMATIONS = 3;
  uint16 private constant NUM_WORDS = 1;

  // Chainlink Keeprs variables
  uint256 public immutable i_interval;
  uint256 public s_lastTimeStamp;

  // Lottery variables
  address private s_recentWinner;

  /* Events */
  event RaffleEnter(address indexed player);
  event RequestedRaffleWinner(uint256 indexed requestId);
  event WinnerPicked(address indexed winner);

  constructor(
    address vrfCoordinator,
    uint256 minEth,
    bytes32 gasLane,
    uint64 subscriptionId,
    uint32 callbackGasLimit,
    uint256 interval
  ) VRFConsumerBaseV2(vrfCoordinator) {
    i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinator);
    i_entranceFee = minEth;
    i_owner = msg.sender;
    i_gasLane = gasLane;
    i_subscriptionId = subscriptionId;
    i_callbackGasLimit = callbackGasLimit;
    i_interval = interval;
    s_lastTimeStamp = block.timestamp;
    s_raffleState = RaffleState.OPEN;
  }

  /* Functions */

  /**
   * @dev
   * This is the function that the Chainlink keeper nodes call
   * they look for the `upKeepNeeded` to return true.
   * 1. Our time interval should have passed
   * 2. The lottery should have at least 1 player, and have some ETH
   * 3. Our subscription is funded with LINK
   * 4. The lottery should be in an "open" state.
   */
  function checkUpkeep(
    bytes calldata /* checkData */
  )
    external
    view
    override
    returns (
      bool upkeepNeeded,
      bytes memory /* performData */
    )
  {
    bool isOpen = RaffleState.OPEN == s_raffleState;
    bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
    bool hasPlayers = s_players.length > 0;
    bool hasBalance = address(this).balance > 0;

    upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers);

    return (upkeepNeeded, "0x0"); // can we comment this out?
  }

  /**
   * @dev
   */
  function performUpkeep(
    bytes calldata /* performData */
  ) external override {
    //We highly recommend revalidating the upkeep in the performUpkeep function
    (bool upKeepNeeded, ) = this.checkUpkeep("");
    if (!upKeepNeeded) {
      revert Raffle__UpKeepNotNeeded(
        address(this).balance,
        s_players.length,
        uint256(s_raffleState)
      );
    }

    s_lastTimeStamp = block.timestamp;
    s_raffleState = RaffleState.CALCULATING;
    uint256 requestId = i_vrfCoordinator.requestRandomWords(
      i_gasLane,
      i_subscriptionId,
      REQUEST_CONFIRMATIONS,
      i_callbackGasLimit, // sets the limit for how much computation fulfillRandomWords can consume
      NUM_WORDS
    );
    emit RequestedRaffleWinner(requestId);
    // We don't use the performData in this example. The performData is generated by the Keeper's call to your checkUpkeep function
  }

  function enterRaffle() public payable {
    if (msg.value < i_entranceFee) {
      revert Raffle__EthNotEnough();
    }

    if (s_raffleState != RaffleState.OPEN) {
      revert Raffle_NotOpen();
    }

    s_players.push(payable(msg.sender));
    emit RaffleEnter(msg.sender);
  }

  function fulfillRandomWords(uint256, uint256[] memory randomWords) internal override {
    uint256 indexOfWinner = randomWords[0] % s_players.length;
    address payable recentWinner = s_players[indexOfWinner];
    s_recentWinner = recentWinner;
    s_raffleState = RaffleState.OPEN;
    s_players = new address payable[](0);
    (bool success, ) = s_recentWinner.call{value: address(this).balance}("");
    if (!success) {
      revert Raffle__SendingEthFailed();
    }
    emit WinnerPicked(s_recentWinner);
  }

  /* View / Pure functions */
  function getEntranceFee() public view returns (uint256) {
    return i_entranceFee;
  }

  function getPlayer(uint256 index) public view returns (address) {
    return s_players[index];
  }

  function getRaffleState() public view returns (RaffleState) {
    return s_raffleState;
  }

   function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

  function getNumWords() public pure returns (uint256) {
    return NUM_WORDS;
  }

  function getNumberOfPlayers() public view returns (uint256) {
    return s_players.length;
  }

  function getLatestTimestamp() public view returns (uint256) {
    return s_lastTimeStamp;
  }

  function getInterval() public view returns (uint256) {
    return i_interval;
  }

  /* Modifiers */
  modifier onlyOwner() {
    require(msg.sender == i_owner);
    _;
  }
}
