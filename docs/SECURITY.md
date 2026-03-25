# Security Guidelines

## Security Principles

1. **Defense in Depth** - Multiple layers of security
2. **Least Privilege** - Minimum necessary permissions
3. **Secure by Default** - Security from the start
4. **Zero Trust** - Verify everything
5. **Security Through Transparency** - Open about practices

## Secrets Management

### Never Commit Secrets

❌ **NEVER commit:**

- API keys
- Passwords
- Database connection strings with credentials
- JWT secrets
- Private keys
- Certificates
- OAuth client secrets
- Any sensitive configuration

### Environment Variables

✅ **Use environment variables for:**

- All secrets
- All credentials
- Environment-specific configuration
- External service URLs

**Example `.env.local`:**

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/db
JWT_SECRET=your-secret-here-min-32-chars
ISSMANAGER_API_KEY=your-api-key
```

❌ **Never commit `.env` or `.env.local`**
✅ **Do commit `.env.example` with placeholders**

**Example `.env.example`:**

```bash
DATABASE_URL=postgresql://PLACEHOLDER_USER:PLACEHOLDER_PASSWORD@localhost:5432/crmanaliz
JWT_SECRET=PLACEHOLDER_JWT_SECRET_MIN_32_CHARS
ISSMANAGER_API_KEY=PLACEHOLDER_API_KEY
```

### Secret Rotation

- **JWT secrets:** Rotate quarterly
- **Database passwords:** Rotate semi-annually
- **API keys:** Rotate when compromised or annually
- **Service accounts:** Review and rotate regularly

### Secret Storage

**Development:**

- `.env.local` (gitignored)
- Never share via email/chat
- Use secure password managers

**Production:**

- Environment variables (managed by hosting platform)
- Encrypted configuration service
- Secret management service (e.g., AWS Secrets Manager, Azure Key Vault)

## Authentication & Authorization

### Authentication

#### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

#### Password Storage

- ✅ Hash with bcrypt (cost factor >= 12)
- ❌ NEVER store plain text passwords
- ❌ NEVER use MD5 or SHA1 for passwords

#### JWT Tokens

**Access Token:**

- Short-lived (7 days default)
- Contains minimal user info
- Signed with HS256
- Include: user ID, role, issued at, expiry

**Refresh Token:**

- Long-lived (30 days default)
- Stored securely (httpOnly cookie)
- Single use (rotated on refresh)
- Revocable

**Security Measures:**

```typescript
// Good JWT configuration
{
  secret: process.env.JWT_SECRET, // min 32 chars
  expiresIn: '7d',
  algorithm: 'HS256',
  issuer: 'crmanaliz',
  audience: 'crmanaliz-api'
}
```

### Authorization

#### Role-Based Access Control (RBAC)

**Roles:**

- `ADMIN` - Full system access
- `MANAGER` - Read/write analytics, read users
- `ANALYST` - Read/write analytics
- `VIEWER` - Read-only access

**Permission Matrix:**

| Resource     | ADMIN | MANAGER | ANALYST | VIEWER |
| ------------ | ----- | ------- | ------- | ------ |
| Users        | CRUD  | R       | -       | -      |
| Integrations | CRUD  | RU      | R       | R      |
| Analytics    | CRUD  | CRUD    | CRUD    | R      |
| Reports      | CRUD  | CRUD    | CRUD    | R      |
| Settings     | CRUD  | R       | -       | -      |

#### Guards & Decorators

```typescript
// Protect endpoint
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER')
@Get('settings')
getSettings() { ... }

