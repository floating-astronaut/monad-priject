// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MONAD | Gate
/// @notice A minimal permission and attestation layer for autonomous agents.
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
    uint256 public attestationNonce;

    error ZeroAddress();
    error AgentNotRegistered();
    error NotPrincipal();
    error PolicyInactive();
    error ActionNotAllowed();
    error SpendCapExceeded(uint256 requested, uint256 maximum);

    event AgentRegistered(
        address indexed agent,
        address indexed principal,
        string label
    );
    event PolicySet(
        address indexed agent,
        uint256 maxSpend,
        bytes32 indexed allowedActionId,
        bool active
    );
    event ActionAttested(
        bytes32 indexed attestationId,
        address indexed agent,
        address indexed principal,
        bytes32 actionId,
        uint256 amount,
        bytes32 resultHash
    );

    function registerAgent(
        address agent,
        address principal,
        string calldata label
    ) external {
        if (agent == address(0) || principal == address(0)) revert ZeroAddress();
        if (msg.sender != principal) revert NotPrincipal();

        agents[agent] = Agent({
            principal: principal,
            label: label,
            registered: true
        });
        emit AgentRegistered(agent, principal, label);
    }

    function setPolicy(
        address agent,
        uint256 maxSpend,
        bytes32 allowedActionId,
        bool active
    ) external {
        Agent storage registeredAgent = agents[agent];
        if (!registeredAgent.registered) revert AgentNotRegistered();
        if (msg.sender != registeredAgent.principal) revert NotPrincipal();

        policies[agent] = Policy({
            maxSpend: maxSpend,
            allowedActionId: allowedActionId,
            active: active
        });
        emit PolicySet(agent, maxSpend, allowedActionId, active);
    }

    function executeGated(
        bytes32 actionId,
        uint256 amount,
        bytes32 resultHash
    ) external returns (bytes32 attestationId) {
        Agent storage agent = agents[msg.sender];
        if (!agent.registered) revert AgentNotRegistered();

        Policy storage policy = policies[msg.sender];
        if (!policy.active) revert PolicyInactive();
        if (policy.allowedActionId != actionId) revert ActionNotAllowed();
        if (amount > policy.maxSpend) {
            revert SpendCapExceeded(amount, policy.maxSpend);
        }

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
        emit ActionAttested(
            attestationId,
            msg.sender,
            agent.principal,
            actionId,
            amount,
            resultHash
        );
    }
}

