# System Architecture

## Overview

CRM Analiz Platform is an analytics and decision support layer built on top of ISSmanager CRM. It follows a **modern monorepo architecture** with clear separation between web frontend, API backend, and shared packages.

## Architecture Principles

### Core Tenets

1. **Separation of Concerns** - Clear boundaries between domains
2. **Type Safety** - TypeScript strict mode throughout
3. **Scalability** - Designed for growth from day one
4. **Maintainability** - Clean code, comprehensive docs
5. **Security First** - No shortcuts on security

## System Context

```
┌─────────────────────────────────────────────────────────────┐
│                    CRM Analiz Platform                      │
│                                                              │
│  ┌──────────────┐         ┌──────────────┐                 │
│  │   Web App    │◄────────┤   API Server │                 │
│  │  (Next.js)   │  REST   │   (NestJS)   │                 │
│  └──────────────┘         └───────┬──────┘                 │
│                                    │                         │
│                          ┌─────────▼─────────┐              │
│                          │    PostgreSQL     │              │
│                          │      Redis        │              │
│                          └───────────────────┘              │
└─────────────────────────────────────────────────────────────┘
                                   ▲
                                   │
                                   │ API Sync
                                   │
                          ┌────────┴────────┐
                          │   ISSmanager    │
                          │  (External CRM) │
                          └─────────────────┘
```

## Container Architecture

### Application Containers

#### 1. Web Application (apps/web)

- **Technology:** Next.js 15 (App Router)
- **Responsibility:** User interface, dashboard, reports
- **Key Features:**
  - Server-side rendering (SSR)
  - React Server Components (RSC)
  - Client-side interactivity
  - Responsive design
  - Premium UI/UX

#### 2. API Server (apps/api)

- **Technology:** NestJS 10
- **Responsibility:** Business logic, data processing, external integrations
- **Key Features:**
  - RESTful API (v1)
  - Modular architecture
  - Dependency injection
  - Request validation
  - Authentication & authorization
  - Background jobs

### Data Stores

#### 3. PostgreSQL

- **Purpose:** Primary data store
- **Contents:**
  - Normalized CRM data from ISSmanager
  - User accounts and permissions
  - Calculated scores and metrics
  - Audit logs
  - Configuration

#### 4. Redis

- **Purpose:** Caching and session management
- **Contents:**
  - API response cache
  - User sessions
  - Job queues
  - Rate limiting data
  - Temporary computations

## Component Architecture

### Monorepo Structure

```
crmanaliz/
├── apps/
│   ├── web/                    # Next.js Application
│   │   ├── src/
│   │   │   ├── app/           # App Router pages
│   │   │   ├── components/    # React components
│   │   │   ├── lib/           # Utilities
│   │   │   └── styles/        # Global styles
│   │   └── public/            # Static assets
│   │
│   └── api/                    # NestJS Application
│       ├── src/
│       │   ├── modules/       # Feature modules
│       │   │   ├── auth/
│       │   │   ├── integrations/
│       │   │   ├── neighborhoods/
│       │   │   ├── customers/
│       │   │   ├── personnel/
│       │   │   ├── analytics/
│       │   │   └── reporting/
│       │   ├── common/        # Shared utilities
│       │   └── main.ts        # Entry point
│       └── test/              # E2E tests
│
├── packages/
│   ├── types/                  # Shared TypeScript types
│   │   └── src/
│   │       └── index.ts       # Domain types
│   │
│   ├── ui/                     # Shared UI components
│   │   └── src/
│   │       └── components/    # Reusable components
│   │
│   └── config/                 # Shared configurations
│       ├── tsconfig.*.json    # TS configs
│       └── eslint-base.js     # ESLint config
│
└── docs/                       # Documentation
```

## Domain Architecture

### Domain Model

#### Core Domains

1. **Authentication & Authorization (auth)**
   - User management
   - JWT-based authentication
   - Role-based access control (RBAC)
   - Session management

2. **Integrations (integrations)**
   - ISSmanager connector
   - Data synchronization
   - Configuration management
   - Webhook handlers

3. **Neighborhoods (neighborhoods)**
   - Geographic data management
   - Quality score calculation
   - Trend analysis
   - Comparative analytics

4. **Customers (customers)**
   - Customer data aggregation
   - Behavior analysis
   - Segmentation
   - Insights generation

5. **Personnel (personnel)**
   - Performance tracking
   - Metric calculation
   - Efficiency analysis
   - Team analytics

6. **Finance (finance)**
   - Revenue tracking
   - Cost analysis
   - Profitability metrics
   - Financial reporting

7. **Analytics (analytics)**
   - Scoring algorithms
   - Statistical analysis
   - Machine learning (future)
   - Data processing

8. **Reporting (reporting)**
   - Report generation
   - Data export
   - Scheduling
   - Distribution

## Data Flow Architecture

### Data Synchronization Flow

