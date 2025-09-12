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
import { DaoShieldedToken, type DaoShieldedTokenPrivateState, witnesses } from '@midnight-ntwrk/marketplace-registry-contract';
import { type FinalizedTxData } from '@midnight-ntwrk/midnight-js-types';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { type Logger } from 'pino';
import { assertIsContractAddress } from '@midnight-ntwrk/midnight-js-utils';
import {
  type DaoShieldedTokenProviders,
  type DeployedDaoShieldedTokenContract,
  type DaoShieldedTokenState,
} from './common-types';

let logger: Logger;

export const daoShieldedTokenContractInstance: DaoShieldedToken.Contract<DaoShieldedTokenPrivateState> = new DaoShieldedToken.Contract(witnesses);

export const getDaoShieldedTokenLedgerState = async (
  providers: DaoShieldedTokenProviders,
  contractAddress: ContractAddress,
): Promise<DaoShieldedTokenState | null> => {
  assertIsContractAddress(contractAddress);
  logger.info('Checking DAO shielded token contract ledger state...');
  const state = await providers.publicDataProvider
    .queryContractState(contractAddress)
    .then((contractState) => (contractState != null ? DaoShieldedToken.ledger(contractState.data) : null));
  logger.info(`Ledger state: ${state ? 'DAO shielded token available' : 'No state'}`);
  return state;
};

export const joinDaoShieldedTokenContract = async (
  providers: DaoShieldedTokenProviders,
  contractAddress: string,
): Promise<DeployedDaoShieldedTokenContract> => {
  const daoShieldedTokenContract = await findDeployedContract(providers, {
    contractAddress,
    contract: daoShieldedTokenContractInstance,
    privateStateId: 'daoShieldedTokenPrivateState',
    initialPrivateState: {},
  });
  logger.info(`Joined DAO shielded token contract at address: ${daoShieldedTokenContract.deployTxData.public.contractAddress}`);
  return daoShieldedTokenContract;
};

export const deployDaoShieldedTokenContract = async (
  providers: DaoShieldedTokenProviders,
  privateState: DaoShieldedTokenPrivateState,
): Promise<DeployedDaoShieldedTokenContract> => {
  logger.info('Deploying DAO shielded token contract...');
  const daoShieldedTokenContract = await deployContract(providers, {
    contract: daoShieldedTokenContractInstance,
    privateStateId: 'daoShieldedTokenPrivateState',
    initialPrivateState: privateState,
    args: [new Uint8Array(32).fill(0)], // initNonce
  });
  logger.info(`Deployed DAO shielded token contract at address: ${daoShieldedTokenContract.deployTxData.public.contractAddress}`);
  return daoShieldedTokenContract;
};

export const mintDaoVotingTokens = async (
  daoShieldedTokenContract: DeployedDaoShieldedTokenContract,
): Promise<FinalizedTxData> => {
  logger.info('Minting DAO voting tokens...');
  const finalizedTxData = await daoShieldedTokenContract.callTx.mint();
  logger.info(`Transaction ${finalizedTxData.public.txId} added in block ${finalizedTxData.public.blockHeight}`);
  return finalizedTxData.public;
};

export const displayDaoShieldedTokenState = async (
  providers: DaoShieldedTokenProviders,
  daoShieldedTokenContract: DeployedDaoShieldedTokenContract,
): Promise<{ state: DaoShieldedTokenState | null; contractAddress: string }> => {
  const contractAddress = daoShieldedTokenContract.deployTxData.public.contractAddress;
  const state = await getDaoShieldedTokenLedgerState(providers, contractAddress);
  if (state === null) {
    logger.info(`There is no DAO shielded token contract deployed at ${contractAddress}.`);
  } else {
    logger.info(`DAO Shielded Token State:`);
    logger.info(`  Counter: ${state.counter}`);
    logger.info(`  Nonce: ${Buffer.from(state.nonce).toString('hex')}`);
    logger.info(`  TVL (Total Value Locked): ${state.tvl}`);
  }
  return { contractAddress, state };
};

export function setLogger(_logger: Logger) {
  logger = _logger;
}
