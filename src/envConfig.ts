import { asArray, asObject, asOptional, asString, type Cleaner } from 'cleaners'

// Minimal env config modeled after edge-react-gui's env handling, scoped to EVM keys

const asEvmApiKeys = asObject({
  alethioApiKey: asOptional(asString, ''),
  amberdataApiKey: asOptional(asString, ''),
  blockchairApiKey: asOptional(asString, ''),
  drpcApiKey: asOptional(asString, ''),
  evmScanApiKey: asOptional(asArray(asString), () => []),
  gasStationApiKey: asOptional(asString, ''),
  infuraProjectId: asOptional(asString, ''),
  nowNodesApiKey: asOptional(asString, ''),
  poktPortalApiKey: asOptional(asString, ''),
  quiknodeApiKey: asOptional(asString, ''),
  // Not in edge-react-gui core list, but useful here based on usage comments
  alchemyApiKey: asOptional(asString, '')
}).withRest

export interface EnvConfig {
  EVM_API_KEYS: Cleaner<typeof asEvmApiKeys>
}

export const asEnvConfig = asObject({
  EVM_API_KEYS: asOptional(asEvmApiKeys, () => ({
    alethioApiKey: '',
    amberdataApiKey: '',
    blockchairApiKey: '',
    drpcApiKey: '',
    evmScanApiKey: [],
    gasStationApiKey: '',
    infuraProjectId: '',
    nowNodesApiKey: '',
    poktPortalApiKey: '',
    quiknodeApiKey: '',
    alchemyApiKey: ''
  }))
}).withRest


