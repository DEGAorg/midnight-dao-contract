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
import { type FundingShieldTokenProviders, type DeployedFundingShieldTokenContract } from './common-types';
import * as api from './funding-shield-token-api';
import { randomBytes, createWalletAndMidnightProvider } from '../api';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';

let logger: Logger;

const DEPLOY_OR_JOIN_QUESTION = `
Funding Shield Token - You can do one of the following:
  1. Deploy a new funding shield token contract
  2. Join an existing funding shield token contract
  3. Exit
Which would you like to do? `;

const MAIN_LOOP_QUESTION = `
Funding Shield Token - You can do one of the following:
  1. Mint funding tokens (1000 tokens) - Admin only
  2. Display current contract state
  3. Exit
Which would you like to do? `;

const join = async (providers: FundingShieldTokenProviders, rli: Interface): Promise<DeployedFundingShieldTokenContract> => {
  const contractAddress = await rli.question('What is the funding shield token contract address (in hex)? ');
  return await api.joinFundingShieldTokenContract(providers, contractAddress);
};

const deployOrJoin = async (providers: FundingShieldTokenProviders, rli: Interface): Promise<DeployedFundingShieldTokenContract | null> => {
  while (true) {
    const choice = await rli.question(DEPLOY_OR_JOIN_QUESTION);
    switch (choice) {
      case '1': {
        // Generate a random nonce for the constructor
        const initNonce = randomBytes(32);
        return await api.deployFundingShieldTokenContract(providers, { initNonce });
      }
      case '2': {
        return await join(providers, rli);
      }
      case '3': {
        logger.info('Exiting funding shield token CLI...');
        return null;
      }
      default: {
        logger.error(`Invalid choice: ${choice}`);
      }
    }
  }
};

const mainLoop = async (providers: FundingShieldTokenProviders, rli: Interface): Promise<void> => {
  const fundingShieldTokenContract = await deployOrJoin(providers, rli);
  if (fundingShieldTokenContract === null) {
    return;
  }
  
  while (true) {
    const choice = await rli.question(MAIN_LOOP_QUESTION);
    switch (choice) {
      case '1': {
        try {
          await api.mintFundingTokens(fundingShieldTokenContract);
          logger.info('Successfully minted 1000 funding tokens!');
        } catch (error) {
          logger.error(`Failed to mint tokens: ${error instanceof Error ? error.message : error}`);
          if (error instanceof Error && error.message.includes('Only admin can mint')) {
            logger.info('Note: Only the admin (deployer) can mint funding tokens.');
          }
        }
        break;
      }
      case '2': {
        await api.displayFundingShieldTokenState(providers, fundingShieldTokenContract);
        break;
      }
      case '3': {
        logger.info('Exiting funding shield token CLI...');
        return;
      }
      default: {
        logger.error(`Invalid choice: ${choice}`);
      }
    }
  }
};

export const runFundingShieldTokenCli = async (
  config: Config,
  _logger: Logger,
  wallet: Wallet & Resource,
  rli: Interface,
): Promise<void> => {
  logger = _logger;
  api.setLogger(_logger);
  
  try {
    // Configure providers for funding shield token
    const walletAndMidnightProvider = await createWalletAndMidnightProvider(wallet);
    const providers: FundingShieldTokenProviders = {
      privateStateProvider: levelPrivateStateProvider<'fundingShieldTokenPrivateState'>({
        privateStateStoreName: 'fundingShieldTokenPrivateState',
      }),
      publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
      zkConfigProvider: new NodeZkConfigProvider<'mint'>(path.resolve(path.resolve(new URL(import.meta.url).pathname, '..'), '..', '..', '..', 'contracts', 'src', 'managed', 'funding-shield-token')),
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
