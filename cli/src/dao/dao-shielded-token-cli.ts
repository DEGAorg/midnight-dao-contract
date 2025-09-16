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
import { type DaoShieldedTokenProviders, type DeployedDaoShieldedTokenContract } from './common-types';
import * as api from './dao-shielded-token-api';
import { randomBytes, createWalletAndMidnightProvider } from '../api';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';

let logger: Logger;

const DEPLOY_OR_JOIN_QUESTION = `
DAO Shielded Token - You can do one of the following:
  1. Deploy a new DAO shielded token contract
  2. Join an existing DAO shielded token contract
  3. Exit
Which would you like to do? `;

const MAIN_LOOP_QUESTION = `
DAO Shielded Token - You can do one of the following:
  1. Mint DAO voting tokens (1000 tokens)
  2. Display current contract state
  3. Log DAO token balance
  4. Send DAO tokens
  5. Exit
Which would you like to do? `;

const join = async (providers: DaoShieldedTokenProviders, rli: Interface): Promise<DeployedDaoShieldedTokenContract> => {
  const contractAddress = await rli.question('What is the DAO shielded token contract address (in hex)? ');
  return await api.joinDaoShieldedTokenContract(providers, contractAddress);
};

const deployOrJoin = async (providers: DaoShieldedTokenProviders, rli: Interface): Promise<DeployedDaoShieldedTokenContract | null> => {
  while (true) {
    const choice = await rli.question(DEPLOY_OR_JOIN_QUESTION);
    switch (choice) {
      case '1': {
        // Generate a random nonce for the constructor
        const initNonce = randomBytes(32);
        return await api.deployDaoShieldedTokenContract(providers, { initNonce });
      }
      case '2': {
        return await join(providers, rli);
      }
      case '3': {
        logger.info('Exiting DAO shielded token CLI...');
        return null;
      }
      default: {
        logger.error(`Invalid choice: ${choice}`);
      }
    }
  }
};

const mainLoop = async (providers: DaoShieldedTokenProviders, wallet: Wallet & Resource, rli: Interface): Promise<void> => {
  const daoShieldedTokenContract = await deployOrJoin(providers, rli);
  if (daoShieldedTokenContract === null) {
    return;
  }
  
  while (true) {
    const choice = await rli.question(MAIN_LOOP_QUESTION);
    switch (choice) {
      case '1': {
        try {
          await api.mintDaoVotingTokens(daoShieldedTokenContract);
          logger.info('Successfully minted 1000 DAO voting tokens!');
        } catch (error) {
          logger.error(`Failed to mint tokens: ${error instanceof Error ? error.message : error}`);
        }
        break;
      }
      case '2': {
        await api.displayDaoShieldedTokenState(providers, daoShieldedTokenContract);
        break;
      }
      case '3': {
        try {
          await api.logDaoTokenBalance(wallet, daoShieldedTokenContract);
        } catch (error) {
          logger.error(`Failed to log DAO token balance: ${error instanceof Error ? error.message : error}`);
        }
        break;
      }
      case '4': {
        try {
          // Get destination address from user
          const toAddress = await rli.question('Enter the destination wallet address (in hex): ');
          if (!toAddress.trim()) {
            logger.error('Destination address cannot be empty');
            break;
          }
          
          // Get amount from user
          const amountStr = await rli.question('Enter the amount of DAO tokens to send: ');
          const amount = BigInt(amountStr);
          if (amount <= 0n) {
            logger.error('Amount must be greater than 0');
            break;
          }
          
          // Send the tokens
          const txId = await api.sendDaoToken(wallet, daoShieldedTokenContract, toAddress.trim(), amount);
          logger.info(`Successfully sent ${amount} DAO tokens to ${toAddress.trim()}`);
          logger.info(`Transaction ID: ${txId}`);
          
        } catch (error) {
          logger.error(`Failed to send DAO tokens: ${error instanceof Error ? error.message : error}`);
        }
        break;
      }
      case '5': {
        logger.info('Exiting DAO shielded token CLI...');
        return;
      }
      default: {
        logger.error(`Invalid choice: ${choice}`);
      }
    }
  }
};

export const runDaoShieldedTokenCli = async (
  config: Config,
  _logger: Logger,
  wallet: Wallet & Resource,
  rli: Interface,
): Promise<void> => {
  logger = _logger;
  api.setLogger(_logger);
  
  try {
    // Configure providers for DAO shielded token
    const walletAndMidnightProvider = await createWalletAndMidnightProvider(wallet);
    const providers: DaoShieldedTokenProviders = {
      privateStateProvider: levelPrivateStateProvider<'daoShieldedTokenPrivateState'>({
        privateStateStoreName: 'daoShieldedTokenPrivateState',
      }),
      publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
      zkConfigProvider: new NodeZkConfigProvider<'mint'>(path.resolve(path.resolve(new URL(import.meta.url).pathname, '..'), '..', '..', '..', 'contracts', 'src', 'managed', 'dao-shielded-token')),
      proofProvider: httpClientProofProvider(config.proofServer),
      walletProvider: walletAndMidnightProvider,
      midnightProvider: walletAndMidnightProvider,
    };
    
    await mainLoop(providers, wallet, rli);
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
