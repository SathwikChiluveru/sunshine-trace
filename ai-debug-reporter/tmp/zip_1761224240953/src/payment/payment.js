function processPayment(amount, cardNumber) {
  // Poor logging - no structured format, no correlation ID
  console.log("Processing payment for amount:", amount);
  
  if (amount > 1000) {
    console.log("ERROR: Payment declined - amount too high");
    return { success: false, errorCode: "PAY_402" };
  }
  
  // Log sensitive data (PII issue)
  console.log("Payment successful for card ending in:", cardNumber.slice(-4));
  return { success: true, transactionId: "txn-123" };
}

module.exports = { processPayment };