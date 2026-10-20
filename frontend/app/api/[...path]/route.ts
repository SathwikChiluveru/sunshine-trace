const routes: Record<string, string[]> = {
  GET: ["summary", "summary/metrics", "findings"],
  POST: ["analyze/file", "analyze/batch", "analyze/zip", "ai/analyze"],
}

type RouteContext = { params: Promise<{ path: string[] }> }

async function proxy(request: Request, context: RouteContext) {
  const { path } = await context.params
  const endpoint = path.join("/")
  if (!routes[request.method]?.includes(endpoint)) {
    return Response.json({ error: "Endpoint not found." }, { status: 404 })
  }

  const base = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000").replace(/\/$/, "")
  try {
    const response = await fetch(`${base}/api/${endpoint}`, {
      method: request.method,
      headers: { "Content-Type": "application/json" },
      body: request.method === "POST" ? await request.text() : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(request.method === "POST" ? 120_000 : 8_000),
    })
    if (!response.ok) {
      return Response.json({ error: "The analysis service could not complete this request." }, { status: response.status })
    }
    return Response.json(await response.json(), { headers: { "Cache-Control": "no-store" } })
  } catch {
    return Response.json({ error: "The analysis service is currently unavailable." }, { status: 503 })
  }
}

export { proxy as GET, proxy as POST }
