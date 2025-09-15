# Production Deployment Guide

## 🚀 Pre-Deployment Checklist

### 1. **Environment Setup**
- [ ] Encore CLI installed and authenticated
- [ ] Stellar accounts created and configured
- [ ] Database migrations ready
- [ ] All secrets configured in Encore Cloud
- [ ] Domain and SSL certificates prepared

### 2. **Security Configuration**
- [ ] All security headers configured
- [ ] Rate limiting parameters set
- [ ] CORS policies configured
- [ ] Input validation rules verified
- [ ] Logging and monitoring setup

### 3. **Performance Optimization**
- [ ] Caching configuration optimized
- [ ] Database connection pooling configured
- [ ] CDN setup for static assets
- [ ] Load balancing configured (if needed)

## 📋 Step-by-Step Deployment

### Step 1: Configure Secrets

1. **Access Encore Cloud Dashboard**
   ```bash
   encore auth login
   ```

2. **Configure Required Secrets**
   Navigate to your app's Infrastructure tab and add:
   ```bash
   StellarHorizonUrl=https://horizon.stellar.org
   StellarNetworkPassphrase=Public Global Stellar Network ; September 2015
   IssuingAccountPublicKey=YOUR_ISSUING_ACCOUNT_PUBLIC_KEY
   IssuingAccountSecretKey=YOUR_ISSUING_ACCOUNT_SECRET_KEY
   DistributionAccountPublicKey=YOUR_DISTRIBUTION_ACCOUNT_PUBLIC_KEY
   DistributionAccountSecretKey=YOUR_DISTRIBUTION_ACCOUNT_SECRET_KEY
   AssetCode=iLede
   KycProviderApiKey=YOUR_KYC_API_KEY
   BankingApiKey=YOUR_BANKING_API_KEY
   ```

### Step 2: Set Up Stellar Accounts

1. **Create Issuing Account**
   ```bash
   # Generate keypair
   stellar-cli generate-keypair
   
   # Fund account (testnet)
   curl "https://friendbot.stellar.org/?addr=YOUR_ISSUING_ACCOUNT_PUBLIC_KEY"
   
   # Set account flags
   stellar-cli set-options --account YOUR_ISSUING_ACCOUNT_SECRET_KEY \
     --set-auth-required \
     --set-auth-revocable
   ```

2. **Create Distribution Account**
   ```bash
   # Generate keypair
   stellar-cli generate-keypair
   
   # Fund account
   curl "https://friendbot.stellar.org/?addr=YOUR_DISTRIBUTION_ACCOUNT_PUBLIC_KEY"
   ```

3. **Create and Distribute iLede Asset**
   ```bash
   # Create trustline from distribution to issuing
   stellar-cli change-trust --account YOUR_DISTRIBUTION_ACCOUNT_SECRET_KEY \
     --asset-code iLede \
     --asset-issuer YOUR_ISSUING_ACCOUNT_PUBLIC_KEY
   
   # Transfer 1.2B iLede from issuing to distribution
   stellar-cli payment --account YOUR_ISSUING_ACCOUNT_SECRET_KEY \
     --destination YOUR_DISTRIBUTION_ACCOUNT_PUBLIC_KEY \
     --asset-code iLede \
     --asset-issuer YOUR_ISSUING_ACCOUNT_PUBLIC_KEY \
     --amount 1200000000
   ```

### Step 3: Deploy Backend

1. **Deploy to Encore Cloud**
   ```bash
   cd backend
   encore run
   ```

2. **Verify Deployment**
   ```bash
   # Check health endpoint
   curl https://your-app.encr.app/health
   
   # Check detailed health
   curl https://your-app.encr.app/health/detailed
   ```

### Step 4: Deploy Frontend

1. **Build Frontend**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **Deploy to Encore**
   ```bash
   cd backend
   encore run
   ```

### Step 5: Configure Domain

1. **Update stellar.toml**
   ```toml
   VERSION="2.0.0"
   
   [DOCUMENTATION]
   ORG_NAME="iLede"
   ORG_DBA="iLede Wallet"
   ORG_URL="https://your-domain.com"
   
   [CURRENCIES]
   [[CURRENCIES]]
   code="iLede"
   issuer="YOUR_ISSUING_ACCOUNT_PUBLIC_KEY"
   # ... rest of configuration
   
   [TRANSFER_SERVER]
   TRANSFER_SERVER="https://your-domain.com"
   
   [WEB_AUTH_ENDPOINT]
   WEB_AUTH_ENDPOINT="https://your-domain.com/auth"
   ```