// Protect resource
@UseGuards(JwtAuthGuard, OwnershipGuard)
@Get('reports/:id')
getReport(@Param('id') id: string) { ... }
```

## API Security

### Input Validation

✅ **Always validate:**

- Request body
- Query parameters
- Path parameters
- Headers

**Using DTOs:**

```typescript
import { IsString, IsEmail, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

### Output Sanitization

❌ **Never expose:**

- Full user objects (include passwords)
- Internal error details
- Stack traces in production
- Database errors

✅ **Always:**

- Remove sensitive fields
- Use DTOs for responses
- Sanitize error messages
- Mask personal data in logs

### Rate Limiting

**Endpoints:**

- Authentication: 5 requests/minute per IP
- API calls: 100 requests/minute per user
- Public endpoints: 20 requests/minute per IP

**Implementation:**

```typescript
// Global rate limit
app.use(rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: 'Too many requests'
}));

// Auth endpoint
@UseGuards(ThrottlerGuard)
@Throttle(5, 60) // 5 per minute
@Post('login')
login() { ... }
```

### CORS

**Configuration:**

```typescript
app.enableCors({
  origin: process.env.CORS_ORIGIN, // Specific origin
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

❌ **Never use `origin: '*'` in production**

### HTTPS

- ✅ Always use HTTPS in production
- ✅ Redirect HTTP to HTTPS
- ✅ Use HSTS header
- ✅ Use secure cookies

## Database Security

### SQL Injection Prevention

✅ **Use:**

- Parameterized queries
- ORM (Prisma)
- Query builders

❌ **Never:**

- String concatenation for queries
- User input directly in queries

**Good:**

```typescript
// Using Prisma
await prisma.user.findMany({
  where: { email: userEmail }, // Parameterized
});
```

**Bad:**

```typescript
// Direct SQL with concatenation - NEVER DO THIS
await db.query(`SELECT * FROM users WHERE email = '${userEmail}'`);
```

### Database Access

- ✅ Least privilege database users
- ✅ Separate users for read/write
- ✅ Connection pooling
- ✅ Encrypted connections (SSL/TLS)
- ❌ Never use root/admin in application

### Data Encryption

**At Rest:**

- Encrypt sensitive fields (e.g., API keys in config)
- Full disk encryption on servers
- Encrypted backups

**In Transit:**

- TLS 1.2+ for all connections
- Database connections over SSL
- API calls over HTTPS

## Audit Logging

### What to Log

✅ **Log:**

- Authentication attempts (success/failure)
- Authorization failures
- Configuration changes
- Integration settings updates
- Data exports
- Admin actions
- Sensitive data access

❌ **Never log:**

- Passwords
- Full credit card numbers
- API keys
- Session tokens
- Personal sensitive data

### Log Format

```typescript
{
  timestamp: '2026-03-25T10:30:00Z',
  level: 'info',
  action: 'user.login',
  userId: 'user-123',
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  result: 'success',
  metadata: {
    // Additional context
  }
}
```

### Sensitive Data Masking

```typescript
// Mask email
'user@example.com' → 'u***@example.com'

// Mask phone
'+90 555 123 4567' → '+90 555 *** ** 67'

// Mask API key
'sk_live_abcd1234...' → 'sk_live_****'
```

## Dependencies Security

### Regular Updates

```bash
# Check for vulnerabilities
pnpm audit

# Update dependencies
pnpm update

# Fix vulnerabilities
pnpm audit fix
```

### Dependency Monitoring

- Enable Dependabot on GitHub
- Review security advisories weekly
- Update critical vulnerabilities immediately
- Test updates in staging first

### Approved Packages Only

- ✅ Review package before adding
- ✅ Check package maintainership
- ✅ Check download statistics
- ✅ Check GitHub stars/issues
- ❌ Avoid abandoned packages

## Session Security

### Session Storage

- Store in Redis
- httpOnly cookies
- secure flag in production
- SameSite=Strict
- Short expiration

### Session Configuration

```typescript
{
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}
```

### Session Invalidation

- On logout
- On password change
- On role change
- On suspicious activity
- On manual admin action

## File Upload Security

### Validation

- ✅ Check file type (whitelist)
- ✅ Check file size (max limit)
- ✅ Scan for malware
- ✅ Generate random filenames
- ❌ Never trust client-provided filename

### Storage

- Store outside web root
- Serve via secure endpoint
- Use signed URLs
- Implement access control

## Headers Security

### Security Headers

```typescript
app.use(helmet()); // Sets multiple security headers

// Custom headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=()');
  next();
});
```

## Error Handling

### Production Errors

❌ **Never expose:**

```json
{
  "error": "Error: ECONNREFUSED connect to database",
  "stack": "Error: ECONNREFUSED\n    at TCPConnectWrap..."
}
```

✅ **Expose:**

```json
{
  "success": false,
  "error": {
    "code": "DATABASE_CONNECTION_ERROR",
    "message": "Unable to connect to database. Please try again later."
  }
}
```

### Error Logging

- Log full error server-side
- Include request context
- Include user context (non-sensitive)
- Set up error monitoring (future: Sentry)

## Incident Response

### If Secret Leaked

1. **Immediately:**
   - Revoke/rotate the secret
   - Remove from git history (BFG Repo-Cleaner)
   - Force push (if necessary)

2. **Assess:**
   - Check access logs
   - Identify potential impact
   - List affected systems

3. **Communicate:**
   - Notify affected users
   - Notify team
   - Document incident

4. **Prevent:**
   - Update procedures
   - Add checks
   - Review access

### Security Vulnerability

1. **Assess severity:**
   - Critical: Immediate action
   - High: Within 24 hours
   - Medium: Within 1 week
   - Low: Next sprint

2. **Fix:**
   - Create hotfix branch
   - Implement fix
   - Test thoroughly
   - Deploy

3. **Notify:**
   - Affected users
   - Stakeholders
   - Document publicly (if appropriate)

## Compliance

### Data Privacy

- GDPR compliance (if applicable)
- User consent for data collection
- Right to data deletion
- Data export capability
- Privacy policy

### Data Retention

- Define retention periods
- Automated data deletion
- Backup retention policy
- Audit log retention (min 1 year)

## Security Checklist

### Development

- [ ] No secrets in code
- [ ] Input validation
- [ ] Output sanitization
- [ ] Parameterized queries
- [ ] Error handling
- [ ] Audit logging

### Deployment

- [ ] HTTPS enabled
- [ ] Security headers set
- [ ] Rate limiting configured
- [ ] Secrets in environment
- [ ] Database encrypted
- [ ] Backups encrypted

### Ongoing

- [ ] Regular security updates
- [ ] Dependency audits
- [ ] Access reviews
- [ ] Penetration testing (future)
- [ ] Security training

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
- [NestJS Security](https://docs.nestjs.com/security/authentication)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)

---

**Last Updated:** 2026-03-25
**Version:** 0.1.0

**Security Contact:** security@crmanaliz.local
