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
import { FundingShieldToken, type FundingShieldTokenPrivateState, witnesses } from 'midnight-workshop-dao-contracts';
import { type FinalizedTxData } from '@midnight-ntwrk/midnight-js-types';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { type Logger } from 'pino';
import { assertIsContractAddress } from '@midnight-ntwrk/midnight-js-utils';
import {
  type FundingShieldTokenProviders,
  type DeployedFundingShieldTokenContract,
  type FundingShieldTokenState,
} from './common-types';

let logger: Logger;

export const fundingShieldTokenContractInstance: FundingShieldToken.Contract<FundingShieldTokenPrivateState> = new FundingShieldToken.Contract(witnesses);

export const getFundingShieldTokenLedgerState = async (
  providers: FundingShieldTokenProviders,
  contractAddress: ContractAddress,
): Promise<FundingShieldTokenState | null> => {
  assertIsContractAddress(contractAddress);
  logger.info('Checking funding shield token contract ledger state...');
  const state = await providers.publicDataProvider
    .queryContractState(contractAddress)
    .then((contractState) => (contractState != null ? FundingShieldToken.ledger(contractState.data) : null));
  logger.info(`Ledger state: ${state ? 'Funding shield token available' : 'No state'}`);
  return state;
};

export const joinFundingShieldTokenContract = async (
  providers: FundingShieldTokenProviders,
  contractAddress: string,
): Promise<DeployedFundingShieldTokenContract> => {
  const fundingShieldTokenContract = await findDeployedContract(providers, {
    contractAddress,
    contract: fundingShieldTokenContractInstance,
    privateStateId: 'fundingShieldTokenPrivateState',
    initialPrivateState: {},
  });
  logger.info(`Joined funding shield token contract at address: ${fundingShieldTokenContract.deployTxData.public.contractAddress}`);
  return fundingShieldTokenContract;
};

export const deployFundingShieldTokenContract = async (
  providers: FundingShieldTokenProviders,
  privateState: FundingShieldTokenPrivateState,
): Promise<DeployedFundingShieldTokenContract> => {
  logger.info('Deploying funding shield token contract...');
  const fundingShieldTokenContract = await deployContract(providers, {
    contract: fundingShieldTokenContractInstance,
    privateStateId: 'fundingShieldTokenPrivateState',
    initialPrivateState: privateState,
    args: [new Uint8Array(32).fill(0)], // initNonce
  });
  logger.info(`Deployed funding shield token contract at address: ${fundingShieldTokenContract.deployTxData.public.contractAddress}`);
  return fundingShieldTokenContract;
};

export const mintFundingTokens = async (
  fundingShieldTokenContract: DeployedFundingShieldTokenContract,
): Promise<FinalizedTxData> => {
  logger.info('Minting funding tokens (admin only)...');
  const finalizedTxData = await fundingShieldTokenContract.callTx.mint();
  logger.info(`Transaction ${finalizedTxData.public.txId} added in block ${finalizedTxData.public.blockHeight}`);
  return finalizedTxData.public;
};

export const displayFundingShieldTokenState = async (
  providers: FundingShieldTokenProviders,
  fundingShieldTokenContract: DeployedFundingShieldTokenContract,
): Promise<{ state: FundingShieldTokenState | null; contractAddress: string }> => {
  const contractAddress = fundingShieldTokenContract.deployTxData.public.contractAddress;
  const state = await getFundingShieldTokenLedgerState(providers, contractAddress);
  if (state === null) {
    logger.info(`There is no funding shield token contract deployed at ${contractAddress}.`);
  } else {
    logger.info(`Funding Shield Token State:`);
    logger.info(`  Counter: ${state.counter}`);
    logger.info(`  Nonce: ${Buffer.from(state.nonce).toString('hex')}`);
    logger.info(`  TVL (Total Value Locked): ${state.tvl}`);
    logger.info(`  Admin: ${Buffer.from(state.admin).toString('hex')}`);
  }
  return { contractAddress, state };
};

export function setLogger(_logger: Logger) {
  logger = _logger;
}
