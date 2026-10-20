const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const { test } = require('node:test')
const ts = require('typescript')
const React = require('react')
const { renderToString } = require('react-dom/server')

// Load the app's real TSX components without introducing a second test toolchain.
const frontend = path.resolve(__dirname, '..')
const resolveFilename = Module._resolveFilename
Module._resolveFilename = function (specifier, ...args) {
  return resolveFilename.call(this, specifier.startsWith('@/')
    ? path.join(frontend, specifier.slice(2)) : specifier, ...args)
}
for (const extension of ['.ts', '.tsx']) {
  require.extensions[extension] = (module, filename) => {
    const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    })
    module._compile(result.outputText, filename)
  }
}

const { Header } = require('../components/header.tsx')
const { ErrorFlowSection } = require('../components/sections/error-flow-section.tsx')
const NativeDate = Date
function renderAt(Component, props, instant) {
  global.Date = class extends NativeDate {
    constructor(...args) { super(...(args.length ? args : [instant])) }
    static now() { return new NativeDate(instant).getTime() }
  }
  try { return renderToString(React.createElement(Component, props)) }
  finally { global.Date = NativeDate }
}

test('report header has identical initial HTML across server and client clocks', () => {
  assert.equal(
    renderAt(Header, {}, '2026-10-20T01:00:00Z'),
    renderAt(Header, {}, '2026-10-21T02:00:00Z'),
  )
})

test('error flows do not fabricate timestamps from the current clock', () => {
  const props = { data: { errorFlows: [{ stackTop: 'FATAL request failed', path: ['request', 'database'] }] } }
  assert.equal(
    renderAt(ErrorFlowSection, props, '2026-10-20T01:00:00Z'),
    renderAt(ErrorFlowSection, props, '2026-10-21T02:00:00Z'),
  )
})

const { GET, POST } = require('../app/api/[...path]/route.ts')

async function withFetch(mock, run) {
  const originalFetch = global.fetch
  global.fetch = mock
  try { await run() } finally { global.fetch = originalFetch }
}

test('metrics proxy returns an explicit unavailable response when the backend is offline', async () => {
  await withFetch(async () => { throw new TypeError('Failed to fetch') }, async () => {
    const response = await GET(new Request('http://localhost/api/summary/metrics'), { params: Promise.resolve({ path: ['summary', 'metrics'] }) })
    assert.equal(response.status, 503)
    assert.match((await response.json()).error, /unavailable/)
  })
})

test('metrics proxy preserves valid history and disables stale caching', async () => {
  const payload = { currentMetrics: { errorFlows: 2 }, history: [], isSample: true }
  await withFetch(async (url, options) => {
    assert.ok(url.endsWith('/api/summary/metrics'))
    assert.equal(options.cache, 'no-store')
    return Response.json(payload)
  }, async () => {
    const response = await GET(new Request('http://localhost/api/summary/metrics'), { params: Promise.resolve({ path: ['summary', 'metrics'] }) })
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), payload)
    assert.equal(response.headers.get('cache-control'), 'no-store')
  })
})

test('proxy rejects unrecognized endpoints without contacting the backend', async () => {
  await withFetch(async () => { assert.fail('Unknown endpoints must not be forwarded') }, async () => {
    const response = await GET(new Request('http://localhost/api/private'), { params: Promise.resolve({ path: ['private'] }) })
    assert.equal(response.status, 404)
  })
})

test('analysis proxy preserves uploaded content and upstream failures', async () => {
  const body = JSON.stringify({ content: '[ERROR] Connection timeout', selectedTypes: ['error-flow'] })
  await withFetch(async (url, options) => {
    assert.ok(url.endsWith('/api/analyze/file'))
    assert.equal(options.method, 'POST')
    assert.equal(options.body, body)
    return Response.json({ error: 'Upstream failure' }, { status: 502 })
  }, async () => {
    const response = await POST(new Request('http://localhost/api/analyze/file', { method: 'POST', body }), { params: Promise.resolve({ path: ['analyze', 'file'] }) })
    assert.equal(response.status, 502)
  })
})

test('summary renders local analysis even when optional heatmap data is missing', () => {
  const { SummarySection } = require('../components/sections/summary-section.tsx')
  const html = renderToString(React.createElement(SummarySection, {
    data: null, executiveSummary: 'Review connection failures.', riskHeatmapData: null,
    findingsData: { loggingScores: [{ module: 'api' }], errorFlows: [{}], piiFindings: [] },
    summaryData: { recommended_actions: ['Add a retry policy'] },
  }))
  assert.ok(html.includes('Review connection failures.'))
  assert.ok(html.includes('Modules reviewed'))
  assert.ok(html.includes('Loading analysis history'))
})
