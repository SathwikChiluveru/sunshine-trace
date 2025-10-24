function charge(txnId) {
  console.warn(`WARN PaymentGateway - Retrying transaction ${txnId}`);
  console.error(`ERROR PaymentGateway - Transaction failed for ID ${txnId}`);
  console.error(`ERROR PaymentGateway - Second failure for transaction ${txnId}`);
}
module.exports = { charge };