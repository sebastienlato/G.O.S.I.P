import {
  parseAdditionalExamples,
  additionalLayers,
  type AdditionalSource,
  type AdditionalEvent,
} from '../../../src/data/additional'
import fixtures from './additionalExamples.json'
export const additionalExamples = parseAdditionalExamples(fixtures)
export const additionalBySource = Object.fromEntries(
  Object.entries(additionalLayers).map(([source, layer]) => [
    source,
    additionalExamples.filter((e) => e.family === layer.family),
  ]),
) as Record<AdditionalSource, AdditionalEvent[]>
