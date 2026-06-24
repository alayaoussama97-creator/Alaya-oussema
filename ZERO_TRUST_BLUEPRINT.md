# Zero Trust Authentication Architecture (Nexus ZT)

## 1. Identity Layer (IdP)
- **Engine**: Keycloak (OIDC/OAuth2/SSO)
- **Session**: Secure JWT with Refresh Token Rotation and short TTL (60 min)
- **Database**: PostgreSQL (Identities) / Redis (Session Caching)

## 2. Dynamic Access Control (Risk Engine)
- **Input**: User behavior, Geolocation, Device Fingerprint, mTLS status
- **Scoring**: 
  - `Low`: Grant access
  - `Medium`: Step-up MFA (OTP/Push)
  - `High`: Immediate Block + Incident creation in SOC
- **AI Models**: Isolation Forest (Anomaly), Logistic Regression (Fraud)

## 3. Machine Authentication (mTLS)
- **Flow**: Client Certificate required for all API calls
- **Termination**: Nginx Ingress with `ssl_verify_client on`
- **Headers**: `X-SSL-Client-Verify`, `X-SSL-Client-DN` passed to backend

## 4. Multi-Factor Authentication
- **Strong**: WebAuthn/Passkeys (FIDO2) - Biometric hardware
- **Primary**: TOTP (RFC 6238) - Google Authenticator/Authy
- **Fallback**: Magic Links (Signed URLs)

## 5. Device Trust
- **Validation**: Fingerprint JS + Mobile Health Check
- **Inventory**: Automatic device registration on first trusted login
- **Sanctions**: Automatic revocation if "Root/Jailbreak" detected

---

# Infrastructure Stack

| Service | Purpose | Port |
|---------|---------|------|
| Nginx | mTLS Termination / Reverse Proxy | 443 |
| Keycloak | OIDC Identity Provider | 8080 |
| Node Service | Auth API / Risk Engine | 3000 |
| Postgres | Identity Persistence | 5432 |
| Elasticsearch | Audit Trail / Log Storage | 9200 |
| Fail2Ban | IP Brute Force Protection | - |
