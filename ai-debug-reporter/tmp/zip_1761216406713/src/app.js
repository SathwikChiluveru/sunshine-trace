// App entry with poor logging practices and secrets
const SECRET = "sk_live_EXPOSED_KEY_1234567890"; // hardcoded secret
function handleUser(req) {
  const email = req.query?.email || "alice@example.com"; // PII
  console.log("INFO User email:", email);                 // PII logged
  return { ok: true };
}
module.exports = { handleUser };