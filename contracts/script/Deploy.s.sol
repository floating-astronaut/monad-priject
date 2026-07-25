// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../src/MonadGate.sol";

interface Vm {
    function startBroadcast() external;
    function stopBroadcast() external;
}

contract Deploy {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run() external returns (MonadGate gate) {
        vm.startBroadcast();
        gate = new MonadGate();
        vm.stopBroadcast();
    }
}
