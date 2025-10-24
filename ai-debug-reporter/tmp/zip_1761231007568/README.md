# Sunshine Trace Test Codebase

This codebase is designed to test all features of Sunshine Trace:

## Logging Quality Levels:
- **app.js**: Excellent (100/100) - Structured JSON + Correlation ID + Error Codes
- **auth.js**: Good (67/100) - Structured JSON + Error Codes, missing Correlation ID  
- **payment.js**: Poor (33/100) - Only Error Codes, no structure
- **user.js**: Terrible (0/100) - Plain text, no structure
- **db.js**: Medium (67/100) - Structured JSON + Correlation ID, no Error Codes

## Expected Results:
- **Heatmap**: Various risk levels (0, 33, 67, 67, 100)
- **Logging Quality**: Different scores per module
- **Sensitive Data**: Email addresses, NRIC, phone numbers
- **Error Flows**: WARN ? ERROR ? FATAL patterns
- **Summary**: CRITICAL status due to fatal errors
- **AI Analysis**: Security vulnerabilities in security.js

## Files:
- Source code with different logging practices
- Log files with error patterns and PII
- Test files for comprehensive coverage