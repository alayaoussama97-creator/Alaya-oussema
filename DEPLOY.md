# Zero Trust Architecture Deployment Guide

Ce guide explique comment déployer et tester l'architecture Zero Trust générée.

## 1. Pré-requis
- Docker & Docker Compose
- OpenSSL

## 2. Génération des Certificats (mTLS)
Avant de lancer l'infrastructure, générez l'autorité de certification et les certificats identitaires :
```bash
npm run gen-certs
# OU via Node directement
node scripts/generate-certs.js
```
Ceci créera le dossier `/certs` avec :
- `ca-cert.pem` : Le certificat racine de confiance.
- `server-cert.pem` : Certificat pour Nginx (TLS).
- `client-cert.pem` : Certificat pour la machine cliente (mTLS).

## 3. Lancement de l'Infrastructure
```bash
docker-compose up -d --build
```
L'application sera accessible sur `https://localhost` (port 443).
*Note: Dans le preview AI Studio, nous utilisons le port 3000.*

## 4. Configuration Keycloak
1. Accédez à `http://localhost:8080`.
2. Créez un Realm "Security".
3. Ajoutez un client "zero-trust-frontend".
4. Activez le support OIDC et configurez les rôles (ADMIN, AUDITOR).

## 5. Tests de Sécurité (Red Teaming)

### Simulation Brute Force (Hydra)
Testez la protection Fail2Ban intégrée :
```bash
hydra -l admin@security.local -P common_passwords.txt https://localhost/api/auth/login -s 443
```
*Le backend bloquera automatiquement l'IP après 5 tentatives.*

### Audit Réseau (Nmap)
Vérifiez que seuls les ports autorisés sont exposés :
```bash
nmap -p- localhost
```
*Seul le port 443 doit apparaître comme ouvert.*

### Vérification mTLS
Testez l'accès à l'API sans certificat (doit être rejeté par Nginx) :
```bash
curl -k https://localhost/api/vault/secrets
```
Testez avec le certificat client :
```bash
curl -k --cert certs/client-cert.pem --key certs/client-key.pem https://localhost/api/vault/secrets
```

## 6. Architecture de Communication
1. **Client** → HTTPS (mTLS) → **Nginx** (Termination & Identity Check)
2. **Nginx** → HTTP → **Dashboard App** (Express)
3. **Dashboard App** → Private Net → **Vaultwarden / Keycloak**
