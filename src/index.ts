import { getAllResources } from './api-calls'
import { renderVpcs } from './renderers'

export async function main(): Promise<void> {
  Error.stackTraceLimit = Infinity
  console.log('Fetching information...'.grey)
  console.log('')

  try {
    const all = await getAllResources()
    renderVpcs(all.vpcs, all)
  } catch (e: unknown) {
    console.error('! Encountered an error while contacting AWS:'.red)
    if (e instanceof Error) {
      console.error(e.message.red.bold)
      console.error(e.stack?.grey)
    }
    console.error('')
  }
}

main()
