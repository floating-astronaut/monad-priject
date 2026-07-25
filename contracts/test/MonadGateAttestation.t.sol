// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import "../src/MonadGate.sol";

/// @dev BE-1b. `SECURITY.md` claims the attestation event binds agent,
///      principal, action, amount, result and nonce so that `attestationId` can
///      be recomputed off chain. Before this lane the nonce was missing and the
///      claim was false. These tests reconstruct the id using *only* what a
///      verifier could read from the log.
contract MonadGateAttestationTest is Test {
    bytes32 constant ATTESTED_TOPIC =
        keccak256("ActionAttested(bytes32,address,address,bytes32,uint256,bytes32,uint256)");

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

    function _attest(uint256 amount, bytes32 result) internal returns (bytes32 returnedId, Vm.Log memory log) {
        vm.recordLogs();
        vm.prank(agent);
        returnedId = gate.executeGated(action, amount, result);

        Vm.Log[] memory logs = vm.getRecordedLogs();
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == ATTESTED_TOPIC) {
                return (returnedId, logs[i]);
            }
        }
        revert("ActionAttested not emitted");
    }

    /// The whole point of the lane: an outside verifier holding only the log
    /// can reproduce the attestation id.
    function testAttestationIdIsRecomputableFromEventAlone() public {
        (bytes32 returnedId, Vm.Log memory log) = _attest(5, keccak256("result-1"));

        // Everything below comes from the log and nothing else.
        address loggedAgent = address(uint160(uint256(log.topics[2])));
        address loggedPrincipal = address(uint160(uint256(log.topics[3])));
        (bytes32 loggedAction, uint256 loggedAmount, bytes32 loggedResult, uint256 loggedNonce) =
            abi.decode(log.data, (bytes32, uint256, bytes32, uint256));

        bytes32 recomputed = keccak256(
            abi.encode(
                block.chainid,
                log.emitter,
                loggedAgent,
                loggedPrincipal,
                loggedAction,
                loggedAmount,
                loggedResult,
                loggedNonce
            )
        );

        assertTrue(recomputed == log.topics[1], "id in the log does not match a recomputation from the log");
        assertTrue(recomputed == returnedId, "recomputed id does not match the returned id");
    }

    /// The nonce must actually advance, or two identical actions would collide.
    function testNonceAdvancesAcrossAttestations() public {
        (, Vm.Log memory first) = _attest(5, keccak256("result-a"));
        (, Vm.Log memory second) = _attest(5, keccak256("result-b"));

        (,,, uint256 firstNonce) = abi.decode(first.data, (bytes32, uint256, bytes32, uint256));
        (,,, uint256 secondNonce) = abi.decode(second.data, (bytes32, uint256, bytes32, uint256));

        assertTrue(firstNonce == 0, "first attestation should carry nonce 0");
        assertTrue(secondNonce == 1, "nonce did not advance");
        assertTrue(first.topics[1] != second.topics[1], "two attestations produced the same id");
    }

    /// A denied action must not consume a nonce - otherwise the sequence a
    /// verifier reconstructs would have unexplained gaps.
    function testDeniedActionDoesNotConsumeNonce() public {
        vm.prank(agent);
        try gate.executeGated(action, 100, keccak256("result-denied")) {
            revert("over-cap action should have reverted");
        } catch {}

        (, Vm.Log memory log) = _attest(5, keccak256("result-after-denial"));
        (,,, uint256 nonce) = abi.decode(log.data, (bytes32, uint256, bytes32, uint256));
        assertTrue(nonce == 0, "a denied action consumed a nonce");
    }
}
