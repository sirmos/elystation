// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Test version of the Elystation token. It has no value and exists
/// only on testnet, so people can try the fee discount.
contract MockELYST is ERC20 {
    constructor() ERC20("Elystation (test)", "ELYST") {}

    /// @notice Anyone can get 1,000 test ELYST.
    function faucet() external {
        _mint(msg.sender, 1000 * 10 ** 18);
    }
}