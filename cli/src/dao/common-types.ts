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

import { DaoShieldedToken, type DaoShieldedTokenPrivateState } from 'midnight-workshop-dao-contracts';
import { FundingShieldToken, type FundingShieldTokenPrivateState } from 'midnight-workshop-dao-contracts';
import { DaoVoting, type DaoVotingPrivateState } from 'midnight-workshop-dao-contracts';
import type { ImpureCircuitId, MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import type { DeployedContract, FoundContract } from '@midnight-ntwrk/midnight-js-contracts';

// DAO Shielded Token types
export type DaoShieldedTokenCircuits = ImpureCircuitId<DaoShieldedToken.Contract<DaoShieldedTokenPrivateState>>;
export const DaoShieldedTokenPrivateStateId = 'daoShieldedTokenPrivateState';
export type DaoShieldedTokenProviders = MidnightProviders<DaoShieldedTokenCircuits, typeof DaoShieldedTokenPrivateStateId, DaoShieldedTokenPrivateState>;
export type DaoShieldedTokenContract = DaoShieldedToken.Contract<DaoShieldedTokenPrivateState>;
export type DeployedDaoShieldedTokenContract = DeployedContract<DaoShieldedTokenContract> | FoundContract<DaoShieldedTokenContract>;

// Funding Shield Token types
export type FundingShieldTokenCircuits = ImpureCircuitId<FundingShieldToken.Contract<FundingShieldTokenPrivateState>>;
export const FundingShieldTokenPrivateStateId = 'fundingShieldTokenPrivateState';
export type FundingShieldTokenProviders = MidnightProviders<FundingShieldTokenCircuits, typeof FundingShieldTokenPrivateStateId, FundingShieldTokenPrivateState>;
export type FundingShieldTokenContract = FundingShieldToken.Contract<FundingShieldTokenPrivateState>;
export type DeployedFundingShieldTokenContract = DeployedContract<FundingShieldTokenContract> | FoundContract<FundingShieldTokenContract>;

// DAO Voting types
export type DaoVotingCircuits = ImpureCircuitId<DaoVoting.Contract<DaoVotingPrivateState>>;
export const DaoVotingPrivateStateId = 'daoVotingPrivateState';
export type DaoVotingProviders = MidnightProviders<DaoVotingCircuits, typeof DaoVotingPrivateStateId, DaoVotingPrivateState>;
export type DaoVotingContract = DaoVoting.Contract<DaoVotingPrivateState>;
export type DeployedDaoVotingContract = DeployedContract<DaoVotingContract> | FoundContract<DaoVotingContract>;

// DAO State interfaces
export interface DaoShieldedTokenState {
  counter: bigint;
  nonce: Uint8Array;
  tvl: bigint;
}

export interface FundingShieldTokenState {
  counter: bigint;
  nonce: Uint8Array;
  tvl: bigint;
  admin: Uint8Array;
}

export interface DaoVotingState {
  election_open: boolean;
  election_id: Uint8Array;
  yes_votes: bigint;
  no_votes: bigint;
  absent_votes: bigint;
  has_voted: Map<Uint8Array, boolean>;
  treasury: {
    color: Uint8Array;
    value: bigint;
  };
  voting_temporay_coin: {
    color: Uint8Array;
    value: bigint;
  };
  treasury_coin_color: Uint8Array;
  dao_vote_coin_color: Uint8Array;
  total_votes: bigint;
}

// Vote types
export enum VoteType {
  YES = 0,
  NO = 1,
  ABSENT = 2,
}

// Election status
export interface ElectionStatus {
  isOpen: boolean;
  electionId: string;
  yesVotes: bigint;
  noVotes: bigint;
  absentVotes: bigint;
  totalVotes: bigint;
}
