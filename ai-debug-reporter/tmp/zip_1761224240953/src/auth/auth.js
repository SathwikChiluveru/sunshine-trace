const bcrypt = require('bcrypt');

function logInfo(msg, fields={}) {
  console.log(JSON.stringify({ level: "info", message: msg, ...fields }))
}

function logError(msg, fields={}) {
  console.log(JSON.stringify({ level: "error", message: msg, errorCode: "AUTH_401", ...fields }))
}

async function authenticateUser(username, password) {
  logInfo("Authentication attempt", { username });
  
  // Simulate auth failure
  if (username === 'admin') {
    logError("Authentication failed: invalid password", { username, errorCode: "AUTH_401" });
    return false;
  }
  
  return true;
}

module.exports = { authenticateUser };