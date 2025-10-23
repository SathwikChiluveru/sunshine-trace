function findUserById(id) {
  // Vulnerable: string concat ? SQL injection
  const sql = "SELECT * FROM users WHERE id=" + id;
  console.log("DEBUG Executing SQL:", sql);
  return sql;
}
module.exports = { findUserById };