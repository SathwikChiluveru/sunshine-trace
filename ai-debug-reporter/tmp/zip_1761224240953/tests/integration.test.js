const { authenticateUser } = require('../src/auth/auth');
const { processPayment } = require('../src/payment/payment');

function logTest(msg) {
  console.log(JSON.stringify({ level: "info", message: msg, testId: "test-789" }));
}

describe('Integration Tests', () => {
  test('should authenticate user', async () => {
    logTest("Running authentication test");
    const result = await authenticateUser('testuser', 'password');
    expect(result).toBe(true);
  });
  
  test('should process payment', () => {
    logTest("Running payment test");
    const result = processPayment(100, '4111111111111111');
    expect(result.success).toBe(true);
  });
});