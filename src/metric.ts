export interface Metric {
  name: string
  value: number

  /** Chain name like "optimism" */
  chain: string

  /** Data source like "info-eu1" */
  source: string
}

const errorCounts = new Map<string, number>()

export function countError(source: string): void {
  const errorCount = errorCounts.get(source) ?? 0
  errorCounts.set(source, errorCount + 1)
}

export function emitMetric(metric: Metric): string {
  const { name, chain, source, value } = metric
  return `${name}{chain="${chain}",source="${source}"} ${value}\n`
}

export function emitErrorCounters(): string {
  let out = '# TYPE evm_scrape_errors counter\n'
  for (const [source, count] of errorCounts.entries()) {
    out += `evm_scrape_errors{source="${source}"} ${count}\n`
  }
  return out
}
