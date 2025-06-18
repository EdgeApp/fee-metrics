import { createServer } from 'http'

import { evmTypes, getOptimismFees, getRpcGasPrice } from './evm'
import { countError, emitErrorCounters, emitMetric, Metric } from './metric'

const chains: Record<string, string[]> = {
  optimism: [
    'https://mainnet.optimism.io',
    'https://rpc.ankr.com/optimism'
    // 'https://lb.drpc.org/ogrpc?network=optimism&dkey={{drpcApiKey}}'
  ],
  arbitrum: [
    'https://arb1.arbitrum.io/rpc',
    'https://arbitrum-one.public.blastapi.io',
    'https://rpc.ankr.com/arbitrum'
    // 'https://arbitrum-one.rpc.grove.city/v1/lb/{{poktPortalApiKey}}',
    // 'https://lb.drpc.org/ogrpc?network=arbitrum&dkey={{drpcApiKey}}'
  ],
  ethereum: [
    'https://cloudflare-eth.com',
    'https://rpc.ankr.com/eth'
    // 'https://eth-mainnet.alchemyapi.io/v2/{{alchemyApiKey}}',
    // 'https://eth-mainnet.rpc.grove.city/v1/{{poktPortalApiKey}}',
    // 'https://lb.drpc.org/ogrpc?network=ethereum&dkey={{drpcApiKey}}'
    // 'https://mainnet.infura.io/v3/{{infuraProjectId}}',
  ]
}

export async function allMetrics(): Promise<Metric[]> {
  const promises = Object.keys(chains).map(chain => {
    const servers = chains[chain]

    return servers.map(async sourceUrl => {
      const sourceName = new URL(sourceUrl).hostname
      const metrics: Metric[] = []
      try {
        metrics.push(await getRpcGasPrice(chain, sourceName, sourceUrl))
        if (chain === 'optimism') {
          const op = await getOptimismFees(chain, sourceName, sourceUrl)
          metrics.push(...op)
        }
      } catch (error) {
        console.log(`${sourceName} failed: ${String(error)}`)
        countError(sourceName)
      }
      return metrics
    })
  })

  return (await Promise.all(promises.flat())).flat()
}

const server = createServer((req, res) => {
  allMetrics()
    .then(metrics => {
      res.writeHead(200, { 'Content-Type': 'text/plain' })

      let text = evmTypes
      text += emitErrorCounters()
      text += metrics.map(emitMetric).join('')
      res.end(text)
    })
    .catch(error => {
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end(String(error))
    })
})

server.listen(3000, () => {
  console.log('Serving metrics at http://localhost:3000/')
})
