import { holderDefinitions } from './holder.js';

const definitions = [holderDefinitions];

export const allDefinitions = agenda => {
  definitions.forEach(definition => definition(agenda));
};
