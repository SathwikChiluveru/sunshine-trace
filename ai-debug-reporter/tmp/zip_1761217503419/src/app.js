function logInfo(msg, fields={}) {
  console.log(JSON.stringify({ level: "info", message: msg, ...fields }))
}
function logError(msg, fields={}) {
  console.log(JSON.stringify({ level: "error", message: msg, ...fields, errorCode: "AUTH_401" }))
}
function handler(req) {
  const correlationId = "b8b6b7c2-7f2c-4f37-9c1a-2ac1e1c0a111"
  logInfo("Request received", { correlationId })
  // Trigger logging-quality heuristics: correlation + structured + errorCode
  logError("ERR_AUTH_FAILED: token invalid", { correlationId })
}
module.exports = { handler }