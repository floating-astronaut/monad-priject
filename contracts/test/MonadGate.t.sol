// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../src/MonadGate.sol";

interface Vm {
    function prank(address) external;
    function expectRevert(bytes calldata) external;
}

contract MonadGateTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    MonadGate gate;
    address principal = address(0xA11CE);
    address agent = address(0xA6E17);
    bytes32 action = keccak256("TRANSFER_MOCK");

    function setUp() public {
        gate = new MonadGate();
        vm.prank(principal);
        gate.registerAgent(agent, principal, "Atlas");
        vm.prank(principal);
        gate.setPolicy(agent, 10, action, true);
    }

    function testDenyOverCap() public {
        vm.expectRevert(
            abi.encodeWithSelector(MonadGate.SpendCapExceeded.selector, 100, 10)
        );
        vm.prank(agent);
        gate.executeGated(action, 100, keccak256("result"));
    }

    function testAllowWithinCap() public {
        vm.prank(agent);
        bytes32 receipt = gate.executeGated(action, 5, keccak256("result"));
        require(receipt != bytes32(0), "missing attestation");
        require(gate.attestationNonce() == 1, "nonce not advanced");
    }

    function testOnlyPrincipalSetsPolicy() public {
        vm.expectRevert(abi.encodeWithSelector(MonadGate.NotPrincipal.selector));
        vm.prank(address(0xBAD));
        gate.setPolicy(agent, 100, action, true);
    }
}

