import * as api from './api-calls'
import { renderVpcs } from './renderers'

export async function main(): Promise<void> {
  const all = await api.getAllResources()

  renderVpcs(all.vpcs, all)
}

main()
