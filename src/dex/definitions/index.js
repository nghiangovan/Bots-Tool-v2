import { dexDefinitions } from './dex.js';

const definitions = [dexDefinitions];

export const allDefinitions = agenda => {
  definitions.forEach(definition => definition(agenda));
};
