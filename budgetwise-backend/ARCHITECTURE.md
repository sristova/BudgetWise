# BudgetWise — PostgreSQL is the right choice

PostgreSQL beats MySQL and SQLite for a fintech mobile app because:
- JSONB columns handle AI chat history and flexible metadata efficiently
- Arbitrary-precision DECIMAL avoids floating-point money bugs
- Window functions (SUM OVER, LAG) power monthly analytics without application-level logic
- Row-level security and fine-grained permissions suit multi-user financial data
- Native UUID support, partial indexes, and GIN full-text search scale cleanly to thousands of users
- ACID guarantees with proper isolation levels prevent double-spend and race conditions
