function logInfo(msg, fields={}) {
  console.log(JSON.stringify({ level: "info", message: msg, correlationId: "db-456", ...fields }))
}

function connectDatabase() {
  logInfo("Attempting database connection", { host: "localhost", port: 5432 });
  
  try {
    // Simulate connection failure
    throw new Error("Connection timeout");
  } catch (error) {
    logInfo("Database connection failed", { error: error.message });
    return false;
  }
}

module.exports = { connectDatabase };