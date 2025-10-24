// Security vulnerabilities for AI to detect
function validateInput(input) {
  // SQL Injection vulnerability
  const query = "SELECT * FROM users WHERE id = " + input;
  return query;
}

function hashPassword(password) {
  // Weak hashing - no salt
  return Buffer.from(password).toString('base64');
}

function processUserData(userData) {
  // Log sensitive data without masking
  console.log("Processing user:", userData);
  
  // XSS vulnerability
  return "<div>Welcome " + userData.name + "</div>";
}

module.exports = { validateInput, hashPassword, processUserData };