# Nexus Zero Trust Security Architecture

This document outlines the production-ready authentication and access control strategy implemented for the Nexus platform.

## 1. Multi-Layered Authentication (Zero Trust)

We implement a "Never Trust, Always Verify" model where identity is not just a password, but a composite score of multiple signals.

### 1.1 Identity Provider (IdP)
- **Keycloak Integration**: Centralized OIDC/SSO provider.
- **Protocol**: OpenID Connect over TLS 1.3.
- **Scopes**: Standard OIDC scopes plus custom `nexus:roles` claim.

### 1.2 Authentication Factors
| Factor | Implementation | Purpose |
| :--- | :--- | :--- |
| **Possession** | Client Certificate (mTLS) | Verifies the hardware (Machine Identity). |
| **Knowledge** | Strong Password (Argon2) | Verifies user-secret knowledge. |
| **Inherence** | Passkeys (FIDO2/WebAuthn) | Utilizes biometrics for passwordless trust. |
| **Out-of-Band** | Magic Link (HMAC) | Secures secondary verification for high-risk logins. |

---

## 2. Machine Identity (mTLS)

Access to core infrastructure (API, Secrets) is gated by **Nginx mTLS enforcement**.
- **Mutual TLS**: Handshake fails if the client cannot present a certificate signed by the internal Nexus CA.
- **Nginx Config**: `ssl_verify_client on;` with certificate fingerprint logging.
- **Validation**: Backend verifies the machine ID against the registry before serving vault records.

---

## 3. Adaptive Risk Engine (AI/ML)

The system calculates a **Dynamic Risk Score** (0-100) on every action.

### 3.1 Risk Intelligence Models
- **Isolation Forest**: Unsupervised model detecting UEBA (User Entity Behavior Analytics) anomalies.
- **Logistic Regression**: High-reliability binary classifier for suspicious login probability.
- **Autoencoder**: Neural network-based reconstruction error analysis for sophisticated bot/forgery detection.

### 3.2 Dynamic Policy Enforcement (AI-Driven)
The access decision is calculated via an **Ensemble Score**:
- **Score < 30%**: **ALLOW** (Silent behavioral verification).
- **Score 30-74%**: **MFA STEP-UP** (Forces TOTP or Passkey challenge).
- **Score >= 75%**: **BLOCK** (Critical anomaly; session rejected + SOC alert).
- **Implicit Signal**: Includes device-trust status (mTLS) and "Impossible Travel" vectors.

---

## 4. Session Security

- **JWT Rotation**: Access tokens are short-lived. Refresh tokens are rotated after every use.
- **Session Bindings**: Sessions are cryptographically bound to the client's **IP Address** and **Device Fingerprint**.
- **Hijacking Shield**: If a session migrates to a new IP or UA, it is instantly terminated and flagged as `SESSION_COMPROMISED`.

---

## 5. Deployment Guidelines

To deploy this in production:
1. **Infrastructure**: Use the provided `docker-compose.yml` to orchestrate Keycloak, Nginx, and the Backend.
2. **Certs**: Generate your internal Root CA and perform machine enrollment for all staff devices.
3. **Keycloak**: Import the `realm-export.json` to pre-configure the Nexus security domain.
4. **Monitoring**: Integrate the SOC Audit Logs with your ELK/Splunk stack.
