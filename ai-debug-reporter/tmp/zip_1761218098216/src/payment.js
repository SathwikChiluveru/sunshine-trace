function pay(txnId) {
  const correlationId = "d1112222-3333-4444-aaaa-bbbbbbbbbbbb"
  console.log(JSON.stringify({ level: "info", message: "Payment attempt", correlationId }))
  console.log(JSON.stringify({ level: "error", message: "ERR_PAY_DECLINED", errorCode: "PAY_402", correlationId }))
}
module.exports = { pay }