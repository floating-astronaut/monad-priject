// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import "../src/MonadGate.sol";

/// @dev Core unit coverage. BE-2 migrated this file from a hand-rolled `Vm`
///      interface to forge-std: three test files each declared their own
///      partial cheatcode interface, which is exactly the drift that bites when
///      the suite grows.
contract MonadGateTest is Test {
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

    // --- original coverage, preserved -------------------------------------

    function testDenyOverCap() public {
        vm.expectRevert(abi.encodeWithSelector(MonadGate.SpendCapExceeded.selector, 100, 10));
        vm.prank(agent);
        gate.executeGated(action, 100, keccak256("result"));
    }

    function testAllowWithinCap() public {
        vm.prank(agent);
        bytes32 receipt = gate.executeGated(action, 5, keccak256("result"));
        assertTrue(receipt != bytes32(0), "missing attestation");
        assertEq(gate.attestationNonce(), 1, "nonce not advanced");
    }

    function testOnlyPrincipalSetsPolicy() public {
        vm.expectRevert(abi.encodeWithSelector(MonadGate.NotPrincipal.selector));
        vm.prank(address(0xBAD));
        gate.setPolicy(agent, 100, action, true);
    }

    // --- BE-2: boundaries -------------------------------------------------

    /// The cap is inclusive. Off-by-one here would either block a legitimate
    /// action or allow one unit past the principal's limit.
    function testAmountExactlyAtCapIsAllowed() public {
        vm.prank(agent);
        gate.executeGated(action, 10, keccak256("at-cap"));
        assertEq(gate.attestationNonce(), 1);
    }

    function testOneAboveCapIsDenied() public {
        vm.expectRevert(abi.encodeWithSelector(MonadGate.SpendCapExceeded.selector, 11, 10));
        vm.prank(agent);
        gate.executeGated(action, 11, keccak256("above-cap"));
    }

    function testZeroAmountIsAllowed() public {
        vm.prank(agent);
        gate.executeGated(action, 0, keccak256("zero"));
        assertEq(gate.attestationNonce(), 1);
    }

    function testCapOfZeroBlocksEverythingAboveZero() public {
        vm.prank(principal);
        gate.setPolicy(agent, 0, action, true);
        vm.expectRevert(abi.encodeWithSelector(MonadGate.SpendCapExceeded.selector, 1, 0));
        vm.prank(agent);
        gate.executeGated(action, 1, keccak256("zero-cap"));
    }

    // --- BE-2: rejection paths -------------------------------------------

    function testInactivePolicyRejects() public {
        vm.prank(principal);
        gate.setPolicy(agent, 10, action, false);
        vm.expectRevert(abi.encodeWithSelector(MonadGate.PolicyInactive.selector));
        vm.prank(agent);
        gate.executeGated(action, 5, keccak256("paused"));
    }

    function testWrongActionRejects() public {
        vm.expectRevert(abi.encodeWithSelector(MonadGate.ActionNotAllowed.selector));
        vm.prank(agent);
        gate.executeGated(keccak256("SOMETHING_ELSE"), 5, keccak256("wrong-action"));
    }

    function testUnregisteredSenderRejects() public {
        vm.expectRevert(abi.encodeWithSelector(MonadGate.AgentNotRegistered.selector));
        vm.prank(address(0xDEAD));
        gate.executeGated(action, 5, keccak256("stranger"));
    }

    function testZeroAddressRegistrationRejected() public {
        vm.expectRevert(abi.encodeWithSelector(MonadGate.ZeroAddress.selector));
        vm.prank(principal);
        gate.registerAgent(address(0), principal, "nobody");
    }

    /// A denial must not consume the result hash, or a corrected retry with the
    /// same result would be rejected as a replay.
    function testDeniedActionDoesNotConsumeResultHash() public {
        bytes32 result = keccak256("same-result");
        vm.expectRevert(abi.encodeWithSelector(MonadGate.SpendCapExceeded.selector, 100, 10));
        vm.prank(agent);
        gate.executeGated(action, 100, result);

        vm.prank(agent);
        gate.executeGated(action, 5, result);
        assertEq(gate.attestationNonce(), 1);
    }

    // --- BE-2: event assertions ------------------------------------------

    function testRegistrationEmitsExpectedFields() public {
        address fresh = address(0xF00D);
        vm.expectEmit(true, true, true, true);
        emit MonadGate.AgentRegistered(fresh, principal, "Atlas II");
        vm.prank(principal);
        gate.registerAgent(fresh, principal, "Atlas II");
    }

    function testPolicyEmitsExpectedFields() public {
        vm.expectEmit(true, true, true, true);
        emit MonadGate.PolicySet(agent, 42, action, true);
        vm.prank(principal);
        gate.setPolicy(agent, 42, action, true);
    }

    function testAttestationEmitsExpectedFields() public {
        bytes32 result = keccak256("event-fields");
        bytes32 expectedId = keccak256(
            abi.encode(block.chainid, address(gate), agent, principal, action, uint256(5), result, uint256(0))
        );

        vm.expectEmit(true, true, true, true);
        emit MonadGate.ActionAttested(expectedId, agent, principal, action, 5, result, 0);
        vm.prank(agent);
        gate.executeGated(action, 5, result);
    }
}
