import { readFile, writeFile } from 'node:fs/promises'

const update = async (file, find, replace) => {
  const source = await readFile(file, 'utf8')
  if (!source.includes(find)) throw new Error(`Cannot patch ${file}`)
  await writeFile(file, source.replace(find, replace))
}

await update(
  'apps/frontend/src/state/epics/valkeyEpics.ts',
  '      tap(() => {\n        const host = import.meta.env.VITE_LOCAL_VALKEY_HOST',
  `      tap(() => {
        fetch("/bootstrap")
          .then((response) => response.ok ? response.json() : null)
          .then((connectionDetails) => {
            if (!connectionDetails) return
            store.dispatch(connectPending({
              connectionId: buildConnectionId(connectionDetails.host, connectionDetails.port, connectionDetails.db),
              connectionDetails,
              usePreconfiguredConnection: true,
            }))
          })
          .catch(() => undefined)

        const host = import.meta.env.VITE_LOCAL_VALKEY_HOST`,
)

await update(
  'apps/server/src/actions/connection.ts',
  'import { GlideClusterClient } from "@valkey/valkey-glide"',
  'import { GlideClusterClient } from "@valkey/valkey-glide"\nimport { initialConnectionDetails, preConfiguredConnection } from "../metrics-orchestrator"',
)
await update(
  'apps/server/src/actions/connection.ts',
  '  connectionId: string,\n  isRetry?: boolean,',
  '  connectionId: string,\n  usePreconfiguredConnection?: boolean,\n  isRetry?: boolean,',
)
await update(
  'apps/server/src/actions/connection.ts',
  '    const client = await connectToValkey(',
  '    const connectionDetails = payload.usePreconfiguredConnection && preConfiguredConnection\n      ? initialConnectionDetails\n      : payload.connectionDetails\n\n    const client = await connectToValkey(',
)
await update(
  'apps/server/src/actions/connection.ts',
  '      payload,\n    )',
  '      { ...payload, connectionDetails },\n    )',
)

await update(
  'apps/server/src/index.ts',
  `  if (preConfiguredConnection) {
    startPreconfiguredMetricsServers()
  }
`,
  '',
)
await update(
  'apps/server/src/index.ts',
  '// Fallback to index.html for SPA routing',
  `app.get("/bootstrap", (_req: Request, res: Response) => {
  if (!preConfiguredConnection) {
    res.sendStatus(204)
    return
  }
  const { password, ...connectionDetails } = initialConnectionDetails
  res.json(connectionDetails)
})

// Fallback to index.html for SPA routing`,
)