```
ISSmanager API
      │
      │ 1. Scheduled Sync
      │
      ▼
┌─────────────┐
│   Sync Job  │
│  (NestJS)   │
└──────┬──────┘
       │
       │ 2. Extract & Transform
       │
       ▼
┌─────────────┐
│ PostgreSQL  │◄───── 3. Store
└──────┬──────┘
       │
       │ 4. Calculate Scores
       │
       ▼
┌─────────────┐
│  Analytics  │
│   Engine    │
└──────┬──────┘
       │
       │ 5. Cache Results
       │
       ▼
┌─────────────┐
│    Redis    │
└─────────────┘
```

### Request Flow

```
User Browser
      │
      │ HTTPS
      ▼
┌─────────────┐
│   Next.js   │
│  (SSR/RSC)  │
└──────┬──────┘
       │
       │ REST API
       ▼
┌─────────────┐
│   NestJS    │
│     API     │
└──────┬──────┘
       │
       ├───────────────┐
       │               │
       ▼               ▼
┌─────────┐     ┌─────────┐
│  Redis  │     │  Postgres│
│ (Cache) │     │  (Data)  │
└─────────┘     └─────────┘
```

## API Architecture

### API Versioning

- Base path: `/api/v1`
- Versioned for backward compatibility
- Breaking changes require new version

### API Structure

```
/api/v1
  ├── /health              # Health checks
  ├── /auth                # Authentication
  │   ├── POST /login
  │   ├── POST /logout
  │   └── POST /refresh
  ├── /integrations        # ISSmanager config
  │   ├── GET /
  │   ├── POST /
  │   └── PUT /:id
  ├── /neighborhoods       # Geographic data
  │   ├── GET /
  │   ├── GET /:id
  │   └── GET /:id/quality-score
  ├── /customers           # Customer analytics
  ├── /personnel           # Personnel metrics
  ├── /analytics           # Analytics data
  └── /reports             # Report generation
```

### API Patterns

**Request:**

```typescript
{
  // Validated DTOs
  // Type-safe
  // Sanitized
}
```

**Response:**

```typescript
{
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

## Security Architecture

### Defense in Depth

1. **Network Layer**
   - HTTPS only
   - CORS configuration
   - Rate limiting

2. **Authentication Layer**
   - JWT tokens
   - Refresh token rotation
   - Secure session storage

3. **Authorization Layer**
   - Role-based access control
   - Permission guards
   - Resource ownership validation

4. **Data Layer**
   - Parameterized queries
   - Input validation
   - Output sanitization
   - Encrypted sensitive fields

5. **Audit Layer**
   - All actions logged
   - Sensitive operations tracked
   - Compliance reporting

## Deployment Architecture

### Development Environment

```
Developer Machine
  ├── Docker Compose
  │   ├── PostgreSQL (local)
  │   ├── Redis (local)
  │   ├── API (hot reload)
  │   └── Web (hot reload)
  └── pnpm workspace
```

### Production Environment (Future)

```
Cloud Provider
  ├── Load Balancer
  │   └── SSL Termination
  ├── Application Tier
  │   ├── Web Servers (N instances)
  │   └── API Servers (N instances)
  ├── Data Tier
  │   ├── PostgreSQL (Primary + Replicas)
  │   └── Redis Cluster
  └── Monitoring
      ├── Logs
      ├── Metrics
      └── Alerts
```

## Technology Decisions

See [DECISIONS.md](DECISIONS.md) for architecture decision records (ADRs).

### Key Choices

| Decision        | Choice       | Rationale                          |
| --------------- | ------------ | ---------------------------------- |
| Monorepo Tool   | Turborepo    | Build caching, simple config       |
| Package Manager | pnpm         | Fast, efficient, workspace support |
| Web Framework   | Next.js 15   | App Router, RSC, best DX           |
| API Framework   | NestJS       | Enterprise-grade, modular          |
| Database        | PostgreSQL   | Robust, ACID, JSON support         |
| Cache           | Redis        | Industry standard, versatile       |
| Styling         | Tailwind CSS | Utility-first, rapid development   |

## Scalability Considerations

### Horizontal Scaling

- Stateless API servers
- Load balancer distribution
- Session storage in Redis
- Database connection pooling

### Vertical Scaling

- Query optimization
- Index management
- Cache strategy
- Background job processing

### Performance Optimization

- Server-side rendering (SSR)
- API response caching
- Database query optimization
- CDN for static assets (future)

## Monitoring & Observability

### Metrics (Future)

- Request rate and latency
- Error rates
- Database performance
- Cache hit rates

### Logging

- Structured logging
- Log levels (error, warn, info, debug)
- Sensitive data masking
- Centralized log aggregation (future)

### Health Checks

- `/api/v1/health` - API health
- Database connectivity
- Redis connectivity
- External API availability

## Future Enhancements

1. **Microservices** - Split API into domain services
2. **Message Queue** - RabbitMQ or Kafka for async processing
3. **GraphQL** - Alternative API layer for complex queries
4. **Real-time** - WebSocket support for live updates
5. **Machine Learning** - Predictive analytics
6. **Multi-tenancy** - Support for multiple organizations

---

**Last Updated:** 2026-03-25
**Version:** 0.1.0
