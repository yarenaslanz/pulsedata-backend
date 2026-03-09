PulseData-Backend
PulseData-Backend is a RESTful API designed for managing user data quotas in a telecommunications context. The project focuses on core backend principles, including secure authentication, database integration, and server-side security measures.

Core Features
Authentication and Security: Implementation of JSON Web Token (JWT) for stateless authentication and Bcrypt.js for secure password hashing.

Quota Management System: Routes designed to track, consume, and refill user data quotas with real-time database updates.

API Protection: Integrated Rate Limiting to prevent automated abuse and ensure service stability.

Relational Data Modeling: Structured schema design using PostgreSQL (Supabase), with a planned migration to MSSQL environments.

Technical Stack
Runtime Environment: Node.js

Web Framework: Express.js

Database: PostgreSQL / MSSQL

Security & Auth: JWT, Bcrypt.js, Express-Rate-Limit