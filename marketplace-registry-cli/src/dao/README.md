# DAO CLI Module

This module provides CLI interfaces for interacting with the three DAO contracts:

1. **DAO Shielded Token** - For minting DAO voting tokens
2. **Funding Shield Token** - For minting funding tokens (admin only)
3. **DAO Voting** - For managing elections and voting

## Structure

```
src/dao/
├── common-types.ts           # Shared types and interfaces
├── dao-shielded-token-api.ts # API functions for DAO shielded token
├── dao-shielded-token-cli.ts # CLI interface for DAO shielded token
├── funding-shield-token-api.ts # API functions for funding shield token
├── funding-shield-token-cli.ts # CLI interface for funding shield token
├── dao-voting-api.ts         # API functions for DAO voting
├── dao-voting-cli.ts         # CLI interface for DAO voting
├── index.ts                  # Module exports
└── README.md                 # This file
```

## Usage

The DAO CLI is integrated into the main CLI. When you run the main CLI, you'll see a menu with options for:

1. Marketplace Registry
2. DAO Shielded Token
3. Funding Shield Token
4. DAO Voting
5. Exit

### DAO Shielded Token

- **Deploy/Join**: Deploy a new contract or join an existing one
- **Mint**: Mint 1000 DAO voting tokens (available to everyone)
- **Display State**: Show current contract state (counter, nonce, TVL)

### Funding Shield Token

- **Deploy/Join**: Deploy a new contract or join an existing one
- **Mint**: Mint 1000 funding tokens (admin only - only the deployer can mint)
- **Display State**: Show current contract state (counter, nonce, TVL, admin)

### DAO Voting

- **Deploy/Join**: Deploy a new contract or join an existing one
- **Open Election**: Start a new election with a given ID
- **Close Election**: End the current election and calculate results
- **Cast Vote**: Vote on the current election (requires DAO voting tokens)
- **Fund Treasury**: Add funding tokens to the DAO treasury
- **Payout Approved Proposal**: Send funds to approved proposals
- **Display State**: Show current contract state
- **Check Election Status**: View current election results

## Contract Dependencies

The DAO voting contract requires both token contract addresses during deployment. Typically, you would:

1. Deploy the DAO shielded token contract
2. Deploy the funding shield token contract
3. Deploy the DAO voting contract with both the funding token address and the DAO vote token address

## Notes

- The CLI provides simplified interfaces for demonstration purposes
- In production, coin selection and more complex interactions would be needed
- All contracts use the same wallet and configuration as the main marketplace registry
- The contracts are organized in a separate `dao/` folder for future repository reorganization
