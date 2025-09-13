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

import {
  type CircuitContext,
  QueryContext,
  sampleContractAddress,
  constructorContext,
  ContractAddress
} from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  type Ledger,
  ledger
} from "../managed/dao-voting/contract/index.cjs";
import { type DaoVotingPrivateState, witnesses } from "../witnesses.js";

export class DaoVotingSimulator {
  readonly contract: Contract<DaoVotingPrivateState>;
  circuitContext: CircuitContext<DaoVotingPrivateState>;

  constructor(tokenAddress: string) {
    this.contract = new Contract<DaoVotingPrivateState>(witnesses);
    // Convert string to ContractAddress - use a simple object with bytes property for testing
    const contractAddress = { bytes: new Uint8Array(32).fill(0) };
    
    const {
      currentPrivateState,
      currentContractState,
      currentZswapLocalState
    } = this.contract.initialState(
      constructorContext({}, "0".repeat(64)),
      contractAddress
    );
    this.circuitContext = {
      currentPrivateState,
      currentZswapLocalState,
      originalState: currentContractState,
      transactionContext: new QueryContext(
        currentContractState.data,
        sampleContractAddress()
      )
    };
  }

  public getLedger(): Ledger {
    return ledger(this.circuitContext.transactionContext.state);
  }

  public getPrivateState(): DaoVotingPrivateState {
    return this.circuitContext.currentPrivateState;
  }

  public openElection(electionId: Uint8Array): Ledger {
    this.circuitContext = this.contract.impureCircuits.open_election(
      this.circuitContext,
      electionId
    ).context;
    return ledger(this.circuitContext.transactionContext.state);
  }

  public closeElection(): Ledger {
    this.circuitContext = this.contract.impureCircuits.close_election(
      this.circuitContext
    ).context;
    return ledger(this.circuitContext.transactionContext.state);
  }

  public castVote(voteType: bigint, voteCoin: any): Ledger {
    this.circuitContext = this.contract.impureCircuits.cast_vote(
      this.circuitContext,
      voteType,
      voteCoin
    ).context;
    return ledger(this.circuitContext.transactionContext.state);
  }

  public fundTreasury(fundCoin: any): Ledger {
    this.circuitContext = this.contract.impureCircuits.fund_treasury(
      this.circuitContext,
      fundCoin
    ).context;
    return ledger(this.circuitContext.transactionContext.state);
  }

  public payoutApprovedProposal(to: { bytes: Uint8Array }, amount: bigint): Ledger {
    this.circuitContext = this.contract.impureCircuits.payout_approved_proposal(
      this.circuitContext,
      to,
      amount
    ).context;
    return ledger(this.circuitContext.transactionContext.state);
  }
}
