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

import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { DaoVoting, type DaoVotingPrivateState, witnesses } from '@midnight-ntwrk/marketplace-registry-contract';
import { type FinalizedTxData } from '@midnight-ntwrk/midnight-js-types';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { type Logger } from 'pino';
import { assertIsContractAddress } from '@midnight-ntwrk/midnight-js-utils';
import {
  type DaoVotingProviders,
  type DeployedDaoVotingContract,
  type DaoVotingState,
  type VoteType,
  type ElectionStatus,
} from './common-types';

let logger: Logger;

export const daoVotingContractInstance: DaoVoting.Contract<DaoVotingPrivateState> = new DaoVoting.Contract(witnesses);

export const getDaoVotingLedgerState = async (
  providers: DaoVotingProviders,
  contractAddress: ContractAddress,
): Promise<DaoVotingState | null> => {
  assertIsContractAddress(contractAddress);
  logger.info('Checking DAO voting contract ledger state...');
  const state = await providers.publicDataProvider
    .queryContractState(contractAddress)
    .then((contractState) => (contractState != null ? DaoVoting.ledger(contractState.data) : null));
  logger.info(`Ledger state: ${state ? 'DAO voting available' : 'No state'}`);
  return state;
};

export const joinDaoVotingContract = async (
  providers: DaoVotingProviders,
  contractAddress: string,
): Promise<DeployedDaoVotingContract> => {
  const daoVotingContract = await findDeployedContract(providers, {
    contractAddress,
    contract: daoVotingContractInstance,
    privateStateId: 'daoVotingPrivateState',
    initialPrivateState: {},
  });
  logger.info(`Joined DAO voting contract at address: ${daoVotingContract.deployTxData.public.contractAddress}`);
  return daoVotingContract;
};

export const deployDaoVotingContract = async (
  providers: DaoVotingProviders,
  privateState: DaoVotingPrivateState,
): Promise<DeployedDaoVotingContract> => {
  logger.info('Deploying DAO voting contract...');
  const daoVotingContract = await deployContract(providers, {
    contract: daoVotingContractInstance,
    privateStateId: 'daoVotingPrivateState',
    initialPrivateState: privateState,
  });
  logger.info(`Deployed DAO voting contract at address: ${daoVotingContract.deployTxData.public.contractAddress}`);
  return daoVotingContract;
};

export const openElection = async (
  daoVotingContract: DeployedDaoVotingContract,
  electionId: string,
): Promise<FinalizedTxData> => {
  logger.info(`Opening election with ID: ${electionId}`);
  const electionIdBytes = new TextEncoder().encode(electionId);
  const finalizedTxData = await daoVotingContract.callTx.open_election(electionIdBytes);
  logger.info(`Transaction ${finalizedTxData.public.txId} added in block ${finalizedTxData.public.blockHeight}`);
  return finalizedTxData.public;
};

export const closeElection = async (
  daoVotingContract: DeployedDaoVotingContract,
): Promise<FinalizedTxData> => {
  logger.info('Closing election...');
  const finalizedTxData = await daoVotingContract.callTx.close_election();
  logger.info(`Transaction ${finalizedTxData.public.txId} added in block ${finalizedTxData.public.blockHeight}`);
  return finalizedTxData.public;
};

export const castVote = async (
  daoVotingContract: DeployedDaoVotingContract,
  voteType: VoteType,
  voteCoin: any, // CoinInfo type from the contract
): Promise<FinalizedTxData> => {
  const voteTypeNames = ['YES', 'NO', 'ABSENT'];
  logger.info(`Casting ${voteTypeNames[voteType]} vote...`);
  const finalizedTxData = await daoVotingContract.callTx.cast_vote(voteType, voteCoin);
  logger.info(`Transaction ${finalizedTxData.public.txId} added in block ${finalizedTxData.public.blockHeight}`);
  return finalizedTxData.public;
};

export const fundTreasury = async (
  daoVotingContract: DeployedDaoVotingContract,
  fundCoin: any, // CoinInfo type from the contract
): Promise<FinalizedTxData> => {
  logger.info('Funding treasury...');
  const finalizedTxData = await daoVotingContract.callTx.fund_treasury(fundCoin);
  logger.info(`Transaction ${finalizedTxData.public.txId} added in block ${finalizedTxData.public.blockHeight}`);
  return finalizedTxData.public;
};

export const payoutApprovedProposal = async (
  daoVotingContract: DeployedDaoVotingContract,
  to: Uint8Array, // ZswapCoinPublicKey
  amount: bigint,
): Promise<FinalizedTxData> => {
  logger.info(`Paying out approved proposal: ${amount} to ${Buffer.from(to).toString('hex')}`);
  const finalizedTxData = await daoVotingContract.callTx.payout_approved_proposal(to, amount);
  logger.info(`Transaction ${finalizedTxData.public.txId} added in block ${finalizedTxData.public.blockHeight}`);
  return finalizedTxData.public;
};

export const getElectionStatus = async (
  providers: DaoVotingProviders,
  contractAddress: ContractAddress,
): Promise<ElectionStatus | null> => {
  const state = await getDaoVotingLedgerState(providers, contractAddress);
  if (state === null) {
    return null;
  }

  return {
    isOpen: state.election_open,
    electionId: Buffer.from(state.election_id).toString('hex'),
    yesVotes: state.yes_votes,
    noVotes: state.no_votes,
    absentVotes: state.absent_votes,
    totalVotes: state.total_votes,
  };
};

export const displayDaoVotingState = async (
  providers: DaoVotingProviders,
  daoVotingContract: DeployedDaoVotingContract,
): Promise<{ state: DaoVotingState | null; contractAddress: string }> => {
  const contractAddress = daoVotingContract.deployTxData.public.contractAddress;
  const state = await getDaoVotingLedgerState(providers, contractAddress);
  if (state === null) {
    logger.info(`There is no DAO voting contract deployed at ${contractAddress}.`);
  } else {
    logger.info(`DAO Voting State:`);
    logger.info(`  Election Open: ${state.election_open}`);
    logger.info(`  Election ID: ${Buffer.from(state.election_id).toString('hex')}`);
    logger.info(`  Yes Votes: ${state.yes_votes}`);
    logger.info(`  No Votes: ${state.no_votes}`);
    logger.info(`  Absent Votes: ${state.absent_votes}`);
    logger.info(`  Total Votes: ${state.total_votes}`);
    logger.info(`  Treasury Value: ${state.treasury.value}`);
    logger.info(`  Treasury Coin Color: ${Buffer.from(state.treasury.color).toString('hex')}`);
    logger.info(`  DAO Vote Coin Color: ${Buffer.from(state.dao_vote_coin_color).toString('hex')}`);
    logger.info(`  Has Voted Map Size: ${state.has_voted.size}`);
  }
  return { contractAddress, state };
};

export function setLogger(_logger: Logger) {
  logger = _logger;
}
