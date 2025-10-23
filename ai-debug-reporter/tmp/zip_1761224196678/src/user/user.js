function createUser(userData) {
  // Terrible logging - plain text, no structure, no error codes
  console.log("Creating user");
  console.log("User data:", userData);
  
  if (!userData.email) {
    console.log("Error: Email required");
    return null;
  }
  
  // Log PII in plain text
  console.log("User created successfully for:", userData.email);
  return { id: 123, email: userData.email };
}

module.exports = { createUser };