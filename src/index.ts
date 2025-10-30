import { createServer } from 'http'

import { ENV } from './env'
import { evmTypes, getOptimismFees, getRpcGasPrice } from './evm'
import { countError, emitErrorCounters, emitMetric, Metric } from './metric'

const keys = ENV.EVM_API_KEYS
const chains: Record<string, string[]> = {
  // Ethereum Mainnet
  ethereum: [
    ...(keys.alchemyApiKey !== ''
      ? [`https://eth-mainnet.alchemyapi.io/v2/${keys.alchemyApiKey}`]
      : []),
    ...(keys.infuraProjectId !== ''
      ? [`https://mainnet.infura.io/v3/${keys.infuraProjectId}`]
      : []),
    ...(keys.poktPortalApiKey !== ''
      ? [`https://eth-mainnet.rpc.grove.city/v1/${keys.poktPortalApiKey}`]
      : []),
    ...(keys.drpcApiKey !== ''
      ? [`https://lb.drpc.org/ogrpc?network=ethereum&dkey=${keys.drpcApiKey}`]
      : []),
    'https://cloudflare-eth.com',
    'https://rpc.ankr.com/eth'
  ],

  // Arbitrum One
  arbitrum: [
    'https://arb1.arbitrum.io/rpc',
    'https://arbitrum-one.public.blastapi.io',
    'https://rpc.ankr.com/arbitrum',
    ...(keys.poktPortalApiKey !== ''
      ? [`https://arbitrum-one.rpc.grove.city/v1/lb/${keys.poktPortalApiKey}`]
      : []),
    ...(keys.drpcApiKey !== ''
      ? [`https://lb.drpc.org/ogrpc?network=arbitrum&dkey=${keys.drpcApiKey}`]
      : [])
  ],

  // Optimism
  optimism: [
    'https://mainnet.optimism.io',
    'https://rpc.ankr.com/optimism',
    ...(keys.drpcApiKey !== ''
      ? [`https://lb.drpc.org/ogrpc?network=optimism&dkey=${keys.drpcApiKey}`]
      : [])
  ],

  // Polygon (MATIC)
  polygon: [
    'https://polygon-rpc.com/',
    'https://rpc.polycat.finance',
    'https://rpc-mainnet.maticvigil.com',
    'https://matic-mainnet.chainstacklabs.com',
    'https://rpc.ankr.com/polygon',
    ...(keys.poktPortalApiKey !== ''
      ? [`https://poly-mainnet.rpc.grove.city/v1/${keys.poktPortalApiKey}`]
      : []),
    ...(keys.quiknodeApiKey !== ''
      ? [`https://rpc-mainnet.matic.quiknode.pro/${keys.quiknodeApiKey}/`]
      : []),
    ...(keys.drpcApiKey !== ''
      ? [`https://lb.drpc.org/ogrpc?network=polygon&dkey=${keys.drpcApiKey}`]
      : [])
  ],

  // Base
  base: [
    ...(keys.drpcApiKey !== ''
      ? [`https://lb.drpc.org/ogrpc?network=base&dkey=${keys.drpcApiKey}`]
      : []),
    'https://base-mainnet.public.blastapi.io',
    'https://rpc.ankr.com/base'
  ],

  // BNB Smart Chain
  binancesmartchain: [
    'https://rpc.ankr.com/bsc',
    'https://bsc-dataseed.binance.org',
    'https://bsc-dataseed1.defibit.io',
    'https://bsc-dataseed1.ninicoin.io',
    ...(keys.drpcApiKey !== ''
      ? [`https://lb.drpc.org/ogrpc?network=bsc&dkey=${keys.drpcApiKey}`]
      : [])
  ],

  // Avalanche (C-Chain)
  avalanche: [
    'https://api.avax.network/ext/bc/C/rpc',
    'https://rpc.ankr.com/avalanche',
    ...(keys.drpcApiKey !== ''
      ? [`https://lb.drpc.org/ogrpc?network=avalanche&dkey=${keys.drpcApiKey}`]
      : [])
  ],

  // Fantom
  fantom: [
    ...(keys.poktPortalApiKey !== ''
      ? [`https://fantom-mainnet.rpc.grove.city/v1/${keys.poktPortalApiKey}`]
      : []),
    ...(keys.quiknodeApiKey !== ''
      ? [
          `https://polished-empty-cloud.fantom.quiknode.pro/${keys.quiknodeApiKey}/`
        ]
      : []),
    'https://rpc.ankr.com/fantom',
    'https://rpc.ftm.tools',
    ...(keys.drpcApiKey !== ''
      ? [`https://lb.drpc.org/ogrpc?network=fantom&dkey=${keys.drpcApiKey}`]
      : [])
  ],

  // Celo
  celo: [
    'https://forno.celo.org',
    'https://rpc.ankr.com/celo',
    'https://celo-mainnet-rpc.allthatnode.com',
    ...(keys.drpcApiKey !== ''
      ? [`https://lb.drpc.org/ogrpc?network=celo&dkey=${keys.drpcApiKey}`]
      : [])
  ],

  // zkSync Era
  zksync: [
    'https://mainnet.era.zksync.io',
    ...(keys.drpcApiKey !== ''
      ? [`https://lb.drpc.org/ogrpc?network=zksync&dkey=${keys.drpcApiKey}`]
      : [])
  ],

  // Rootstock (RSK)
  rsk: [
    'https://public-node.rsk.co',
    ...(keys.drpcApiKey !== ''
      ? [`https://lb.drpc.org/ogrpc?network=rootstock&dkey=${keys.drpcApiKey}`]
      : [])
  ],

  // PulseChain
  pulsechain: ['https://rpc.pulsechain.com/'],

  // HyperEVM (HYPE)
  hyperevm: [
    'https://rpc.hyperliquid.xyz/evm',
    'https://rpc.hypurrscan.io',
    'https://hyperliquid-json-rpc.stakely.io'
  ],

  // Sonic
  sonic: ['https://rpc.soniclabs.com'],

  // Filecoin FEVM
  filecoinfevm: [
    'https://api.node.glif.io/',
    'https://rpc.ankr.com/filecoin',
    ...(keys.drpcApiKey !== ''
      ? [`https://lb.drpc.org/ogrpc?network=filecoin&dkey=${keys.drpcApiKey}`]
      : [])
  ],

  // Ethereum Classic
  ethereumclassic: [
    'https://etc.rivet.link',
    'https://geth-de.etc-network.info',
    'https://geth-at.etc-network.info',
    'https://etc.etcdesktop.com'
  ],

  // Botanix
  botanix: ['https://rpc.botanixlabs.com'],

  // BOB
  bobevm: ['https://rpc.gobob.xyz']
}

export async function allMetrics(): Promise<Metric[]> {
  const promises = Object.keys(chains).map(chain => {
    const servers = chains[chain]

    return servers.map(async sourceUrl => {
      const sourceName = new URL(sourceUrl).hostname
      const metrics: Metric[] = []
      try {
        metrics.push(await getRpcGasPrice(chain, sourceName, sourceUrl))
        if (chain === 'optimism' || chain === 'base') {
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
