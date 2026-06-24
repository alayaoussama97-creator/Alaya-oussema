import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const CERTS_DIR = path.join(process.cwd(), 'certs');

if (!fs.existsSync(CERTS_DIR)) {
  fs.mkdirSync(CERTS_DIR);
}

console.log('--- Generating Zero Trust Certificate Authority and Certs ---');

try {
  // 1. Generate CA
  execSync(`openssl genrsa -out ${CERTS_DIR}/ca-key.pem 4096`, { stdio: 'inherit' });
  execSync(`openssl req -new -x509 -days 3650 -key ${CERTS_DIR}/ca-key.pem -out ${CERTS_DIR}/ca-cert.pem -subj "/CN=ZeroTrust-CA"`, { stdio: 'inherit' });

  // 2. Generate Server Cert
  execSync(`openssl genrsa -out ${CERTS_DIR}/server-key.pem 2048`, { stdio: 'inherit' });
  execSync(`openssl req -new -key ${CERTS_DIR}/server-key.pem -out ${CERTS_DIR}/server-csr.pem -subj "/CN=localhost"`, { stdio: 'inherit' });
  execSync(`openssl x509 -req -days 365 -in ${CERTS_DIR}/server-csr.pem -CA ${CERTS_DIR}/ca-cert.pem -CAkey ${CERTS_DIR}/ca-key.pem -CAcreateserial -out ${CERTS_DIR}/server-cert.pem`, { stdio: 'inherit' });

  // 3. Generate Client Cert (The "Machine Certificate")
  execSync(`openssl genrsa -out ${CERTS_DIR}/client-key.pem 2048`, { stdio: 'inherit' });
  execSync(`openssl req -new -key ${CERTS_DIR}/client-key.pem -out ${CERTS_DIR}/client-csr.pem -subj "/CN=Trust-Client"`, { stdio: 'inherit' });
  execSync(`openssl x509 -req -days 365 -in ${CERTS_DIR}/client-csr.pem -CA ${CERTS_DIR}/ca-cert.pem -CAkey ${CERTS_DIR}/ca-key.pem -CAcreateserial -out ${CERTS_DIR}/client-cert.pem`, { stdio: 'inherit' });

  console.log('--- Certificates generated successfully in /certs ---');
} catch (error) {
  console.error('Error generating certs. Ensure openssl is installed.', error);
}
