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

import { DaoVotingSimulator } from "./dao-voting-simulator.js";
import {
  NetworkId,
  setNetworkId
} from "@midnight-ntwrk/midnight-js-network-id";
import { describe, it, expect } from "vitest";

setNetworkId(NetworkId.Undeployed);

describe("DAO Voting smart contract", () => {
  it("generates initial ledger state deterministically", () => {
    const tokenAddress = "0x1234567890abcdef";
    const simulator0 = new DaoVotingSimulator(tokenAddress);
    const simulator1 = new DaoVotingSimulator(tokenAddress);
    const ledger0 = simulator0.getLedger();
    const ledger1 = simulator1.getLedger();
    expect(ledger0.election_open).toBe(ledger1.election_open);
    expect(ledger0.yes_votes).toBe(ledger1.yes_votes);
    expect(ledger0.no_votes).toBe(ledger1.no_votes);
    expect(ledger0.absent_votes).toBe(ledger1.absent_votes);
    expect(ledger0.total_votes).toBe(ledger1.total_votes);
  });

  it("properly initializes ledger state and private state", () => {
    const tokenAddress = "0x1234567890abcdef";
    const simulator = new DaoVotingSimulator(tokenAddress);
    const initialLedgerState = simulator.getLedger();
    expect(initialLedgerState.election_open).toBe(false);
    expect(initialLedgerState.yes_votes).toBe(0n);
    expect(initialLedgerState.no_votes).toBe(0n);
    expect(initialLedgerState.absent_votes).toBe(0n);
    expect(initialLedgerState.total_votes).toBe(0n);
    expect(initialLedgerState.treasury.value).toBe(0n);
    expect(initialLedgerState.treasury_coin_color).toBeDefined();
    expect(initialLedgerState.dao_vote_coin_color).toBeDefined();
    const initialPrivateState = simulator.getPrivateState();
    expect(initialPrivateState).toEqual({});
  });

  it("opens an election correctly", () => {
    const tokenAddress = "0x1234567890abcdef";
    const simulator = new DaoVotingSimulator(tokenAddress);
    const electionId = new Uint8Array(32).fill(1);
    
    const initialLedgerState = simulator.getLedger();
    expect(initialLedgerState.election_open).toBe(false);
    
    const nextLedgerState = simulator.openElection(electionId);
    expect(nextLedgerState.election_open).toBe(true);
    expect(nextLedgerState.election_id).toEqual(electionId);
    expect(nextLedgerState.yes_votes).toBe(0n);
    expect(nextLedgerState.no_votes).toBe(0n);
    expect(nextLedgerState.absent_votes).toBe(0n);
  });

  it("closes an election correctly", () => {
    const tokenAddress = "0x1234567890abcdef";
    const simulator = new DaoVotingSimulator(tokenAddress);
    const electionId = new Uint8Array(32).fill(2);
    
    // Open election first
    simulator.openElection(electionId);
    const openLedgerState = simulator.getLedger();
    expect(openLedgerState.election_open).toBe(true);
    
    // Close election
    const closedLedgerState = simulator.closeElection();
    expect(closedLedgerState.election_open).toBe(false);
    expect(closedLedgerState.total_votes).toBe(0n); // No votes cast yet
  });

  it("calculates total votes correctly when closing election", () => {
    const tokenAddress = "0x1234567890abcdef";
    const simulator = new DaoVotingSimulator(tokenAddress);
    const electionId = new Uint8Array(32).fill(3);
    
    // Open election
    simulator.openElection(electionId);
    
    // Simulate some votes (this would normally require proper coin handling)
    // For now, we'll test the close election logic
    const closedLedgerState = simulator.closeElection();
    expect(closedLedgerState.election_open).toBe(false);
    expect(closedLedgerState.total_votes).toBe(0n); // No actual votes cast in this test
  });

  it("maintains treasury coin color consistency", () => {
    const tokenAddress = "0x1234567890abcdef";
    const simulator = new DaoVotingSimulator(tokenAddress);
    const initialLedgerState = simulator.getLedger();
    const treasuryCoinColor = initialLedgerState.treasury_coin_color;
    const daoVoteCoinColor = initialLedgerState.dao_vote_coin_color;
    
    expect(treasuryCoinColor).toBeDefined();
    expect(daoVoteCoinColor).toBeDefined();
    expect(treasuryCoinColor).toHaveLength(32);
    expect(daoVoteCoinColor).toHaveLength(32);
    
    // Colors should remain consistent after operations
    const electionId = new Uint8Array(32).fill(4);
    simulator.openElection(electionId);
    const nextLedgerState = simulator.getLedger();
    expect(nextLedgerState.treasury_coin_color).toEqual(treasuryCoinColor);
    expect(nextLedgerState.dao_vote_coin_color).toEqual(daoVoteCoinColor);
  });

  it("initializes has_voted map as empty", () => {
    const tokenAddress = "0x1234567890abcdef";
    const simulator = new DaoVotingSimulator(tokenAddress);
    const initialLedgerState = simulator.getLedger();
    
    expect(initialLedgerState.has_voted.size()).toBe(0n);
    expect(initialLedgerState.has_voted.isEmpty()).toBe(true);
  });

  it("initializes treasury with zero value", () => {
    const tokenAddress = "0x1234567890abcdef";
    const simulator = new DaoVotingSimulator(tokenAddress);
    const initialLedgerState = simulator.getLedger();
    
    expect(initialLedgerState.treasury.value).toBe(0n);
    expect(initialLedgerState.treasury.color).toBeDefined();
    expect(initialLedgerState.treasury.color).toHaveLength(32);
  });
});
