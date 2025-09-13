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

import { type ContractAddress, tokenType } from '@midnight-ntwrk/compact-runtime';
import { DaoShieldedToken, type DaoShieldedTokenPrivateState, witnesses } from 'midnight-workshop-dao-contracts';
import { type FinalizedTxData } from '@midnight-ntwrk/midnight-js-types';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { type Logger } from 'pino';
import { assertIsContractAddress } from '@midnight-ntwrk/midnight-js-utils';
import { type Wallet } from '@midnight-ntwrk/wallet-api';
import * as Rx from 'rxjs';
import {
  type DaoShieldedTokenProviders,
  type DeployedDaoShieldedTokenContract,
  type DaoShieldedTokenState,
} from './common-types';

let logger: Logger;

// pad(n, s): UTF-8 bytes of s followed by 0x00 up to length n
function padBytes(n: number, s: string): Uint8Array {
  const bytes = new TextEncoder().encode(s);
  if (bytes.length > n) throw new Error('String too long for pad length');
  const out = new Uint8Array(n);
  out.set(bytes);
  return out;
}

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

// Helper function to generate token type identifier using the proper tokenType function
const generateTokenType = (contractAddress: string): string => {
  // Build a 32-byte domain separator for DAO tokens
  const domainSep = padBytes(32, 'dega_dao_vote');
  
  // Use the built-in tokenType function to derive the TokenType
  const tokenTypeHex: string = tokenType(domainSep, contractAddress);
  
  return tokenTypeHex;
};

// Helper function to properly serialize balances for logging
const logBalances = (balances: Record<string, bigint>) => {
  const serializedBalances: Record<string, string> = {};
  for (const [token, balance] of Object.entries(balances)) {
    serializedBalances[token] = balance.toString();
  }
  return JSON.stringify(serializedBalances, null, 2);
};

export const logDaoTokenBalance = async (
  wallet: Wallet,
  daoShieldedTokenContract: DeployedDaoShieldedTokenContract,
): Promise<void> => {
  try {
    const contractAddress = daoShieldedTokenContract.deployTxData.public.contractAddress;
    const state = await Rx.firstValueFrom(wallet.state());
    
    // Generate the token type for the DAO token using the proper tokenType function
    const tokenTypeHex = generateTokenType(contractAddress);
    
    logger.info(`DAO Token Type: ${tokenTypeHex}`);
    
    // Check if the wallet has this token
    const daoTokenBalance = state.balances[tokenTypeHex];
    
    if (daoTokenBalance !== undefined) {
      logger.info(`DAO Token Balance: ${daoTokenBalance}`);
    } else {
      logger.info('DAO Token Balance: 0 (not found in wallet)');
    }
    
    // Also log all balances for context
    logger.info(`All wallet balances:\n${logBalances(state.balances)}`);
    
  } catch (error) {
    logger.error(`Error logging DAO token balance: ${error instanceof Error ? error.message : error}`);
  }
};

export const sendDaoToken = async (
  wallet: Wallet,
  daoShieldedTokenContract: DeployedDaoShieldedTokenContract,
  toAddress: string,
  amount: bigint,
): Promise<string> => {
  try {
    const contractAddress = daoShieldedTokenContract.deployTxData.public.contractAddress;
    
    // Generate the token type for the DAO token using the proper tokenType function
    const tokenTypeHex = generateTokenType(contractAddress);
    
    logger.info(`Sending ${amount} DAO tokens to address: ${toAddress}`);
    logger.info(`DAO Token Type: ${tokenTypeHex}`);
    
    // Create the transfer transaction
    const transferRecipe = await wallet.transferTransaction([
      {
        amount: amount,
        type: tokenTypeHex,
        receiverAddress: toAddress
      }
    ]);
    
    // Prove the transaction
    const provenTransaction = await wallet.proveTransaction(transferRecipe);
    
    // Submit the proven transaction
    const txId = await wallet.submitTransaction(provenTransaction);
    
    logger.info(`DAO token transfer transaction submitted with ID: ${txId}`);
    return txId;
    
  } catch (error) {
    logger.error(`Failed to send DAO tokens: ${error instanceof Error ? error.message : error}`);
    throw error;
  }
};

export function setLogger(_logger: Logger) {
  logger = _logger;
}
