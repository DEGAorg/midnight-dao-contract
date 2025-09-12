// This file is part of midnightntwrk/marketplace-registry.
// Copyright (C) 2025 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

export * from './common-types';

// Re-export specific functions to avoid conflicts
export { runDaoShieldedTokenCli } from './dao-shielded-token-cli';
export { runFundingShieldTokenCli } from './funding-shield-token-cli';
export { runDaoVotingCli } from './dao-voting-cli';

// Export API functions without setLogger conflicts
export {
  deployDaoShieldedTokenContract,
  mintDaoVotingTokens,
  getDaoShieldedTokenLedgerState,
  joinDaoShieldedTokenContract
} from './dao-shielded-token-api';

export {
  deployFundingShieldTokenContract,
  mintFundingTokens,
  getFundingShieldTokenLedgerState,
  joinFundingShieldTokenContract
} from './funding-shield-token-api';

export {
  deployDaoVotingContract,
  openElection,
  closeElection,
  castVote,
  fundTreasury,
  payoutApprovedProposal,
  getDaoVotingLedgerState,
  joinDaoVotingContract,
  getElectionStatus
} from './dao-voting-api';