2. **Deploy stellar.toml**
   ```bash
   # Upload to your domain's .well-known directory
   curl -X PUT https://your-domain.com/.well-known/stellar.toml \
     --data-binary @stellar.toml
   ```

## 🔧 Production Configuration

### Environment Variables
```bash
NODE_ENV=production
LOG_LEVEL=info
CACHE_TTL=300000
RATE_LIMIT_WINDOW=60000
MAX_CACHE_SIZE=1000
```

### Database Configuration
```sql
-- Optimize PostgreSQL for production
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
```

### Monitoring Setup

1. **Health Check Endpoints**
   - `/health` - Basic health check
   - `/health/detailed` - Detailed system info
   - `/ready` - Kubernetes readiness
   - `/live` - Kubernetes liveness

2. **Key Metrics to Monitor**
   - Response times
   - Error rates
   - Rate limit violations
   - Database connections
   - Stellar network connectivity
   - Memory usage
   - Cache hit rates

## 🛡️ Security Hardening

### 1. **Network Security**
```bash
# Configure firewall rules
ufw allow 443/tcp
ufw allow 80/tcp
ufw deny 22/tcp
ufw enable
```

### 2. **SSL/TLS Configuration**
```nginx
# Nginx SSL configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
```

### 3. **Security Headers**
All security headers are automatically applied via the middleware:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security`
- `Content-Security-Policy`

## 📊 Performance Optimization

### 1. **Caching Strategy**
- Balance data: 30 seconds TTL
- User data: 5 minutes TTL
- Asset info: 1 hour TTL
- Rate limit data: 15 minutes TTL

### 2. **Database Optimization**
- Connection pooling enabled
- Query optimization
- Proper indexing
- Regular maintenance

### 3. **CDN Configuration**
```bash
# Configure CDN for static assets
# Cache static assets for 1 year
# Cache API responses for 5 minutes
```

## 🔍 Monitoring & Alerting

### 1. **Log Monitoring**
```bash
# Set up log aggregation
# Configure log rotation
# Set up log analysis
```

### 2. **Performance Monitoring**
```bash
# Monitor response times
# Track error rates
# Monitor resource usage
# Set up alerts
```

### 3. **Security Monitoring**
```bash
# Monitor rate limit violations
# Track security events
# Monitor failed authentication attempts
# Set up intrusion detection
```

## 🚨 Incident Response

### 1. **Emergency Procedures**
- [ ] Identify the issue
- [ ] Assess impact
- [ ] Implement containment
- [ ] Restore service
- [ ] Document incident

### 2. **Rollback Procedures**
```bash
# Rollback to previous version
encore deploy --env=production --version=previous

# Database rollback
encore db rollback --env=production
```

### 3. **Communication Plan**
- [ ] Notify stakeholders
- [ ] Update status page
- [ ] Document resolution
- [ ] Conduct post-mortem

## 📈 Scaling Considerations

### 1. **Horizontal Scaling**
- Load balancer configuration
- Database read replicas
- Cache clustering
- CDN optimization

### 2. **Vertical Scaling**
- Increase server resources
- Optimize database performance
- Enhance caching strategy
- Improve code efficiency

### 3. **Auto-scaling**
- Configure auto-scaling rules
- Set up monitoring triggers
- Implement health checks
- Test scaling procedures

## 🔄 Maintenance Procedures

### 1. **Regular Maintenance**
- [ ] Security updates
- [ ] Dependency updates
- [ ] Database maintenance
- [ ] Log cleanup
- [ ] Performance optimization

### 2. **Backup Procedures**
- [ ] Database backups
- [ ] Configuration backups
- [ ] Code backups
- [ ] Test restore procedures

### 3. **Update Procedures**
- [ ] Test in staging
- [ ] Deploy to production
- [ ] Monitor deployment
- [ ] Rollback if needed

---

## 📞 Support & Resources

- **Documentation**: [Encore Docs](https://encore.dev/docs)
- **Stellar Docs**: [Stellar Protocol](https://stellar.org/protocol)
- **Security Guide**: [SECURITY.md](./SECURITY.md)
- **Support**: support@ilede.example.com

---

**Remember**: Always test deployments in a staging environment first and have rollback procedures ready!

