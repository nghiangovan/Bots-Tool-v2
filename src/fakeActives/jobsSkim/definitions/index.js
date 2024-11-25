import { fakeActivesDefinitions } from './fakeActives.js';

const definitions = [fakeActivesDefinitions];

export const allDefinitionsSkim = agenda => {
  definitions.forEach(definition => definition(agenda));
};
