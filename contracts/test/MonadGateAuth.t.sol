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

        (address storedPrincipal, , ) = gate.agents(agent);
        require(
            storedPrincipal == principal,
            "SEIZED: unrelated caller overwrote a registered agent"
        );
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

        (uint256 maxSpend, , ) = gate.policies(agent);
        require(
            maxSpend == 10,
            "ESCALATED: attacker raised the spend cap after seizing the agent"
        );
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
