// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MONAD | Gate
/// @notice A minimal permission and attestation layer for autonomous agents.
/// @dev `maxSpend` and `amount` are abstract policy units (OP-1 Q8) — plain
///      integers with no decimals and no MON conversion. No value is
///      transferred by this contract; a successful attestation proves policy
///      evaluation, not completion of a downstream action.
contract MonadGate {
    struct Agent {
        address principal;
        string label;
        bool registered;
    }

    struct Policy {
        uint256 maxSpend;
        bytes32 allowedActionId;
        bool active;
    }

    mapping(address => Agent) public agents;
    mapping(address => Policy) public policies;

    /// @notice Result hashes already attested, keyed by agent (OP-1 Q9).
    /// @dev Keyed per-agent rather than globally so one agent cannot burn a
    ///      result hash another agent intends to use. Consequence to be aware
    ///      of: `rotateAgent` moves identity to a fresh address, which starts
    ///      with an empty replay set. Documented in ARCHITECTURE.md.
    mapping(address => mapping(bytes32 => bool)) public attestedResult;

    uint256 public attestationNonce;

    error ZeroAddress();
    error AgentNotRegistered();
    error NotPrincipal();
    error PolicyInactive();
    error ActionNotAllowed();
    error SpendCapExceeded(uint256 requested, uint256 maximum);
    error AgentAlreadyRegistered(address agent);
    error PrincipalIsAgent();
    error ResultAlreadyAttested(address agent, bytes32 resultHash);

    event AgentRegistered(address indexed agent, address indexed principal, string label);
    event PolicySet(address indexed agent, uint256 maxSpend, bytes32 indexed allowedActionId, bool active);
    event PrincipalTransferred(address indexed agent, address indexed oldPrincipal, address indexed newPrincipal);
    event AgentRotated(address indexed oldAgent, address indexed newAgent, address indexed principal);
    event ActionAttested(
        bytes32 indexed attestationId,
        address indexed agent,
        address indexed principal,
        bytes32 actionId,
        uint256 amount,
        bytes32 resultHash
    );

    /// @notice Bind an agent address to the calling principal.
    /// @dev Reverts if `agent` is already registered. Without that guard any
    ///      caller can name itself principal and seize a live agent.
    ///      Re-binding an existing agent goes through `rotateAgent` or
    ///      `transferPrincipal`, which authenticate the current principal.
    function registerAgent(address agent, address principal, string calldata label) external {
        if (agent == address(0) || principal == address(0)) revert ZeroAddress();
        if (agent == principal) revert PrincipalIsAgent();
        if (msg.sender != principal) revert NotPrincipal();
        if (agents[agent].registered) revert AgentAlreadyRegistered(agent);

        agents[agent] = Agent({principal: principal, label: label, registered: true});
        emit AgentRegistered(agent, principal, label);
    }

    function setPolicy(address agent, uint256 maxSpend, bytes32 allowedActionId, bool active) external {
        Agent storage registeredAgent = agents[agent];
        if (!registeredAgent.registered) revert AgentNotRegistered();
        if (msg.sender != registeredAgent.principal) revert NotPrincipal();

        policies[agent] = Policy({maxSpend: maxSpend, allowedActionId: allowedActionId, active: active});
        emit PolicySet(agent, maxSpend, allowedActionId, active);
    }

    /// @notice Hand principal authority over `agent` to a new address.
    /// @dev Principal-key recovery. Only the current principal may call.
    function transferPrincipal(address agent, address newPrincipal) external {
        Agent storage registeredAgent = agents[agent];
        if (!registeredAgent.registered) revert AgentNotRegistered();
        if (msg.sender != registeredAgent.principal) revert NotPrincipal();
        if (newPrincipal == address(0)) revert ZeroAddress();
        if (newPrincipal == agent) revert PrincipalIsAgent();

        address oldPrincipal = registeredAgent.principal;
        registeredAgent.principal = newPrincipal;
        emit PrincipalTransferred(agent, oldPrincipal, newPrincipal);
    }

    /// @notice Move an identity and its policy to a new agent address.
    /// @dev Agent-key recovery. The policy is carried deliberately and the old
    ///      slot is cleared — leaving a stale policy behind would let a
    ///      retired address keep an active cap.
    function rotateAgent(address oldAgent, address newAgent) external {
        Agent storage registeredAgent = agents[oldAgent];
        if (!registeredAgent.registered) revert AgentNotRegistered();
        if (msg.sender != registeredAgent.principal) revert NotPrincipal();
        if (newAgent == address(0)) revert ZeroAddress();
        if (newAgent == registeredAgent.principal) revert PrincipalIsAgent();
        if (agents[newAgent].registered) revert AgentAlreadyRegistered(newAgent);

        address principal = registeredAgent.principal;
        string memory label = registeredAgent.label;

        agents[newAgent] = Agent({principal: principal, label: label, registered: true});
        policies[newAgent] = policies[oldAgent];

        delete agents[oldAgent];
        delete policies[oldAgent];

        emit AgentRotated(oldAgent, newAgent, principal);
    }

    function executeGated(bytes32 actionId, uint256 amount, bytes32 resultHash)
        external
        returns (bytes32 attestationId)
    {
        Agent storage agent = agents[msg.sender];
        if (!agent.registered) revert AgentNotRegistered();

        Policy storage policy = policies[msg.sender];
        if (!policy.active) revert PolicyInactive();
        if (policy.allowedActionId != actionId) revert ActionNotAllowed();
        if (amount > policy.maxSpend) {
            revert SpendCapExceeded(amount, policy.maxSpend);
        }

        // Checked last so a denied action never consumes the result hash.
        if (attestedResult[msg.sender][resultHash]) {
            revert ResultAlreadyAttested(msg.sender, resultHash);
        }
        attestedResult[msg.sender][resultHash] = true;

        attestationId = keccak256(
            abi.encode(
                block.chainid,
                address(this),
                msg.sender,
                agent.principal,
                actionId,
                amount,
                resultHash,
                attestationNonce++
            )
        );
        emit ActionAttested(attestationId, msg.sender, agent.principal, actionId, amount, resultHash);
    }
}
