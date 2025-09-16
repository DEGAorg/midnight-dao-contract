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

import { stdin as input, stdout as output } from 'node:process';
import { createInterface, type Interface } from 'node:readline/promises';
import { type Logger } from 'pino';
import path from 'node:path';
import { type Config } from '../config';
import { type Resource } from '@midnight-ntwrk/wallet';
import { type Wallet } from '@midnight-ntwrk/wallet-api';
import { type DaoVotingProviders, type DeployedDaoVotingContract, type VoteType } from './common-types';
import * as api from './dao-voting-api';
import { createWalletAndMidnightProvider, randomBytes } from '../api';
import { tokenType, encodeTokenType, encodeCoinPublicKey } from '@midnight-ntwrk/compact-runtime';
import { pad } from '../utils';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';

let logger: Logger;

// Helper function to create a funding coin for treasury funding
const createFundingCoin = (fundingTokenAddress: string): any => {
  return {
    nonce: randomBytes(32),                    // Random nonce for uniqueness
    color: encodeTokenType(tokenType(pad('dega_funding_token', 32), fundingTokenAddress)),
    value: 100n,                               // Fixed payment amount
  };
};

// Helper function to create a DAO vote coin for casting votes
const createDaoVoteCoin = (daoVoteTokenAddress: string): any => {
  return {
    nonce: randomBytes(32),                    // Random nonce for uniqueness
    color: encodeTokenType(tokenType(pad('dega_dao_vote', 32), daoVoteTokenAddress)),
    value: 500n,                               // Required amount for voting (500 tokens)
  };
};

const DEPLOY_OR_JOIN_QUESTION = `
DAO Voting - You can do one of the following:
  1. Deploy a new DAO voting contract
  2. Join an existing DAO voting contract
  3. Exit
Which would you like to do? `;

const MAIN_LOOP_QUESTION = `
DAO Voting - You can do one of the following:
  1. Open election
  2. Close election
  3. Cast vote (requires DAO voting tokens)
  4. Fund treasury (requires funding tokens)
  5. Payout approved proposal
  6. Display current contract state
  7. Check election status
  8. Cancel payout
  9. Exit
Which would you like to do? `;

const join = async (providers: DaoVotingProviders, rli: Interface): Promise<DeployedDaoVotingContract> => {
  const contractAddress = await rli.question('What is the DAO voting contract address (in hex)? ');
  return await api.joinDaoVotingContract(providers, contractAddress);
};

const deployOrJoin = async (providers: DaoVotingProviders, rli: Interface): Promise<DeployedDaoVotingContract | null> => {
  while (true) {
    const choice = await rli.question(DEPLOY_OR_JOIN_QUESTION);
    switch (choice) {
      case '1': {
        // For DAO voting, we need both token contract addresses
        const fundingTokenAddress = await rli.question('Enter the funding token contract address: ');
        const daoVoteTokenAddress = await rli.question('Enter the DAO vote token contract address: ');
        return await api.deployDaoVotingContract(providers, {}, fundingTokenAddress, daoVoteTokenAddress);
      }
      case '2': {
        return await join(providers, rli);
      }
      case '3': {
        logger.info('Exiting DAO voting CLI...');
        return null;
      }
      default: {
        logger.error(`Invalid choice: ${choice}`);
      }
    }
  }
};

