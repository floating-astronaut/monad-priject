// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../src/MonadGate.sol";

/// @dev BE-1 authorization tests.
/// These assert the behaviour OP-1 decided, not the behaviour the contract has
/// today. They are expected to FAIL against the pre-BE-1 contract; that red run
/// is the evidence that the flaw is real. `vm.expectRevert()` is used without a
/// selector so the file compiles before the new errors exist.
interface Vm {
    function prank(address) external;
    function expectRevert() external;
}

contract MonadGateAuthTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    MonadGate gate;
    address principal = address(0xA11CE);
    address agent = address(0xA6E17);
    address attacker = address(0xBAD);
    bytes32 action = keccak256("TRANSFER_MOCK");

    function setUp() public {
        gate = new MonadGate();
        vm.prank(principal);
        gate.registerAgent(agent, principal, "Atlas");
        vm.prank(principal);
        gate.setPolicy(agent, 10, action, true);
    }

    /// The DOC-1 finding, stated as a consequence rather than a revert:
    /// after a hostile registration attempt the principal must be unchanged.
    function testPrincipalUnchangedAfterHostileRegister() public {
        vm.prank(attacker);
        try gate.registerAgent(agent, attacker, "seized") {} catch {}

        (address storedPrincipal,,) = gate.agents(agent);
        require(storedPrincipal == principal, "SEIZED: unrelated caller overwrote a registered agent");
    }

    /// The same flaw stated as the revert we want.
    function testHostileRegisterReverts() public {
        vm.expectRevert();
        vm.prank(attacker);
        gate.registerAgent(agent, attacker, "seized");
    }

    /// Full exploit chain: seizing the identity hands the attacker the policy.
    function testSeizureCannotGrantPolicyControl() public {
        vm.prank(attacker);
        try gate.registerAgent(agent, attacker, "seized") {} catch {}

        vm.prank(attacker);
        try gate.setPolicy(agent, type(uint256).max, action, true) {} catch {}

        (uint256 maxSpend,,) = gate.policies(agent);
        require(maxSpend == 10, "ESCALATED: attacker raised the spend cap after seizing the agent");
    }

    /// OP-1 Q9 — a resultHash may not be attested twice by the same agent.
    function testDuplicateResultHashRejected() public {
        vm.prank(agent);
        gate.executeGated(action, 5, keccak256("result"));

        vm.expectRevert();
        vm.prank(agent);
        gate.executeGated(action, 5, keccak256("result"));
    }

    /// OP-1 Q2 — principal and agent must never be the same address.
    function testPrincipalCannotEqualAgent() public {
        vm.expectRevert();
        vm.prank(attacker);
        gate.registerAgent(attacker, attacker, "self");
    }
}

interface VmFull {
    function prank(address) external;
    function expectRevert() external;
    function expectRevert(bytes calldata) external;
}

/// @dev BE-1 rotation tests (OP-1 Q1). Rotation is the half of the decision
/// that adds new surface, so it carries its own authorization coverage.
contract MonadGateRotationTest {
    VmFull constant vm = VmFull(address(uint160(uint256(keccak256("hevm cheat code")))));

    MonadGate gate;
    address principal = address(0xA11CE);
    address newPrincipal = address(0xB0B);
    address agent = address(0xA6E17);
    address newAgent = address(0xA6E18);
    address attacker = address(0xBAD);
    bytes32 action = keccak256("TRANSFER_MOCK");

    function setUp() public {
        gate = new MonadGate();
        vm.prank(principal);
        gate.registerAgent(agent, principal, "Atlas");
        vm.prank(principal);
        gate.setPolicy(agent, 10, action, true);
    }

    function testAttackerCannotTransferPrincipal() public {
        vm.expectRevert(abi.encodeWithSelector(MonadGate.NotPrincipal.selector));
        vm.prank(attacker);
        gate.transferPrincipal(agent, attacker);
    }

    function testTransferPrincipalMovesAuthority() public {
        vm.prank(principal);
        gate.transferPrincipal(agent, newPrincipal);

        // Old principal is now powerless.
        vm.expectRevert(abi.encodeWithSelector(MonadGate.NotPrincipal.selector));
        vm.prank(principal);
        gate.setPolicy(agent, 999, action, true);

        // New principal has control.
        vm.prank(newPrincipal);
        gate.setPolicy(agent, 20, action, true);
        (uint256 maxSpend,,) = gate.policies(agent);
        require(maxSpend == 20, "new principal could not set policy");
    }

    function testAttackerCannotRotateAgent() public {
        vm.expectRevert(abi.encodeWithSelector(MonadGate.NotPrincipal.selector));
        vm.prank(attacker);
        gate.rotateAgent(agent, attacker);
    }

    function testRotateCarriesPolicyAndClearsOldSlot() public {
        vm.prank(principal);
        gate.rotateAgent(agent, newAgent);

        // Policy travelled with the identity.
        (uint256 newCap, bytes32 newAction, bool newActive) = gate.policies(newAgent);
        require(newCap == 10, "policy did not travel to the new agent");
        require(newAction == action, "action id did not travel");
        require(newActive, "policy arrived inactive");

        // Old slot is fully cleared -- identity and policy.
        (,, bool stillRegistered) = gate.agents(agent);
        require(!stillRegistered, "old agent still registered");
        (uint256 oldCap,, bool oldActive) = gate.policies(agent);
        require(oldCap == 0 && !oldActive, "stale policy left on old agent");

        // Retired address can no longer act.
        vm.expectRevert(abi.encodeWithSelector(MonadGate.AgentNotRegistered.selector));
        vm.prank(agent);
        gate.executeGated(action, 5, keccak256("after-rotation"));

        // New address can.
        vm.prank(newAgent);
        gate.executeGated(action, 5, keccak256("after-rotation"));
    }

    function testRotateCannotOverwriteRegisteredAgent() public {
        vm.prank(newPrincipal);
        gate.registerAgent(newAgent, newPrincipal, "Someone else");

        vm.expectRevert(abi.encodeWithSelector(MonadGate.AgentAlreadyRegistered.selector, newAgent));
        vm.prank(principal);
        gate.rotateAgent(agent, newAgent);
    }

    /// @dev Documents a known consequence of per-agent replay keying: a
    /// rotated identity starts with an empty replay set, so a result hash
    /// already attested by the old address can be attested again by the new
    /// one. Recorded as tested behaviour, not discovered later.
    function testRotationResetsReplayProtection() public {
        vm.prank(agent);
        gate.executeGated(action, 5, keccak256("reused"));

        vm.prank(principal);
        gate.rotateAgent(agent, newAgent);

        vm.prank(newAgent);
        gate.executeGated(action, 5, keccak256("reused"));
    }
}
