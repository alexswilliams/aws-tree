import { getAllResources } from './api-calls'
import { renderVpcs } from './renderers'

export async function main(): Promise<void> {
  console.log('Fetching information...'.grey)
  console.log('')

  const all = await getAllResources()
  renderVpcs(all.vpcs, all)
}

main()
