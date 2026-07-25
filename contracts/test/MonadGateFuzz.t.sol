// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import "../src/MonadGate.sol";

/// @dev BE-2 fuzz coverage. These are the properties `TESTING.md` requires,
///      stated so that a counterexample is a real finding rather than a
///      restatement of the implementation.
contract MonadGateFuzzTest is Test {
    MonadGate gate;
    address principal = address(0xA11CE);
    address agent = address(0xA6E17);
    bytes32 action = keccak256("TRANSFER_MOCK");
    uint256 constant CAP = 10;

    function setUp() public {
        gate = new MonadGate();
        vm.prank(principal);
        gate.registerAgent(agent, principal, "Atlas");
        vm.prank(principal);
        gate.setPolicy(agent, CAP, action, true);
    }

    /// No amount above the cap may ever attest, for any cap and any amount.
    function testFuzzAboveCapNeverAttests(uint256 cap, uint256 amount, bytes32 result) public {
        cap = bound(cap, 0, type(uint256).max - 1);
        amount = bound(amount, cap + 1, type(uint256).max);

        vm.prank(principal);
        gate.setPolicy(agent, cap, action, true);

        vm.expectRevert(abi.encodeWithSelector(MonadGate.SpendCapExceeded.selector, amount, cap));
        vm.prank(agent);
        gate.executeGated(action, amount, result);

        assertEq(gate.attestationNonce(), 0, "a denied action advanced the nonce");
    }

    /// Anything at or below the cap must attest when the policy is active.
    function testFuzzWithinCapAlwaysAttests(uint256 cap, uint256 amount, bytes32 result) public {
        cap = bound(cap, 0, type(uint256).max);
        amount = bound(amount, 0, cap);

        vm.prank(principal);
        gate.setPolicy(agent, cap, action, true);

        vm.prank(agent);
        bytes32 id = gate.executeGated(action, amount, result);

        assertTrue(id != bytes32(0), "attestation id must not be empty");
        assertEq(gate.attestationNonce(), 1, "nonce must advance exactly once");
    }

    /// An unregistered sender can never attest, whatever it sends.
    function testFuzzUnregisteredSenderNeverAttests(address sender, uint256 amount, bytes32 result) public {
        vm.assume(sender != agent);

        vm.expectRevert(abi.encodeWithSelector(MonadGate.AgentNotRegistered.selector));
        vm.prank(sender);
        gate.executeGated(action, amount, result);
    }

    /// Only the stored principal may mutate a policy.
    function testFuzzNonPrincipalNeverMutatesPolicy(address caller, uint256 cap, bool active) public {
        vm.assume(caller != principal);

        vm.expectRevert(abi.encodeWithSelector(MonadGate.NotPrincipal.selector));
        vm.prank(caller);
        gate.setPolicy(agent, cap, action, active);

        (uint256 storedCap,, bool storedActive) = gate.policies(agent);
        assertEq(storedCap, CAP, "cap changed");
        assertTrue(storedActive, "policy state changed");
    }

    /// Any action id other than the allowed one is rejected, even under the cap.
    function testFuzzActionMismatchNeverAttests(bytes32 wrongAction, uint256 amount, bytes32 result) public {
        vm.assume(wrongAction != action);
        amount = bound(amount, 0, CAP);

        vm.expectRevert(abi.encodeWithSelector(MonadGate.ActionNotAllowed.selector));
        vm.prank(agent);
        gate.executeGated(wrongAction, amount, result);
    }

    /// A result hash cannot be attested twice by the same agent (OP-1 Q9).
    function testFuzzReplayAlwaysRejected(uint256 amount, bytes32 result) public {
        amount = bound(amount, 0, CAP);

        vm.prank(agent);
        gate.executeGated(action, amount, result);

        vm.expectRevert(abi.encodeWithSelector(MonadGate.ResultAlreadyAttested.selector, agent, result));
        vm.prank(agent);
        gate.executeGated(action, amount, result);

        assertEq(gate.attestationNonce(), 1, "replay advanced the nonce");
    }

    /// An unrelated caller can never take over a registered agent (BE-1).
    function testFuzzRegistrationCannotBeSeized(address attacker) public {
        vm.assume(attacker != principal && attacker != agent && attacker != address(0));

        vm.expectRevert(abi.encodeWithSelector(MonadGate.AgentAlreadyRegistered.selector, agent));
        vm.prank(attacker);
        gate.registerAgent(agent, attacker, "seized");

        (address storedPrincipal,,) = gate.agents(agent);
        assertEq(storedPrincipal, principal, "principal was overwritten");
    }
}

/// Drives the gate with arbitrary amounts and counts how many calls the
/// contract actually accepted.
contract GateHandler is Test {
    MonadGate public gate;
    address public agent;
    bytes32 public action;
    uint256 public cap;
    uint256 public accepted;

    constructor(MonadGate gate_, address agent_, bytes32 action_, uint256 cap_) {
        gate = gate_;
        agent = agent_;
        action = action_;
        cap = cap_;
    }

    function tryExecute(uint256 amount, bytes32 result) external {
        amount = bound(amount, 0, cap * 4);
        vm.prank(agent);
        try gate.executeGated(action, amount, result) {
            accepted++;
        } catch {}
    }

    function tryWrongAction(uint256 amount, bytes32 wrongAction, bytes32 result) external {
        vm.prank(agent);
        try gate.executeGated(wrongAction, amount, result) {
            accepted++;
        } catch {}
    }

    function tryStranger(address sender, uint256 amount, bytes32 result) external {
        vm.prank(sender);
        try gate.executeGated(action, amount, result) {
            accepted++;
        } catch {}
    }
}

/// @dev The nonce is what makes an attestation id reconstructible (BE-1b). If it
///      ever advanced on a rejected call, an off-chain verifier replaying the
///      log would find gaps it cannot explain.
contract MonadGateInvariantTest is Test {
    MonadGate gate;
    GateHandler handler;
    address principal = address(0xA11CE);
    address agent = address(0xA6E17);
    bytes32 action = keccak256("TRANSFER_MOCK");

    function setUp() public {
        gate = new MonadGate();
        vm.prank(principal);
        gate.registerAgent(agent, principal, "Atlas");
        vm.prank(principal);
        gate.setPolicy(agent, 10, action, true);

        handler = new GateHandler(gate, agent, action, 10);
        targetContract(address(handler));
    }

    /// The nonce advances once per accepted action and never otherwise.
    function invariant_NonceMatchesAcceptedActions() public view {
        assertEq(gate.attestationNonce(), handler.accepted());
    }

    /// Identity is immutable under arbitrary agent activity.
    function invariant_PrincipalNeverChanges() public view {
        (address storedPrincipal,, bool registered) = gate.agents(agent);
        assertEq(storedPrincipal, principal);
        assertTrue(registered);
    }
}