const mainLoop = async (providers: DaoVotingProviders, rli: Interface): Promise<void> => {
  const daoVotingContract = await deployOrJoin(providers, rli);
  if (daoVotingContract === null) {
    return;
  }
  
  while (true) {
    const choice = await rli.question(MAIN_LOOP_QUESTION);
    switch (choice) {
      case '1': {
        const electionId = await rli.question('Enter election ID: ');
        try {
          await api.openElection(daoVotingContract, electionId);
          logger.info(`Successfully opened election: ${electionId}`);
        } catch (error) {
          logger.error(`Failed to open election: ${error instanceof Error ? error.message : error}`);
        }
        break;
      }
      case '2': {
        try {
          await api.closeElection(daoVotingContract);
          logger.info('Successfully closed election');
        } catch (error) {
          logger.error(`Failed to close election: ${error instanceof Error ? error.message : error}`);
        }
        break;
      }
      case '3': {
        const voteChoice = await rli.question('Vote type (0=YES, 1=NO, 2=ABSENT): ');
        const voteType = parseInt(voteChoice) as VoteType;
        if (voteType < 0 || voteType > 2) {
          logger.error('Invalid vote type. Must be 0, 1, or 2.');
          break;
        }
        
        const daoVoteTokenAddress = await rli.question('Enter the DAO vote token contract address: ');
        try {
          const voteCoin = createDaoVoteCoin(daoVoteTokenAddress);
          await api.castVote(daoVotingContract, voteType, voteCoin);
          logger.info(`Successfully cast ${voteType === 0 ? 'YES' : voteType === 1 ? 'NO' : 'ABSENT'} vote`);
        } catch (error) {
          logger.error(`Failed to cast vote: ${error instanceof Error ? error.message : error}`);
        }
        break;
      }
      case '4': {
        const fundingTokenAddress = await rli.question('Enter the funding token contract address: ');
        try {
          const fundCoin = createFundingCoin(fundingTokenAddress);
          await api.fundTreasury(daoVotingContract, fundCoin);
          logger.info('Successfully funded treasury');
        } catch (error) {
          logger.error(`Failed to fund treasury: ${error instanceof Error ? error.message : error}`);
        }
        break;
      }
      case '5': {
        try {
          await api.payoutApprovedProposal(daoVotingContract);
          logger.info('Successfully paid out approved proposal to contract owner');
        } catch (error) {
          logger.error(`Failed to payout: ${error instanceof Error ? error.message : error}`);
        }
        break;
      }
      case '6': {
        await api.displayDaoVotingState(providers, daoVotingContract);
        break;
      }
      case '7': {
        const contractAddress = daoVotingContract.deployTxData.public.contractAddress;
        const status = await api.getElectionStatus(providers, contractAddress);
        if (status) {
          logger.info('Election Status:');
          logger.info(`  Open: ${status.isOpen}`);
          logger.info(`  Election ID: ${status.electionId}`);
          logger.info(`  Yes Votes: ${status.yesVotes}`);
          logger.info(`  No Votes: ${status.noVotes}`);
          logger.info(`  Absent Votes: ${status.absentVotes}`);
          logger.info(`  Total Votes: ${status.totalVotes}`);
        } else {
          logger.info('No election status found');
        }
        break;
      }
      case '8': {
        try {
          await api.cancelPayout(daoVotingContract);
          logger.info('Successfully cancelled payout');
        } catch (error) {
          logger.error(`Failed to cancel payout: ${error instanceof Error ? error.message : error}`);
        }
        break;
      }
      case '9': {
        logger.info('Exiting DAO voting CLI...');
        return;
      }
      default: {
        logger.error(`Invalid choice: ${choice}`);
      }
    }
  }
};

export const runDaoVotingCli = async (
  config: Config,
  _logger: Logger,
  wallet: Wallet & Resource,
  rli: Interface,
): Promise<void> => {
  logger = _logger;
  api.setLogger(_logger);
  
  try {
    // Configure providers for DAO voting
    const walletAndMidnightProvider = await createWalletAndMidnightProvider(wallet);
    const providers: DaoVotingProviders = {
      privateStateProvider: levelPrivateStateProvider<'daoVotingPrivateState'>({
        privateStateStoreName: 'daoVotingPrivateState',
      }),
      publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
      zkConfigProvider: new NodeZkConfigProvider<'open_election' | 'close_election' | 'cast_vote' | 'fund_treasury' | 'payout_approved_proposal'>(path.resolve(path.resolve(new URL(import.meta.url).pathname, '..'), '..', '..', '..', 'contracts', 'src', 'managed', 'dao-voting')),
      proofProvider: httpClientProofProvider(config.proofServer),
      walletProvider: walletAndMidnightProvider,
      midnightProvider: walletAndMidnightProvider,
    };
    
    await mainLoop(providers, rli);
  } catch (e) {
    if (e instanceof Error) {
      logger.error(`Found error '${e.message}'`);
      logger.info('Exiting...');
      logger.debug(`${e.stack}`);
    } else {
      throw e;
    }
  }
};
