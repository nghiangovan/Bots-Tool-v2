import { autoDefinitions } from './auto.js';
import { cacheDataDefinitions } from './cacheData.js';
import { fakeTransacionsDefinitions } from './fakeTransactions.js';
import { manualDefinitions } from './manual.js';
import { offChainDefinitions } from './offChain.js';
import { onChainDefinitions } from './onChain.js';

const definitions = [
  autoDefinitions,
  manualDefinitions,
  onChainDefinitions,
  offChainDefinitions,
  fakeTransacionsDefinitions,
  cacheDataDefinitions,
];

export const allDefinitions = agenda => {
  definitions.forEach(definition => definition(agenda));
};
