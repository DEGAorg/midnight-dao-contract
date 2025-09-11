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
  constructorContext
} from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  type Ledger,
  ledger
} from "../managed/dao-shielded-token/contract/index.cjs";
import { type DaoShieldedTokenPrivateState, witnesses } from "../witnesses.js";

export class DaoShieldedTokenSimulator {
  readonly contract: Contract<DaoShieldedTokenPrivateState>;
  circuitContext: CircuitContext<DaoShieldedTokenPrivateState>;

  constructor(initNonce: Uint8Array) {
    this.contract = new Contract<DaoShieldedTokenPrivateState>(witnesses);
    const {
      currentPrivateState,
      currentContractState,
      currentZswapLocalState
    } = this.contract.initialState(
      constructorContext({}, "0".repeat(64)),
      initNonce
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

  public getPrivateState(): DaoShieldedTokenPrivateState {
    return this.circuitContext.currentPrivateState;
  }

  public mint(): Ledger {
    // Update the current context to be the result of executing the circuit.
    this.circuitContext = this.contract.impureCircuits.mint(
      this.circuitContext
    ).context;
    return ledger(this.circuitContext.transactionContext.state);
  }
}
