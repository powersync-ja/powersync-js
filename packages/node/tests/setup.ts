// In database-related test failures, worker communication takes up almost all
// of the default stack trace (length 10). Increase this to aid in debugging failed tests.
Error.stackTraceLimit = 50;
