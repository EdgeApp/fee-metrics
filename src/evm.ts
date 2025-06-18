import { asObject, Cleaner } from 'cleaners'

import { Metric } from './metric'

export const evmTypes = `# TYPE evm_gas_price_wei gauge
# UNIT evm_gas_price_wei wei
# TYPE evm_base_fee_wei gauge
# UNIT evm_base_fee_wei wei
# TYPE evm_blob_base_fee_wei gauge
# UNIT evm_blob_base_fee_wei wei
# TYPE evm_base_fee_scalar gauge
# UNIT evm_base_fee_scalar ratio
# TYPE evm_blob_base_fee_scalar gauge
# UNIT evm_blob_base_fee_scalar ratio
`

export async function getRpcGasPrice(
  chain: string,
  sourceName: string,
  sourceUrl: string
): Promise<Metric> {
  const response = await fetch(sourceUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_gasPrice',
      params: []
    })
  })

  if (!response.ok) {
    throw new Error(`Could not fetch gasPrice from ${sourceName}`)
  }
  const json = await response.json()
  const value = asHexResult(json).result

  return { chain, source: sourceName, name: 'evm_gas_price_wei', value }
}

export async function getOptimismFees(
  chain: string,
  sourceName: string,
  sourceUrl: string
): Promise<Metric[]> {
  const oracleContractAddress = '0x420000000000000000000000000000000000000F'
  const queries: Array<[string, string]> = [
    ['evm_base_fee_wei', '0x519b4bd3'],
    ['evm_blob_base_fee_wei', '0xf8206140'],
    ['evm_base_fee_scalar', '0xc5985918'],
    ['evm_blob_base_fee_scalar', '0x68d5dca6']
  ]

  return await Promise.all(
    queries.map(async query => {
      const [name, data] = query
      const response = await fetch(sourceUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [{ to: oracleContractAddress, data }, 'latest']
        })
      })

      if (!response.ok) {
        throw new Error(`Could not fetch ${name} from ${sourceName}`)
      }
      const json = await response.json()
      const value = asHexResult(json).result

      return { chain, source: sourceName, name, value }
    })
  )
}

function asRpcResult<T>(cleaner: Cleaner<T>): Cleaner<{ result: T }> {
  return asObject({
    result: cleaner
  })
}

const asHex: Cleaner<number> = raw => {
  if (typeof raw !== 'string' || !/^0x[0-9a-fA-F]+$/.test(raw)) {
    throw new Error(`Expected hex string, got: ${String(raw)}`)
  }
  return parseInt(raw, 16)
}

const asHexResult = asRpcResult(asHex)
