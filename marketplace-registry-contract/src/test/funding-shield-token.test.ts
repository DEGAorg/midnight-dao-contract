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

import { FundingShieldTokenSimulator } from "./funding-shield-token-simulator.js";
import {
  NetworkId,
  setNetworkId
} from "@midnight-ntwrk/midnight-js-network-id";
import { describe, it, expect } from "vitest";

setNetworkId(NetworkId.Undeployed);

describe("Funding Shield Token smart contract", () => {
  it("generates initial ledger state deterministically", () => {
    const initNonce = new Uint8Array(32).fill(1);
    const simulator0 = new FundingShieldTokenSimulator(initNonce);
    const simulator1 = new FundingShieldTokenSimulator(initNonce);
    const ledger0 = simulator0.getLedger();
    const ledger1 = simulator1.getLedger();
    expect(ledger0.counter).toBe(ledger1.counter);
    expect(ledger0.nonce).toEqual(ledger1.nonce);
    expect(ledger0.tvl).toBe(ledger1.tvl);
    expect(ledger0.admin).toEqual(ledger1.admin);
  });

  it("properly initializes ledger state and private state", () => {
    const initNonce = new Uint8Array(32).fill(2);
    const simulator = new FundingShieldTokenSimulator(initNonce);
    const initialLedgerState = simulator.getLedger();
    expect(initialLedgerState.counter).toBe(0n);
    expect(initialLedgerState.tvl).toBe(0n);
    expect(initialLedgerState.nonce).toEqual(initNonce);
    expect(initialLedgerState.admin).toBeDefined();
    expect(initialLedgerState.admin).toHaveLength(32);
    const initialPrivateState = simulator.getPrivateState();
    expect(initialPrivateState).toEqual({});
  });

  it("mints funding tokens correctly (admin only)", () => {
    const initNonce = new Uint8Array(32).fill(3);
    const simulator = new FundingShieldTokenSimulator(initNonce);
    const initialLedgerState = simulator.getLedger();
    expect(initialLedgerState.counter).toBe(0n);
    expect(initialLedgerState.tvl).toBe(0n);
    
    const nextLedgerState = simulator.mint();
    expect(nextLedgerState.counter).toBe(1n);
    expect(nextLedgerState.tvl).toBe(1000n);
  });

  it("increments counter and TVL on multiple mints", () => {
    const initNonce = new Uint8Array(32).fill(4);
    const simulator = new FundingShieldTokenSimulator(initNonce);
    
    // First mint
    let ledgerState = simulator.mint();
    expect(ledgerState.counter).toBe(1n);
    expect(ledgerState.tvl).toBe(1000n);
    
    // Second mint
    ledgerState = simulator.mint();
    expect(ledgerState.counter).toBe(2n);
    expect(ledgerState.tvl).toBe(2000n);
    
    // Third mint
    ledgerState = simulator.mint();
    expect(ledgerState.counter).toBe(3n);
    expect(ledgerState.tvl).toBe(3000n);
  });

  it("evolves nonce correctly on mint", () => {
    const initNonce = new Uint8Array(32).fill(5);
    const simulator = new FundingShieldTokenSimulator(initNonce);
    const initialLedgerState = simulator.getLedger();
    expect(initialLedgerState.nonce).toEqual(initNonce);
    
    const nextLedgerState = simulator.mint();
    expect(nextLedgerState.nonce).not.toEqual(initNonce);
    expect(nextLedgerState.nonce).toHaveLength(32);
  });

  it("maintains admin hash consistency", () => {
    const initNonce = new Uint8Array(32).fill(6);
    const simulator = new FundingShieldTokenSimulator(initNonce);
    const initialLedgerState = simulator.getLedger();
    const adminHash = initialLedgerState.admin;
    
    // Admin hash should remain the same after minting
    const nextLedgerState = simulator.mint();
    expect(nextLedgerState.admin).toEqual(adminHash);
  });
});
