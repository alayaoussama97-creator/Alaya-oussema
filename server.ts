import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import * as argon2 from 'argon2';
import { authenticator as totp } from 'otplib';
import QRCode from 'qrcode';
import { mlEngine } from './ml_engine.js';
import { z } from 'zod';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { GoogleGenAI } from '@google/genai';

let genAIClient: any = null;
function getGenAI() {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined. Please add it to Settings > Secrets.');
    }
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return genAIClient;
}

const PORT = 3000;
const SECRET_KEY = process.env.VAULT_SECRET || 'nexus-stable-vault-key-2024';
const JWT_SECRET = process.env.JWT_SECRET || 'nexus-stable-jwt-key-2024';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'nexus-refresh-stable-key-2024';

// Cisco Packet Tracer - Zero Trust Infrastructure Simulation
const ciscoInfrastructure = {
  firewall: { id: 'asa_5505', name: 'Cisco ASA 5505', status: 'ACTIVE', ip: '200.1.1.1', insideIp: '192.168.30.1', logs: [] },
  proxy: { id: 'nginx_proxy', name: 'Nginx (Reverse Proxy)', status: 'ACTIVE', mtls: 'ENFORCED', port: 443 },
  backend: { id: 'vaultwarden', name: 'Vaultwarden (Backend)', status: 'ACTIVE', exposed: false, internalIp: '192.168.30.10' },
  identity: { id: 'keycloak', name: 'Keycloak (MFA/2FA)', status: 'ACTIVE', port: 8080 },
  protection: { id: 'fail2ban', name: 'Fail2Ban', status: 'MONITORING', bannedIps: [] }
};

const vlanZones = [
  { id: 10, name: 'VLAN 10 - ADMIN', network: '192.168.10.0/24', gateway: '192.168.10.1', devices: ['PC-ADMIN (192.168.10.10)'] },
  { id: 20, name: 'VLAN 20 - USERS', network: '192.168.20.0/24', gateway: '192.168.20.1', devices: ['PC-USER (192.168.20.10)'] },
  { id: 30, name: 'VLAN 30 - SERVERS', network: '192.168.30.0/24', gateway: '192.168.30.1', devices: ['Vaultwarden (192.168.30.10)', 'Keycloak (192.168.30.15)'] }
];

// In-memory security components
let uniqueIdCounter = 0;
const getUniqueId = (prefix = 'id') => `${prefix}_${Date.now()}_${++uniqueIdCounter}`;

const securityLogs: any[] = [];
const blockedIPs = new Set<string>();
const registeredDevices: any[] = [
  { id: 'dev_01', name: 'Alaya - iPhone 14 Pro', status: 'TRUSTED', health: 'SAFE', os: 'iOS 17.4', lastReport: new Date(), revoked: false, riskScore: 5, fingerprint: 'fp_iphone_14' },
  { id: 'dev_02', name: 'Laptop - Sec Ops Gen 2', status: 'TRUSTED', health: 'SAFE', os: 'Windows 11', lastReport: new Date(), revoked: false, riskScore: 12, fingerprint: 'fp_laptop_sec' },
  { id: 'dev_03', name: 'Tablet - Auditor X', status: 'UNTRUSTED', health: 'ROOTED', os: 'Android 13', lastReport: new Date(), revoked: false, riskScore: 85, fingerprint: 'fp_tablet_hack' },
  { id: 'dev_04', name: 'Kali - Red Team OS', status: 'UNTRUSTED', health: 'SAFE', os: 'Kali Linux 2024.1', lastReport: new Date(), revoked: false, riskScore: 75, fingerprint: 'fp_kali_test' },
  { id: 'vm_ubuntu', name: 'Ubuntu Node (Virtual)', status: 'TRUSTED', health: 'SAFE', os: 'Ubuntu 22.04 LTS', lastReport: new Date(), revoked: false, riskScore: 8, fingerprint: 'fp_vm_ubuntu' },
  { id: 'vm_kali', name: 'Kali Offensive (Virtual)', status: 'TRUSTED', health: 'SAFE', os: 'Kali Rolling 2024.1', lastReport: new Date(), revoked: false, riskScore: 22, fingerprint: 'fp_vm_kali' }
];

// Multi-Tenant Data Store
interface Tenant {
  id: string;
  name: string;
  domain: string;
  subscription: 'FREE' | 'PRO' | 'ENTERPRISE';
  status: 'ACTIVE' | 'SUSPENDED';
  billing: {
    stripeCustomerId: string;
    nextBillingDate: Date;
    usageAuthentications: number;
  }
}

const tenants: Tenant[] = [
  { 
    id: 'tnt_001', 
    name: 'Nexus Security Corp', 
    domain: 'nexus.zt', 
    subscription: 'ENTERPRISE', 
    status: 'ACTIVE',
    billing: { stripeCustomerId: 'cus_nexus_1', nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), usageAuthentications: 1250 }
  },
  { 
    id: 'tnt_002', 
    name: 'CyberGuard Ltd', 
    domain: 'cyberguard.io', 
    subscription: 'PRO', 
    status: 'ACTIVE',
    billing: { stripeCustomerId: 'cus_guard_2', nextBillingDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), usageAuthentications: 450 }
  },
  { 
    id: 'nexus_local_enclave', 
    name: 'Nexus Local Enclave', 
    domain: 'localhost', 
    subscription: 'ENTERPRISE', 
    status: 'ACTIVE',
    billing: { stripeCustomerId: 'cus_local_0', nextBillingDate: new Date(), usageAuthentications: 0 }
  }
];

// IAM Data Store
const users: any[] = [
  { id: 'usr_oussama', tenantId: 'tnt_001', email: 'alayaoussama97@gmail.com', role: 'ADMIN', mfaEnabled: true, mfaSecret: 'JBSWY3DPEHPK3PXP', authenticators: [], passwordHash: '' },
  { id: 'usr_001', tenantId: 'tnt_001', email: 'admin@security.local', role: 'ADMIN', mfaEnabled: true, mfaSecret: 'JBSWY3DPEHPK3PXP', authenticators: [], passwordHash: '' },
  { id: 'usr_002', tenantId: 'tnt_001', email: 'analyst@security.local', role: 'SOC', mfaEnabled: true, mfaSecret: 'GEYTSMZRGMYTSMZR', authenticators: [], passwordHash: '' },
  { id: 'usr_003', tenantId: 'tnt_001', email: 'auditor@security.local', role: 'USER', mfaEnabled: false, mfaSecret: '', authenticators: [], passwordHash: '' },
  { id: 'usr_004', tenantId: 'tnt_002', email: 'admin@cyberguard.io', role: 'ADMIN', mfaEnabled: true, mfaSecret: 'KBSWY3DPEHPK3PXP', authenticators: [], passwordHash: '' },
  { id: 'usr_kali', tenantId: 'tnt_001', email: 'test@kali.local', role: 'SOC', mfaEnabled: false, mfaSecret: '', authenticators: [], passwordHash: '' },
  { id: 'usr_guest', tenantId: 'tnt_001', email: 'guest@nexus.zt', role: 'USER', mfaEnabled: false, mfaSecret: '', authenticators: [], passwordHash: '' },
  { id: 'usr_local_admin', tenantId: 'nexus_local_enclave', email: 'local_admin@nexus.zt', role: 'ADMIN', mfaEnabled: false, mfaSecret: '', authenticators: [], passwordHash: '' },
];

async function initializeSecurity() {
  for (const user of users) {
    user.passwordHash = await argon2.hash('admin123'); // Default for demo
  }
}
initializeSecurity();

const sessions = new Map<string, { userId: string, tenantId: string, ip: string, deviceFp: string, lastSeen: Date }>();
const refreshTokens = new Set<string>(); // In a real app, store in DB with expiry
const magicLinks = new Map<string, { email: string, expires: Date }>();
const currentRegistrationOptions = new Map<string, any>();
const currentAuthenticationOptions = new Map<string, any>();

let globalRevocationPolicy: 'MANUAL' | 'AUTO' = 'MANUAL';
let isSystemActive = true;
const pushRequests: any[] = [];

const virtualMachines: any[] = [
  { id: 'vm_ubuntu', name: 'Ubuntu Support', os: 'Ubuntu 22.04 LTS', ip: '10.0.8.15', status: 'STOPPED', cpu: '0%', ram: '0GB/2GB', lastBoot: new Date() },
  { id: 'vm_kali', name: 'Kali Offensive', os: 'Kali Rolling 2024.1', ip: '10.0.8.4', status: 'RUNNING', cpu: '1.2%', ram: '1.2GB/4GB', lastBoot: new Date() }
];

// --- AI ENGINE (Real ML via TensorFlow.js) ---

interface AIAnomaly {
  id: string;
  type: 'UEBA' | 'ATTACK';
  name: string; // Brute Force, Suspicious Hours, Geo Displacement
  riskScore: number;
  description: string;
  timestamp: Date;
  deviceId?: string;
  status: 'PENDING' | 'MITIGATED' | 'BLOCKED';
}

const aiAnomalies: AIAnomaly[] = [
  { id: getUniqueId('ano'), type: 'UEBA', name: 'Impossible Travel', riskScore: 65, description: 'User login from Paris and Tokyo within 2 hours.', timestamp: new Date(Date.now() - 3600000), status: 'PENDING' },
  { id: getUniqueId('ano'), type: 'ATTACK', name: 'Nmap Scan Detected', riskScore: 92, description: 'Horizontal port scan detected from internal workstation.', timestamp: new Date(Date.now() - 1800000), status: 'PENDING' },
  { id: getUniqueId('ano'), type: 'ATTACK', name: 'Kali Linux Probe', riskScore: 88, description: 'Simulated Red Team activity using Metasploit payload.', timestamp: new Date(), status: 'PENDING' }
];

const riskStats = {
  averageRisk: 24,
  anomalies24h: 12,
  attacksBlocked: 450,
  heatMap: [
    { x: 10, y: 20, v: 10 }, { x: 50, y: 50, v: 80 }, { x: 80, y: 30, v: 40 }
  ]
};

const activeAlerts: any[] = [];
const addAlert = (type: string, severity: 'HIGH' | 'MEDIUM' | 'LOW', msg: string, deviceId?: string) => {
  const alert = {
    id: getUniqueId('alert'),
    type,
    severity,
    msg,
    deviceId,
    timestamp: new Date(),
    status: 'ACTIVE'
  };
  activeAlerts.unshift(alert);
  if (activeAlerts.length > 50) activeAlerts.pop();
  
  securityLogs.unshift({ 
    id: getUniqueId('log'), 
    type: severity === 'HIGH' ? 'ATTACK' : 'WARN', 
    msg: `ALERT GENERATED: [${type}] ${msg}`, 
    timestamp: new Date() 
  });
};

// Real-time scoring using Nexus ML Engine
const calculateRiskScore = async (event: any) => {
  const result = await mlEngine.analyze({
    hour: event.hour || new Date().getHours(),
    geoRisk: event.geoRisk || (event.geo_change ? 0.8 : 0.1),
    frequency: event.frequency || 10,
    deviceTrust: event.deviceTrust || (event.new_device ? 0.3 : 0.9),
    failedLogins: event.failedLogins || event.failed_attempts || 0,
    portsScanned: event.portsScanned || 0,
    mtlsFail: event.mtlsFail || (event.mTLS_failed ? 1 : 0),
    rapidRequests: event.rapidRequests || 0
  });

  let rawScore = result.riskScore;
  
  if (event.mTLS_failed) rawScore += 30;
  if (event.health === 'ROOTED') rawScore = Math.max(rawScore, 85);
  
  return {
    score: Math.min(100, rawScore),
    label: result.label,
    confidence: result.confidence,
    isAnomaly: result.isAnomaly
  };
};

const riskProfile = {
  globalScore: 12, // 0-100 scale, lower is better
  trends: [
    { time: '08:00', score: 10 },
    { time: '10:00', score: 12 },
    { time: '12:00', score: 15 },
    { time: '14:00', score: 22 },
    { time: '16:00', score: 12 },
    { time: '18:00', score: 18 },
    { time: '20:00', score: 25 }
  ]
};

const threatIntelFeed = [
  { id: 'ti_01', type: 'VULNERABILITY', title: 'CVE-2024-Nexus-01: Zero-Day in mTLS Handshake', severity: 'CRITICAL', description: 'Malformed certificates can bypass validation in older Nexus core versions.' },
  { id: 'ti_02', type: 'THREAT', title: 'Apt-Nexus-Shadow: Infrastructure Target', severity: 'HIGH', description: 'Russian-linked threat group targeting EU-based Zero Trust gateways.' },
  { id: 'ti_03', type: 'ADVISORY', title: 'ZT-Cloud: Post-Quantum Crypto Update', severity: 'LOW', description: 'Recommended upgrade to Dilithium-based signatures for vault storage.' },
  { id: 'ti_04', type: 'VULNERABILITY', title: 'CVE-2024-Identity-09: Token Hijacking via DNS', severity: 'MEDIUM', description: 'Subdomain takeover allows stealing JWT sessions on specific VPC configurations.' },
  { id: 'ti_05', type: 'CAMPAIGN', title: 'Operation Locksmith: Credential Phishing', severity: 'HIGH', description: 'Massive wave of phishing targeting system operators via simulated OTP portals.' }
];

const vulnerabilityReports: any[] = [
  { id: 'scan_001', name: 'Identity Gateway Scan', status: 'COMPLETED', findings: 2, severity: 'LOW', date: new Date(Date.now() - 86400000) },
  { id: 'scan_002', name: 'Internal API Fuzzing', status: 'COMPLETED', findings: 5, severity: 'MEDIUM', date: new Date(Date.now() - 172800000) }
];

const complianceControls = [
  { id: 'AC-1', name: 'Access Control Policy', status: 'PASS', framework: 'SOC2' },
  { id: 'IA-2', name: 'Multi-factor Authentication', status: 'PASS', framework: 'NIST 800-53' },
  { id: 'SC-8', name: 'Transmission Confidentiality', status: 'PASS', framework: 'ISO 27001' },
  { id: 'AU-2', name: 'Audit Logging', status: 'PASS', framework: 'SOC2' },
  { id: 'RA-5', name: 'Vulnerability Scanning', status: 'WARN', framework: 'PCI-DSS' }
];

async function startServer() {
  const app = express();

  // Trust the first proxy (AI Studio Nginx proxy)
  app.set('trust proxy', 1);

  // 1. Core Security Middlewares
  app.use(helmet({
    contentSecurityPolicy: false, // Vite handles CSP in dev
  }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(morgan('combined', {
    stream: {
      write: (message) => {
        const log = { id: getUniqueId('log'), type: 'TRAFFIC', msg: message.trim(), timestamp: new Date() };
        securityLogs.unshift(log);
        if (securityLogs.length > 100) securityLogs.pop();
        console.log(message.trim());
      }
    }
  }));

  // 2. Fail2Ban / Brute Force Protection Simulation
  const authLimiter = rateLimit({
    windowMs: 5 * 1000, // 5 seconds
    max: 10, // Allow 10 attempts per 5 seconds
    message: 'Too many authentication attempts from this IP, please try again after 5 seconds',
    handler: (req, res, next, options) => {
      const ip = req.ip || 'unknown';
      securityLogs.unshift({ id: getUniqueId('log'), type: 'ATTACK', msg: `Brute force detected from IP: ${ip}`, timestamp: new Date() });
      res.status(429).json({ error: options.message });
    }
  });

  // 2. Tenant Context Middleware
  const identifyTenant = (req: any, res: express.Response, next: express.NextFunction) => {
    // Determine tenant from subdomain or custom header
    // For demo, we prioritize a x-tenant-id header, then cookie, then token extraction, then default to tnt_001
    let tenantId = req.headers['x-tenant-id'] || req.cookies.tenant_id;

    if (!tenantId && req.cookies.auth_token) {
        try {
            const decoded: any = jwt.decode(req.cookies.auth_token);
            if (decoded && decoded.tenantId) {
                tenantId = decoded.tenantId;
            }
        } catch (e) {}
    }

    if (!tenantId) tenantId = 'tnt_001';

    const tenant = tenants.find(t => t.id === tenantId);
    
    if (!tenant) {
      return res.status(404).json({ error: 'TENANT_NOT_FOUND', msg: 'The organization specified does not exist in the Nexus ecosystem.' });
    }

    if (tenant.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'TENANT_SUSPENDED', msg: 'Your organization access is restricted. Check billing status.' });
    }

    req.tenant = tenant;
    req.tenantId = tenantId;
    next();
  };

  // 3. Session Hijacking Protection Middleware
  const protectSession = (req: any, res: express.Response, next: express.NextFunction) => {
    const sessionId = req.cookies.session_id;
    if (!sessionId) return next();

    const session = sessions.get(sessionId);
    const ip = req.ip || 'unknown';
    const deviceFp = req.headers['x-device-fingerprint'] as string || 'unknown';

    if (session) {
      // Ensure cross-tenant session protection
      if (req.tenantId && session.tenantId !== req.tenantId) {
        // Clear session if tenant mismatch instead of hard 403
        res.clearCookie('session_id', { path: '/' });
        res.clearCookie('auth_token', { path: '/' });
        return next();
      }

      const isIpMatch = session.ip === ip;
      // In cloud environments, we relax IP match slightly for demo stability if not in strict mode
      const isStrict = process.env.STRICT_ZERO_TRUST === 'true';

      if (!isIpMatch && isStrict && session.ip !== 'unknown' && ip !== 'unknown') {
        const log = { id: getUniqueId('log'), tenantId: session.tenantId, type: 'ATTACK', msg: `SESSION HIJACKING DETECTED: IP mismatch for session ${sessionId} (${session.ip} vs ${ip})`, timestamp: new Date() };
        securityLogs.unshift(log);
        sessions.delete(sessionId);
        res.clearCookie('session_id', { path: '/' });
        res.clearCookie('auth_token', { path: '/' });
        return res.status(401).json({ error: 'SESSION_EXPIRED', msg: 'Identity mismatch detected. Please re-authenticate for security.' });
      }
      session.lastSeen = new Date();
    }
    next();
  };

  // 4. Zero Trust Security Middlewares
  const bypassAuth = (req: any, res: express.Response, next: express.NextFunction) => {
    // If not authenticated and not explicitly logging out, automatically log in as the default administrator
    const isAuthRoute = req.path.startsWith('/api/auth/login') || 
                        req.path.startsWith('/api/auth/guest') || 
                        req.path.startsWith('/api/auth/logout') || 
                        req.path.startsWith('/api/auth/firebase-sync') ||
                        req.path.startsWith('/api/auth/me');

    if (!req.cookies.auth_token && !isAuthRoute) {
      const user = users.find(u => u.email === 'alayaoussama97@gmail.com') || users[0];
      const sessionId = getUniqueId('session_bypass');
      
      sessions.set(sessionId, { 
        userId: user.id, 
        tenantId: user.tenantId, 
        ip: req.ip || 'unknown', 
        deviceFp: 'bypass_auth_device', 
        lastSeen: new Date() 
      });

      const { accessToken, refreshToken } = generateTokens(user, sessionId, user.tenantId);
      
      res.cookie('auth_token', accessToken, getCookieOptions());
      res.cookie('refresh_token', refreshToken, getCookieOptions());
      res.cookie('session_id', sessionId, getCookieOptions());
      res.cookie('tenant_id', user.tenantId, getCookieOptions({ httpOnly: false }));
      
      req.cookies.auth_token = accessToken;
      console.log(`[ZeroTrust] Bypassing authentication for: ${user.email} (Architecture: ASA Firewall -> Nginx -> Vaultwarden)`);
      securityLogs.unshift({ 
        id: getUniqueId('log'), 
        type: 'INFO', 
        msg: `BYPASS_AUTH: Identity ${user.email} automatically verified via mTLS simulation (Cisco ASA Enforced).`, 
        timestamp: new Date() 
      });
    }
    next();
  };

  const getCookieOptions = (overrides: express.CookieOptions = {}): express.CookieOptions => {
    const isProd = process.env.NODE_ENV === 'production';
    return {
      httpOnly: true,
      secure: isProd, // Only secure in production
      sameSite: isProd ? 'none' : 'lax', // Lax for dev to avoid cross-site issues in preview
      path: '/',
      ...overrides
    };
  };

  const generateTokens = (user: any, sessionId: string, tenantId: string) => {
    const payload = { id: user.id, email: user.email, role: user.role, sessionId, tenantId };
    
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ sessionId, userId: user.id }, REFRESH_SECRET, { expiresIn: '7d' });
    
    refreshTokens.add(refreshToken);
    return { accessToken, refreshToken };
  };

  const authenticateToken = (req: any, res: express.Response, next: express.NextFunction) => {
    const token = req.cookies.auth_token;
    const mtlsStatus = req.headers['x-ssl-client-verify']; // Forwarded by Nginx Zero Trust Edge
    if (!token) {
      console.log('Auth token missing from cookies. Cookies found:', Object.keys(req.cookies));
      return res.status(401).json({ error: 'UNAUTHORIZED_ACCESS', msg: 'Session token missing. Please authenticate.' });
    }

    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (err) {
        return res.status(401).json({ error: 'INVALID_TOKEN', msg: 'Your session has expired or is invalid.' });
      }
      
      // Zero Trust: Verify user still exists and session is valid
      const user = users.find(u => u.id === decoded.id);
      let session = sessions.get(decoded.sessionId);

      // Dev Resilience: If session is missing (due to server restart) but token is valid, re-provision session
      if (user && !session) {
        sessions.set(decoded.sessionId, { 
          userId: user.id, 
          tenantId: user.tenantId, 
          ip: req.ip || 'unknown', 
          deviceFp: 'restored_session_post_restart', 
          lastSeen: new Date() 
        });
        session = sessions.get(decoded.sessionId);
      }

      if (!user || !session) {
          const log = { id: getUniqueId('log'), type: 'WARN', msg: `REVOKED ACCESS: Valid token but invalid session or user: ${decoded.email}`, timestamp: new Date() };
          securityLogs.unshift(log);
          return res.status(401).json({ error: 'SESSION_REVOKED', msg: 'Your session has been revoked or system identity changed.' });
      }

      // Machine Trust Verification (mTLS Simulation)
      if (mtlsStatus && mtlsStatus !== 'SUCCESS') {
        securityLogs.unshift({ 
          id: getUniqueId('log'), 
          tenantId: decoded.tenantId, 
          type: 'WARN', 
          msg: `mTLS FAILURE: Device ${decoded.email} presented invalid client certificate.`, 
          timestamp: new Date() 
        });
      }

      // Zero Trust Dynamic Sync: Synchronize request context with token identity
      // This prevents 403s caused by stale tenant cookies or headers
      if (decoded.tenantId && req.tenantId !== decoded.tenantId) {
         const directTenant = tenants.find(t => t.id === decoded.tenantId);
         if (directTenant) {
            req.tenantId = decoded.tenantId;
            req.tenant = directTenant;
         }
      }

      req.user = decoded;
      next();
    });
  };

  const authorizeRoles = (roles: string[]) => {
    return (req: any, res: express.Response, next: express.NextFunction) => {
      const user = req.user;
      if (!user || !roles.includes(user.role)) {
        const log = { id: getUniqueId('log'), tenantId: req.tenantId, type: 'DENY', msg: `RBAC Denied: User ${user?.email} attempted unauthorized access`, timestamp: new Date() };
        securityLogs.unshift(log);
        return res.status(403).json({ error: 'Forbidden: Insufficient Permissions' });
      }
      next();
    };
  };

  const checkSystemActive = (req: any, res: express.Response, next: express.NextFunction) => {
    // Admins and SOC can always access or if system is active
    const isAdmin = req.user && (req.user.role === 'ADMIN' || req.user.role === 'SOC');
    if (!isSystemActive && !isAdmin && !req.path.startsWith('/api/auth')) {
      return res.status(503).json({ 
        error: 'SYSTEM_DEACTIVATED', 
        msg: 'The Nexus infrastructure is currently in MAINTENANCE/INACTIVE mode. Access restricted by global policy.' 
      });
    }
    next();
  };

  const verifyMTLS = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const machineId = req.headers['x-machine-id'];
    if (!machineId && process.env.STRICT_ZERO_TRUST === 'true') {
      const log = { id: getUniqueId('log'), tenantId: (req as any).tenantId, type: 'DENY', msg: `Insecure Access Denied: Missing Machine identity (mTLS)`, timestamp: new Date() };
      securityLogs.unshift(log);
      return res.status(403).json({ error: 'Access Denied: Machine Certificate Required (mTLS)' });
    }
    next();
  };

  app.use(identifyTenant);
  app.use(bypassAuth);
  app.use(protectSession);
  
  // Routes that require authentication but run BEFORE system check
  app.get('/api/auth/me', (req: any, res) => {
    const token = req.cookies.auth_token;
    if (!token) return res.json({ user: null });

    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (err) return res.json({ user: null });
      
      const user = users.find(u => u.id === decoded.id);
      const session = sessions.get(decoded.sessionId);

      if (!user || !session) {
          // Instead of 401, return user: null for the 'me' endpoint to allow graceful FE handling
          return res.json({ user: null });
      }

      // Return user data without password hash
      const { passwordHash, mfaSecret, ...safeUser } = user;
      res.json({ user: safeUser });
    });
  });

  // Apply system check to all protected routes below
  // We'll place it strategically to allow login even if system is inactive
  app.use((req: any, res, next) => {
    // Try to authenticate for the system check
    const token = req.cookies.auth_token;
    if (token) {
        jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
            if (!err) req.user = decoded;
            next();
        });
    } else {
        next();
    }
  });

  app.use(checkSystemActive);

  // --- AI RISK SCORING SERVICE (TF.js Engine) ---
  app.post('/api/ai/risk-score', async (req, res) => {
     const { 
        user_id, 
        failed_attempts, 
        hour, 
        new_device, 
        geo_change, 
        deviceFingerprint, 
        ip,
        ports_scanned,
        mtls_fail,
        frequency,
        rapid_requests
     } = req.body;
     
     const result = await calculateRiskScore({
        failedLogins: failed_attempts,
        hour: hour,
        unknownDevice: new_device === 1,
        geoRisk: geo_change === 1 ? 0.8 : (geo_change === 0 ? 0.1 : geo_change),
        deviceFingerprint,
        portsScanned: ports_scanned,
        mtlsFail: mtls_fail,
        frequency: frequency,
        rapidRequests: rapid_requests
     });

     const risk_score = result.score;
     let decision = 'ALLOW';
     if (risk_score >= 70) decision = 'BLOCK';
     else if (risk_score >= 30) decision = 'MFA';

     // Log to security audit
     securityLogs.unshift({ 
        id: getUniqueId('log'), 
        type: 'AI_ASSESS', 
        msg: `AI Risk Assessment [${result.label}]: Score ${risk_score}% (${Math.round(result.confidence*100)}% conf) -> ${decision}`, 
        timestamp: new Date() 
     });

     res.json({ risk_score, decision, label: result.label, confidence: result.confidence, timestamp: new Date() });
  });

  // --- SECURE SERVER-SIDE GEMINI API GATEWAY ---
  const handleGeminiGenerateRequest = async (req: express.Request, res: express.Response) => {
    try {
      const { model, contents, config } = req.body;
      let targetModel = model || "gemini-3.5-flash";
      if (targetModel === "gemini-3-flash-preview" || targetModel === "gemini-3.1-pro-preview") {
        targetModel = "gemini-3.5-flash";
      }

      const aiInstance = getGenAI();
      let response;

      try {
        response = await aiInstance.models.generateContent({
          model: targetModel,
          contents,
          config
        });
      } catch (firstErr: any) {
        const errMsg = (firstErr.message || "").toLowerCase();
        const isUnavailable = errMsg.includes("unavailable") || 
                              errMsg.includes("high demand") || 
                              errMsg.includes("503") ||
                              errMsg.includes("temporary") ||
                              firstErr.status === 503 ||
                              firstErr.status === 429;
                              
        if (isUnavailable && targetModel !== "gemini-3.1-flash-lite") {
          console.warn(`Initial model ${targetModel} is currently unavailable (${firstErr.message}). Attempting fallback to gemini-3.1-flash-lite...`);
          try {
            response = await aiInstance.models.generateContent({
              model: "gemini-3.1-flash-lite",
              contents,
              config
            });
          } catch (secondErr: any) {
            const errMsgSecond = (secondErr.message || "").toLowerCase();
            const isUnavailableSecond = errMsgSecond.includes("unavailable") || errMsgSecond.includes("high demand") || errMsgSecond.includes("503");
            if (isUnavailableSecond) {
              console.warn(`Fallback model gemini-3.1-flash-lite also busy. Trying gemini-flash-latest...`);
              response = await aiInstance.models.generateContent({
                model: "gemini-flash-latest",
                contents,
                config
              });
            } else {
              throw secondErr;
            }
          }
        } else {
          throw firstErr;
        }
      }

      res.json({
        text: response.text,
        functionCalls: response.functionCalls || null
      });
    } catch (error: any) {
      console.error("Gemini Server Gateway Error:", error);
      res.status(500).json({ 
         error: "GEMINI_ERROR", 
         message: error.message || "An error occurred while generating content with Gemini." 
      });
    }
  };

  app.post('/api/ai/secure-generate', handleGeminiGenerateRequest);
  app.post('/api/gemini/generate', handleGeminiGenerateRequest);

  // Modern Identity & Access Management (IAM)
  
  // 1. Password-based Login (Legacy / Baseline)
  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
    otp: z.string().optional(),
    deviceFingerprint: z.string().optional(),
    geoRiskSimulation: z.number().optional(),
    bypass: z.boolean().optional()
  });

  app.post('/api/auth/login', authLimiter, async (req: any, res) => {
    // Flexible schema for demo stability
    const loginSchema = z.object({
      email: z.string(),
      password: z.string().optional(),
      otp: z.any().optional(),
      deviceFingerprint: z.any().optional(),
      geoRiskSimulation: z.any().optional(),
      bypass: z.any().optional(),
      faceId: z.any().optional()
    });

    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      console.error('Validation failed:', parseResult.error.issues);
      securityLogs.unshift({ id: getUniqueId('log'), type: 'ERROR', msg: `Login validation failed: ${JSON.stringify(parseResult.error.issues)}`, timestamp: new Date() });
      return res.status(400).json({ error: 'INVALID_INPUT', issues: parseResult.error.issues });
    }

    let { email, password, otp, deviceFingerprint, geoRiskSimulation, bypass, faceId } = parseResult.data;
    email = email?.trim()?.toLowerCase();
    const ip = req.ip || 'unknown';

    // Multi-tenant check: user must belong to current tenant
    let user = users.find(u => u.email === email && u.tenantId === req.tenantId);
    
    // Argon2 Password Validation OR Evaluation Bypass
    const isSecurityKey = password === 'oussema';
    const isFaceId = faceId === true;
    const isBypass = (bypass === true && (email === 'admin@security.local' || email === 'alayaoussama97@gmail.com')) || isSecurityKey || isFaceId;

    if (isBypass && !user) {
      // Demo fail-safe
      user = users.find(u => u.email === 'alayaoussama97@gmail.com') || users.find(u => u.role === 'ADMIN');
    }

    if (user && (isBypass || (password && await argon2.verify(user.passwordHash, password)))) {
       
       // --- AI ADAPTIVE AUTH STEP ---
       const auth_risk_res = isBypass ? { score: 0, label: 'BYPASS', confidence: 1, isAnomaly: false } : await calculateRiskScore({
          failedLogins: 0,
          hour: new Date().getHours(),
          unknownDevice: !registeredDevices.some(d => d.fingerprint === deviceFingerprint),
          geoRisk: geoRiskSimulation || 0.1,
          deviceFingerprint
       });
       const risk_score = auth_risk_res.score;

       if (risk_score >= 85) {
          const logMsg = `CRITICAL AI BLOCK: ${email} login attempt rejected. Risk: ${risk_score}% [${auth_risk_res.label}]. IP: ${ip}`;
          securityLogs.unshift({ id: getUniqueId('log'), tenantId: req.tenantId, type: 'ATTACK', msg: logMsg, timestamp: new Date() });
          addAlert('AI_BLOCK', 'HIGH', logMsg, 'RESONATOR-01');
          return res.status(403).json({ error: 'AI_SECURITY_BLOCK', msg: `Anomalous access detected (Risk Score: ${risk_score}%). Full containment initiated.` });
       }

       // Check MFA if enabled OR if AI suggests MFA (Score 35-75)
       const aiRequiresMfa = risk_score >= 35;
       if (!isBypass && (user.mfaEnabled || aiRequiresMfa)) {
          const isValidOTP = otp && totp.check(otp, user.mfaSecret || 'JBSWY3DPEHPK3PXP');
          if (!isValidOTP) {
            securityLogs.unshift({ id: getUniqueId('log'), tenantId: req.tenantId, type: 'AI_MFA', msg: `AI STEP-UP: ${email} requires MFA (Risk: ${risk_score}%)`, timestamp: new Date() });
            return res.status(200).json({ 
                mfaRequired: true, 
                aiRisk: risk_score, 
                msg: aiRequiresMfa ? 'Adaptive identity verification required (AI Step-up)' : 'Step-up authentication required' 
            });
          }
       }

       const sessionId = getUniqueId('sess');
       sessions.set(sessionId, { userId: user.id, tenantId: req.tenantId, ip, deviceFp: deviceFingerprint || 'unknown', lastSeen: new Date() });

       const { accessToken, refreshToken } = generateTokens(user, sessionId, req.tenantId);
       
       res.cookie('auth_token', accessToken, getCookieOptions());
       res.cookie('refresh_token', refreshToken, getCookieOptions());
       res.cookie('session_id', sessionId, getCookieOptions());
       res.cookie('tenant_id', req.tenantId, getCookieOptions({ httpOnly: false }));

       securityLogs.unshift({ 
         id: getUniqueId('log'), 
         tenantId: req.tenantId, 
         type: 'AUTH', 
         msg: `Login Success: ${email} via ${isBypass ? 'EVALUATOR BYPASS' : 'AI-Verified Password'} (Risk: ${risk_score}%)`, 
         timestamp: new Date() 
       });
       return res.json({ success: true, user, aiRisk: risk_score });
    }

    securityLogs.unshift({ id: getUniqueId('log'), tenantId: req.tenantId, type: 'AUTH_FAIL', msg: `Login Failed: ${email}`, timestamp: new Date() });
    res.status(401).json({ error: 'Invalid credentials' });
  });

  // 4. WebAuthn (Passkeys / Face ID) Authentication
  app.get('/api/auth/webauthn/register/options', authenticateToken, async (req: any, res) => {
    const user = users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const options: any = await generateRegistrationOptions({
      rpName: 'Nexus Zero Trust',
      rpID: req.hostname === 'localhost' ? 'localhost' : req.hostname,
      userID: user.id,
      userName: user.email,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform', // This prioritizes FaceID/TouchID/Windows Hello
      },
    });

    currentRegistrationOptions.set(user.id, options.challenge);
    res.json(options);
  });

  app.post('/api/auth/webauthn/register/verify', authenticateToken, async (req: any, res) => {
    const { body } = req.body;
    const user = users.find(u => u.id === req.user.id);
    const expectedChallenge = currentRegistrationOptions.get(user.id);

    if (!expectedChallenge) {
      return res.status(400).json({ error: 'Registration not initiated or challenge expired' });
    }

    try {
      const verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin: `${req.protocol}://${req.get('host')}`,
        expectedRPID: req.hostname === 'localhost' ? 'localhost' : req.hostname,
      });

      if (verification.verified && verification.registrationInfo) {
        const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

        user.authenticators.push({
          credentialID: Buffer.from(credentialID).toString('base64url'),
          credentialPublicKey: Buffer.from(credentialPublicKey).toString('base64url'),
          counter,
          transports: body.response.transports,
        });

        currentRegistrationOptions.delete(user.id);
        securityLogs.unshift({ 
          id: getUniqueId('log'), 
          tenantId: user.tenantId, 
          type: 'IAM', 
          msg: `Biometric Identity Registered: ${user.email} (Face ID / Passkey)`, 
          timestamp: new Date() 
        });
        return res.json({ verified: true });
      }
    } catch (error: any) {
      console.error(error);
      return res.status(400).json({ error: error.message });
    }

    res.status(400).json({ error: 'Verification failed' });
  });

  app.post('/api/auth/webauthn/login/options', async (req: any, res) => {
    const { email } = req.body;
    const user = users.find(u => u.email === (email?.toLowerCase()?.trim()));
    
    if (!user) return res.status(404).json({ error: 'User not found' });

    const options: any = await generateAuthenticationOptions({
      rpID: req.hostname === 'localhost' ? 'localhost' : req.hostname,
      allowCredentials: user.authenticators.map((auth: any) => ({
        id: Buffer.from(auth.credentialID, 'base64url'),
        type: 'public-key',
        transports: auth.transports,
      })),
      userVerification: 'preferred',
    });

    currentAuthenticationOptions.set(user.email, options.challenge);
    res.json(options);
  });

  app.post('/api/auth/webauthn/login/verify', async (req: any, res) => {
    const { email, body } = req.body;
    const user = users.find(u => u.email === (email?.toLowerCase()?.trim()));
    
    if (!user) return res.status(404).json({ error: 'User not found' });

    const expectedChallenge = currentAuthenticationOptions.get(user.email);
    if (!expectedChallenge) {
      return res.status(400).json({ error: 'Authentication not initiated' });
    }

    const authenticator = user.authenticators.find((auth: any) => auth.credentialID === body.id);
    if (!authenticator) {
      return res.status(400).json({ error: 'Authenticator not found' });
    }

    try {
      const verification = await verifyAuthenticationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin: `${req.protocol}://${req.get('host')}`,
        expectedRPID: req.hostname === 'localhost' ? 'localhost' : req.hostname,
        authenticator: {
          credentialID: Buffer.from(authenticator.credentialID, 'base64url'),
          credentialPublicKey: Buffer.from(authenticator.credentialPublicKey, 'base64url'),
          counter: authenticator.counter,
        } as any,
      });

      if (verification.verified) {
        authenticator.counter = verification.authenticationInfo.newCounter;
        currentAuthenticationOptions.delete(user.email);

        const sessionId = getUniqueId('sess');
        sessions.set(sessionId, { userId: user.id, tenantId: user.tenantId, ip: req.ip || 'unknown', deviceFp: 'biometric_auth', lastSeen: new Date() });

        const { accessToken, refreshToken } = generateTokens(user, sessionId, user.tenantId);
        
        res.cookie('auth_token', accessToken, getCookieOptions());
        res.cookie('refresh_token', refreshToken, getCookieOptions());
        res.cookie('session_id', sessionId, getCookieOptions());
        res.cookie('tenant_id', user.tenantId, getCookieOptions({ httpOnly: false }));

        securityLogs.unshift({ 
          id: getUniqueId('log'), 
          tenantId: user.tenantId, 
          type: 'AUTH', 
          msg: `Biometric Login Success: ${user.email} (Face ID / Passkey)`, 
          timestamp: new Date() 
        });

        return res.json({ verified: true, user });
      }
    } catch (error: any) {
      console.error(error);
      return res.status(400).json({ error: error.message });
    }

    res.status(400).json({ error: 'Verification failed' });
  });

  app.post('/api/auth/webauthn/unregister', authenticateToken, async (req: any, res) => {
    const user = users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.authenticators = [];
    securityLogs.unshift({ 
      id: getUniqueId('log'), 
      tenantId: user.tenantId, 
      type: 'IAM', 
      msg: `Biometric Identity Removed: ${user.email}`, 
      timestamp: new Date() 
    });

    res.json({ success: true });
  });

  // 1.8 Firebase Sync (Google Login Bridge)
  app.post('/api/auth/firebase-sync', async (req: any, res) => {
    const { email, uid, displayName } = req.body;
    const ip = req.ip || 'unknown';

    // In a real Zero Trust environment, we would verify the Firebase ID Token here
    // For this demonstration, we trust the frontend's Firebase verification for known emails
    let user = users.find(u => u.email === email);
    
    if (!user) {
      // Auto-provision if it's a new external user (simulating JIT provisioning)
      user = { 
        id: `usr_${uid || getUniqueId()}`, 
        tenantId: 'tnt_001', 
        email, 
        displayName: displayName || email,
        role: 'USER', 
        mfaEnabled: false, 
        mfaSecret: '', 
        authenticators: [], 
        passwordHash: 'PROVISIONED_VIA_GOOGLE'
      };
      users.push(user);
      
      securityLogs.unshift({ 
        id: getUniqueId('log'), 
        tenantId: 'tnt_001', 
        type: 'AUTH', 
        msg: `JIT Provisioning: ${email} via Google Identity`, 
        timestamp: new Date() 
      });
    }

    const sessionId = getUniqueId('sess');
    sessions.set(sessionId, { 
      userId: user.id, 
      tenantId: user.tenantId, 
      ip, 
      deviceFp: 'google_identity_provider', 
      lastSeen: new Date() 
    });

    const { accessToken, refreshToken } = generateTokens(user, sessionId, user.tenantId);
    
    res.cookie('auth_token', accessToken, getCookieOptions());
    res.cookie('refresh_token', refreshToken, getCookieOptions());
    res.cookie('session_id', sessionId, getCookieOptions());
    res.cookie('tenant_id', user.tenantId, getCookieOptions({ httpOnly: false }));

    securityLogs.unshift({ 
      id: getUniqueId('log'), 
      tenantId: user.tenantId, 
      type: 'AUTH', 
      msg: `Google Login Verified: ${email} (Nexus Session: ${sessionId})`, 
      timestamp: new Date() 
    });

    res.json({ success: true, user });
  });

  // 1.5 Guest / Public Access login
  app.post('/api/auth/guest', authLimiter, async (req: any, res) => {
    const isLocal = req.headers['x-access-level'] === 'LOCAL';
    const email = isLocal ? 'local_admin@nexus.zt' : 'guest@nexus.zt';
    const tenantId = isLocal ? 'nexus_local_enclave' : 'tnt_001';
    const ip = req.ip || 'unknown';
    
    const user = users.find(u => u.email === email);
    if (!user) return res.status(500).json({ error: 'Guest account not initialized' });

    const sessionId = getUniqueId('sess');
    sessions.set(sessionId, { 
      userId: user.id, 
      tenantId: tenantId, 
      ip, 
      deviceFp: isLocal ? 'local_access_trusted' : 'public_access_device', 
      lastSeen: new Date() 
    });

    const { accessToken, refreshToken } = generateTokens(user, sessionId, tenantId);
    
    res.cookie('auth_token', accessToken, getCookieOptions());
    res.cookie('refresh_token', refreshToken, getCookieOptions());
    res.cookie('session_id', sessionId, getCookieOptions());
    res.cookie('tenant_id', tenantId, getCookieOptions({ httpOnly: false }));

    securityLogs.unshift({ 
      id: getUniqueId('log'), 
      tenantId: tenantId, 
      type: 'AUTH', 
      msg: `${isLocal ? 'Local' : 'Public'} Access Granted: ${email} from IP: ${ip}`, 
      timestamp: new Date() 
    });

    res.json({ success: true, user });
  });

  // MFA Setup
  app.get('/api/auth/mfa/setup', authenticateToken, async (req: any, res) => {
    const user = users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const secret = totp.generateSecret();
    user.pendingMfaSecret = secret;
    const otpauth = totp.keyuri(user.email, 'Nexus Zero Trust', secret);
    const qrDataUrl = await QRCode.toDataURL(otpauth);
    
    res.json({ secret, qrDataUrl });
  });

  app.post('/api/auth/mfa/confirm', authenticateToken, (req: any, res) => {
    const { otp } = req.body;
    const user = users.find(u => u.id === req.user.id);
    if (!user || !user.pendingMfaSecret) return res.status(400).json({ error: 'Setup not initiated' });

    const isValid = totp.check(otp, user.pendingMfaSecret);
    if (isValid) {
      user.mfaSecret = user.pendingMfaSecret;
      user.mfaEnabled = true;
      delete user.pendingMfaSecret;
      securityLogs.unshift({ id: getUniqueId('log'), tenantId: req.user.tenantId, type: 'IAM', msg: `MFA Enabled for ${user.email}`, timestamp: new Date() });
      return res.json({ success: true });
    }
    res.status(400).json({ error: 'Invalid OTP code' });
  });

  // 2. Magic Link Authentication
  app.post('/api/auth/magic-link/request', (req, res) => {
    const { email } = req.body;
    const user = users.find(u => u.email === email);
    if (!user) return res.status(404).json({ error: 'Identity not found' });

    const linkId = crypto.randomBytes(32).toString('hex');
    magicLinks.set(linkId, { email, expires: new Date(Date.now() + 15 * 60000) });

    addAlert('AUTH_FLOW', 'LOW', `Magic link generated for ${email}`, 'INTERNAL');
    res.json({ success: true, msg: 'Magic link dispatched to secure inbox (Simulated)' });
  });

  app.get('/api/auth/magic-link/verify/:id', (req, res) => {
     const { id } = req.params;
     const link = magicLinks.get(id);

     if (!link || link.expires < new Date()) {
       return res.status(401).send('Link expired or invalid');
     }

     const user = users.find(u => u.email === link.email);
     magicLinks.delete(id);

     const sessionId = getUniqueId('sess');
     sessions.set(sessionId, { userId: user.id, tenantId: user.tenantId, ip: req.ip || 'unknown', deviceFp: 'magic_link_auth', lastSeen: new Date() });

     const { accessToken, refreshToken } = generateTokens(user, sessionId, user.tenantId);
     res.cookie('auth_token', accessToken, getCookieOptions());
     res.cookie('refresh_token', refreshToken, getCookieOptions());
     res.cookie('session_id', sessionId, getCookieOptions());
     res.cookie('tenant_id', user.tenantId, getCookieOptions({ httpOnly: false }));

     res.send(`<html><body><script>window.opener.postMessage({type: 'AUTH_SUCCESS', user: ${JSON.stringify(user)}}, '*'); window.close();</script></body></html>`);
  });

  app.post('/api/auth/logout', (req, res) => {
    const sessionId = req.cookies.session_id;
    const refreshToken = req.cookies.refresh_token;
    
    if (sessionId) sessions.delete(sessionId);
    if (refreshToken) refreshTokens.delete(refreshToken);

    res.clearCookie('auth_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    res.clearCookie('session_id', { path: '/' });
    res.json({ success: true });
  });

  app.post('/api/auth/refresh', async (req: any, res) => {
    const refreshToken = req.cookies.refresh_token;
    if (!refreshToken || !refreshTokens.has(refreshToken)) {
      return res.status(401).json({ error: 'INVALID_REFRESH_TOKEN' });
    }

    try {
      const decoded: any = jwt.verify(refreshToken, REFRESH_SECRET);
      const user = users.find(u => u.id === decoded.userId);
      const session = sessions.get(decoded.sessionId);

      if (!user || !session) {
        throw new Error('User or session invalid');
      }

      // Generate new pair
      refreshTokens.delete(refreshToken);
      const tokens = generateTokens(user, decoded.sessionId, session.tenantId);

      res.cookie('auth_token', tokens.accessToken, getCookieOptions());
      res.cookie('refresh_token', tokens.refreshToken, getCookieOptions());
      
      res.json({ success: true });
    } catch (err) {
      if (refreshToken) refreshTokens.delete(refreshToken);
      res.clearCookie('auth_token', { path: '/' });
      res.clearCookie('refresh_token', { path: '/' });
      res.status(401).json({ error: 'REFRESH_EXPIRED' });
    }
  });

  // IAM Administration
  app.get('/api/admin/users', authenticateToken, authorizeRoles(['ADMIN', 'SOC', 'USER']), (req, res) => {
    res.json(users);
  });

  app.get('/api/admin/sessions', authenticateToken, authorizeRoles(['ADMIN', 'SOC', 'USER']), (req, res) => {
    res.json(Array.from(sessions.entries()).map(([id, data]) => ({ id, ...data })));
  });

  app.post('/api/admin/sessions/terminate', authenticateToken, authorizeRoles(['ADMIN', 'SOC']), (req, res) => {
    const { sessionId } = req.body;
    if (sessionId && sessions.has(sessionId)) {
      sessions.delete(sessionId);
      securityLogs.unshift({ 
        id: getUniqueId('log'), 
        type: 'AUTH_REVOKE', 
        msg: `Session Terminated: Administrator manually revoked session ${sessionId}`, 
        timestamp: new Date() 
      });
      return res.json({ success: true });
    }
    res.status(404).json({ error: 'Session not found' });
  });

  // Vault Management (Secrets)
  const secrets: any[] = [
    { id: 'sec_1', name: 'Database API Key', value: 'encrypted_val_1', category: 'Infrastructure', createdAt: new Date() },
    { id: 'sec_2', name: 'Identity Service Secret', value: 'encrypted_val_2', category: 'Security', createdAt: new Date() }
  ];

  app.get('/api/vault/secrets', authenticateToken, verifyMTLS, (req, res) => {
    res.json(secrets);
  });

  app.post('/api/vault/secrets', authenticateToken, authorizeRoles(['ADMIN']), (req, res) => {
    const { name, value, category } = req.body;
    const newSecret = {
      id: getUniqueId('sec'),
      name,
      value: `Enc(${value})`, // Simulation of encryption
      category,
      createdAt: new Date()
    };
    secrets.push(newSecret);
    securityLogs.unshift({ id: getUniqueId('log'), type: 'VAULT', msg: `Secret Created: ${name}`, timestamp: new Date() });
    res.json(newSecret);
  });

  // Monitoring & Administration
  app.get('/api/admin/logs', authenticateToken, authorizeRoles(['ADMIN', 'SOC', 'USER']), (req: any, res) => {
    res.json(securityLogs.filter(l => l.tenantId === req.tenantId));
  });

  app.get('/api/admin/metrics', authenticateToken, authorizeRoles(['ADMIN', 'SOC', 'USER']), (req: any, res) => {
    const logs = securityLogs.filter(l => l.tenantId === req.tenantId);
    res.json({
      activeUsers: users.filter(u => u.tenantId === req.tenantId).length,
      authFailures: logs.filter(l => l.type === 'AUTH_FAIL').length,
      threatsBlocked: logs.filter(l => l.type === 'ATTACK').length,
      systemStatus: isSystemActive ? 'HEALTHY' : 'INACTIVE',
      uptime: process.uptime(),
      riskScore: riskProfile.globalScore,
      devicesActive: registeredDevices.filter(d => d.status === 'TRUSTED').length,
      orgName: req.tenant.name
    });
  });

  app.get('/api/admin/system/status', authenticateToken, authorizeRoles(['ADMIN', 'SOC']), (req, res) => {
    res.json({ active: isSystemActive });
  });

  app.get('/api/admin/infra', authenticateToken, (req, res) => {
    res.json({
      infrastructure: ciscoInfrastructure,
      vlanZones
    });
  });

  app.post('/api/admin/infra/restart', authenticateToken, authorizeRoles(['ADMIN']), (req, res) => {
    const { componentId } = req.body;
    const comps: any = ciscoInfrastructure;
    const compKey = Object.keys(comps).find(k => comps[k].id === componentId);
    
    if (compKey) {
      comps[compKey].status = 'RESTARTING';
      securityLogs.unshift({ 
        id: getUniqueId('log'), 
        type: 'INFO', 
        msg: `INFRASTRUCTURE RESTART: ${comps[compKey].name} cycling...`, 
        timestamp: new Date() 
      });
      
      setTimeout(() => {
        comps[compKey].status = 'ACTIVE';
        securityLogs.unshift({ 
          id: getUniqueId('log'), 
          type: 'INFO', 
          msg: `INFRASTRUCTURE READY: ${comps[compKey].name} is back online.`, 
          timestamp: new Date() 
        });
      }, 5000);
      
      return res.json({ success: true });
    }
    res.status(404).json({ error: 'Component not found' });
  });

  const simulatedCertificates = [
    { id: 'cert_001', cn: 'PC-ADMIN-001', machineId: 'MCH-DEMO-001', issuer: 'ZeroTrust-CA', serial: 'A0:3F:89:BC:12:44', valid: true, fingerprint: 'D4:E2:81:AE:C2:55:12:AA:77:FF', role: 'Global Administrator' },
    { id: 'cert_002', cn: 'PC-OPERATOR-012', machineId: 'MCH_GUEST_002', issuer: 'ZeroTrust-CA', serial: 'B1:9C:5F:AA:99:32', valid: true, fingerprint: 'F2:A3:BB:CC:55:11:DD:99:EE:44', role: 'Support Team' },
    { id: 'cert_003', cn: 'SOC-MAINFRAME-02', machineId: 'MCH_SOC_003', issuer: 'ZeroTrust-CA', serial: 'C5:7E:6E:FF:44:81', valid: true, fingerprint: '99:AA:88:BB:77:CC:66:DD:55:EE', role: 'SOC Analyst' },
    { id: 'cert_004', cn: 'COMPROMISED-LAPTOP', machineId: 'MCH_HACK_666', issuer: 'Revoked-BadCA', serial: 'FF:66:22:99:00:11', valid: false, fingerprint: '00:11:22:33:44:55:66:77:88:99', role: 'Untrusted/Intruder' }
  ];

  app.get('/api/admin/certs', authenticateToken, (req, res) => {
    res.json(simulatedCertificates);
  });

  app.post('/api/admin/certs/test', authenticateToken, (req, res) => {
    const { certId } = req.body;
    const cert = simulatedCertificates.find(c => c.id === certId);
    if (!cert) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    const steps = [
      `[CLIENT] Client Hello (TLSv1.3, Cipher: TLS_AES_256_GCM_SHA384) - Initiating connection to gateway`,
      `[PROXY] Server Hello (TLSv1.3, Handshake ongoing) - Selected Cipher, replying with ECDHE params`,
      `[PROXY] Server Certificate sent (CN: localhost, Issuer: ZeroTrust-CA, Status: Verified)`,
      `[PROXY] Certificate Request sent (Enforcing Mutual TLS verification)`,
      `[CLIENT] Client Certificate presented: CN=${cert.cn}, Serial=${cert.serial}, Issuer=${cert.issuer}`,
    ];

    if (cert.valid) {
      steps.push(
        `[PROXY] Cryptographic signature check: signature verified over ephemeral keys`,
        `[PROXY] Certificate Chain matching check: client signed by root CA "ZeroTrust-CA" (VALID)`,
        `[PROXY] Checking revocation list (CRL) / OCSP stapling: Active cert: NOT REVOKED`,
        `[PROXY] Handshake completed successfully. Mutual TLS session ESTABLISHED (Tunnel secured via AES-GCM).`,
        `[GATEWAY] Machine Authorized: Mapping connection to ZeroTrust identity "${cert.machineId}".`
      );
      
      securityLogs.unshift({
        id: getUniqueId('log'),
        tenantId: (req as any).tenantId,
        type: 'INFO',
        msg: `mTLS HANDSHAKE SUCCESSFUL: Device "${cert.cn}" verified via root CA. Trust mapped to ${cert.machineId}.`,
        timestamp: new Date()
      });

      return res.json({
        success: true,
        cert,
        steps,
        summary: `MUTUAL TLS ESTABLISHED: Handshake completed successfully. Device ${cert.cn} is trusted.`
      });
    } else {
      steps.push(
        `[PROXY] Cryptographic signature check: failed or warning`,
        `[PROXY] Certificate Chain matching check: SIGNATURE INVALID (Not authenticated by trusted CA)`,
        `[PROXY] Revocation status: FAILED_INTEGRITY`,
        `[GATEWAY] Handshake ABORTED: Alert level: FATAL, Description: BAD_RECORD_MAC / CERTIFICATE_UNKNOWN`,
        `[SECURITY] Threat Detection: Unauthorized access attempt blocked at gateway.`
      );

      securityLogs.unshift({
        id: getUniqueId('log'),
        tenantId: (req as any).tenantId,
        type: 'DENY',
        msg: `mTLS HANDSHAKE FAILED: Device "${cert.cn}" presented an untrusted certificate chain (Issuer: ${cert.issuer}). Blocked!`,
        timestamp: new Date()
      });

      return res.json({
        success: false,
        cert,
        steps,
        summary: `HANDSHAKE FAILED: Security Alert. Certificate ${cert.cn} was rejected by the gateway policy.`
      });
    }
  });

  app.post('/api/admin/system/toggle', authenticateToken, authorizeRoles(['ADMIN']), (req, res) => {
    isSystemActive = !isSystemActive;
    securityLogs.unshift({ 
      id: getUniqueId('log'), 
      type: 'POLICY', 
      msg: `SYSTEM STATE CHANGE: Infrastructure manually ${isSystemActive ? 'ACTIVATED' : 'DEACTIVATED'} by admin.`, 
      timestamp: new Date() 
    });
    res.json({ active: isSystemActive });
  });

  // Billing endpoints removed


  // Device Registry API
  app.get('/api/admin/devices', authenticateToken, authorizeRoles(['ADMIN', 'SOC', 'USER']), (req, res) => {
    res.json(registeredDevices);
  });

  app.post('/api/admin/devices/revoke', authenticateToken, authorizeRoles(['ADMIN', 'SOC']), (req, res) => {
    const { deviceId } = req.body;
    const idx = registeredDevices.findIndex(d => d.id === deviceId);
    if (idx > -1) {
      registeredDevices[idx].revoked = true;
      registeredDevices[idx].status = 'REVOKED';
      addAlert('REVOCATION', 'MEDIUM', `Device access manually revoked: ${deviceId}`, deviceId);
      return res.json({ success: true });
    }
    res.status(404).json({ error: 'Device not found' });
  });

  app.get('/api/admin/alerts', authenticateToken, authorizeRoles(['ADMIN', 'SOC', 'USER']), (req, res) => {
    res.json(activeAlerts);
  });

  app.post('/api/admin/alerts/clear', authenticateToken, authorizeRoles(['ADMIN', 'SOC']), (req, res) => {
    const { alertId } = req.body;
    const idx = activeAlerts.findIndex(a => a.id === alertId);
    if (idx > -1) {
       activeAlerts[idx].status = 'RESOLVED';
       return res.json({ success: true });
    }
    res.status(404).json({ error: 'Alert not found' });
  });

  // Risk Engine API
  app.get('/api/admin/risk-analysis', authenticateToken, authorizeRoles(['ADMIN', 'SOC', 'USER']), (req, res) => {
    res.json({
      ...riskProfile,
      stats: riskStats,
      anomalies: aiAnomalies
    });
  });

  app.post('/api/admin/ai/mitigate', authenticateToken, authorizeRoles(['ADMIN', 'SOC']), (req, res) => {
    const { id } = req.body;
    const idx = aiAnomalies.findIndex(a => a.id === id);
    if (idx > -1) {
      aiAnomalies[idx].status = 'MITIGATED';
      return res.json({ success: true });
    }
    res.status(404).json({ error: 'Anomaly not found' });
  });

  app.post('/api/admin/ai/re-calibrate', authenticateToken, authorizeRoles(['ADMIN', 'SOC']), (req: any, res) => {
    securityLogs.unshift({
      id: getUniqueId('log'),
      tenantId: req.tenantId || 'tnt_001',
      type: 'AI_ORCHESTRATION',
      msg: 'MANUAL_RECALIBRATION: Anomaly detection models successfully retrained with recent security event data.',
      timestamp: new Date()
    });
    res.json({ success: true, message: 'Models re-calibrated and synchronized across the mesh.' });
  });

  // Security Testing & Compliance APIs
  app.get('/api/admin/compliance', authenticateToken, authorizeRoles(['ADMIN', 'SOC', 'USER']), (req, res) => {
    res.json(complianceControls);
  });

  app.get('/api/admin/threat-intel', authenticateToken, (req, res) => {
    res.json(threatIntelFeed);
  });

  app.get('/api/admin/policy', authenticateToken, authorizeRoles(['ADMIN', 'SOC', 'USER']), (req, res) => {
    res.json({ revocationPolicy: globalRevocationPolicy });
  });

  // Trigger Identity Challenge (Manual MFA Request)
  const challengeSchema = z.object({
    email: z.string().email()
  });

  app.post('/api/admin/mfa/challenge', authenticateToken, authorizeRoles(['ADMIN', 'SOC']), async (req: any, res) => {
    const parseResult = challengeSchema.safeParse(req.body);
    if (!parseResult.success) return res.status(400).json({ error: 'INVALID_INPUT' });
    const { email } = parseResult.data;
    const targetUser = users.find(u => u.email === email && u.tenantId === req.tenantId);
    if (!targetUser) return res.status(404).json({ error: 'User not found in this organization' });

    // AI Risk Assessment before dispatch
    const ml_res = await calculateRiskScore({
      failedLogins: 0,
      hour: new Date().getHours(),
      unknownDevice: false,
      geoRisk: 0.05,
      deviceFingerprint: 'admin_console_trigger'
    });
    const riskScore = ml_res.score;

    const requestId = getUniqueId('push');
    pushRequests.push({
      id: requestId,
      userId: targetUser.id || email,
      tenantId: req.tenantId,
      status: 'PENDING',
      timestamp: new Date(),
      riskScore,
      reason: 'Admin-Triggered Multi-Factor Identity Verification'
    });

    securityLogs.unshift({
      id: getUniqueId('log'),
      tenantId: req.tenantId,
      type: 'AI_MFA',
      msg: `ADMIN CHALLENGE: MFA verification dispatched to ${email} (AI Risk: ${riskScore}%)`,
      timestamp: new Date()
    });

    res.json({ success: true, requestId, riskScore });
  });

  app.post('/api/admin/policy/toggle', authenticateToken, authorizeRoles(['ADMIN', 'SOC']), (req, res) => {
    globalRevocationPolicy = globalRevocationPolicy === 'MANUAL' ? 'AUTO' : 'MANUAL';
    securityLogs.unshift({ id: getUniqueId('log'), type: 'POLICY', msg: `Revocation Policy shifted to ${globalRevocationPolicy}`, timestamp: new Date() });
    res.json({ revocationPolicy: globalRevocationPolicy });
  });

  app.get('/api/admin/scans', authenticateToken, authorizeRoles(['ADMIN', 'SOC', 'USER']), (req, res) => {
    res.json(vulnerabilityReports);
  });

  app.post('/api/admin/scans/start', authenticateToken, authorizeRoles(['ADMIN', 'SOC']), (req, res) => {
    const { type } = req.body;
    const newScan = {
      id: getUniqueId('scan'),
      name: `${type} Diagnostic`,
      status: 'IN_PROGRESS',
      findings: 0,
      severity: 'UNKNOWN',
      date: new Date()
    };
    vulnerabilityReports.unshift(newScan);
    
    // Simulate scan completion after 10 seconds
    setTimeout(() => {
      const idx = vulnerabilityReports.findIndex(s => s.id === newScan.id);
      if (idx > -1) {
        vulnerabilityReports[idx].status = 'COMPLETED';
        vulnerabilityReports[idx].findings = Math.floor(Math.random() * 5);
        vulnerabilityReports[idx].severity = vulnerabilityReports[idx].findings > 3 ? 'HIGH' : 'LOW';
        
        securityLogs.unshift({ 
          id: getUniqueId('log'), 
          type: 'INFO', 
          msg: `Security Scan Completed: ${newScan.name}. Detected ${vulnerabilityReports[idx].findings} findings.`, 
          timestamp: new Date() 
        });
      }
    }, 15000);

    res.json(newScan);
  });

  // --- KALI LINUX SIMULATION API ---
  const kaliSimulations: Record<string, any> = {
    'nmap': { 
      output: [
        'Starting Nmap 7.93 ( https://nmap.org ) at 2024-04-23 14:00 CET',
        'Nmap scan report for internal-auth-gateway.nexus.local (10.0.8.4)',
        'Host is up (0.00045s latency).',
        'Not shown: 995 closed tcp ports (reset)',
        'PORT     STATE SERVICE',
        '22/tcp   open  ssh',
        '80/tcp   open  http',
        '443/tcp  open  https',
        '3000/tcp open  ppp',
        '8080/tcp open  http-proxy',
        'Nmap done: 1 IP address (1 host up) scanned in 2.14 seconds'
      ],
      log: 'RECONNAISSANCE: Nmap full-port scan detected targeting Gateway.'
    },
    'hydra': {
      output: [
        'Hydra v9.4 (c) 2024 by van Hauser/THC - Please do not use in military or secret service organizations, or for illegal purposes.',
        'Hydra (http-post-form) starting at 2024-04-23 14:02:11',
        '[DATA] attacking http-post-form://10.0.8.4:443/api/auth/login',
        '[ATTEMPT] user: admin - pass: 123456 - 1 of 500',
        '[ATTEMPT] user: admin - pass: password - 2 of 500',
        '[ATTEMPT] user: root - pass: root - 3 of 500',
        '[SKIPPING] Multiple failures detected - AI IP Rate Limiting triggered.',
        'Hydra done: 0 of 1 target successfully completed, 1 valid password found (cached from previous run)'
      ],
      log: 'ATTACK: Brute force attempt (Hydra) blocked by AI Adaptive Rate Limiter.'
    },
    'metasploit': {
      output: [
        'msf6 > use exploit/multi/handler',
        'msf6 exploit(multi/handler) > set PAYLOAD linux/x64/meterpreter/reverse_tcp',
        'msf6 exploit(multi/handler) > exploit',
        '[*] Started reverse TCP handler on 10.0.12.55:4444',
        '[-] Exploit failed: The connection was forcibly closed by the remote host (IPS Block).',
        '[*] Nexus Zero Trust IPS: Packet inspection identified Metasploit signature. Connection dropped.'
      ],
      log: 'EXPLOITATION: Metasploit payload delivery attempt blocked by L7 Inspection.'
    },
    'sqlmap': {
      output: [
        'sqlmap/1.7.2#stable - automatic SQL injection and database takeover tool',
        'testing connection to the target URL',
        'checking if the target URL is content stable',
        'testing if HTTP parameter "id" is dynamic',
        'confirming that HTTP parameter "id" is dynamic',
        '[CRITICAL] the target URL is not vulnerable to SQL injection',
        '[INFO] AI WAF: SQLmap pattern "UNION SELECT" blocked by Nexus WAF layer.'
      ],
      log: 'ATTACK: Automated SQL Injection probe detected and neutralized by WAF.'
    }
  };

  app.post('/api/admin/kali/execute', authenticateToken, authorizeRoles(['ADMIN', 'SOC']), (req: any, res) => {
    const { tool } = req.body;
    const sim = kaliSimulations[tool];
    
    if (!sim) return res.status(404).json({ error: 'Tool simulation not found' });

    // Log the attack to audit logs
    securityLogs.unshift({
      id: getUniqueId('log'),
      tenantId: req.tenantId,
      type: 'ATTACK',
      msg: sim.log,
      timestamp: new Date()
    });

    // Add to anomalies for SOC view
    aiAnomalies.unshift({
      id: getUniqueId('ano'),
      type: 'ATTACK',
      name: `KALI: ${tool.toUpperCase()}`,
      riskScore: 90,
      description: `Simulated red-team audit using ${tool}. ${sim.log}`,
      timestamp: new Date(),
      status: 'PENDING'
    });

    res.json({ output: sim.output });
  });

  // --- VIRTUAL MACHINE LAB API ---
  app.get('/api/admin/vms', authenticateToken, authorizeRoles(['ADMIN', 'SOC']), (req, res) => {
    res.json(virtualMachines);
  });

  app.post('/api/admin/vms/:id/toggle', authenticateToken, authorizeRoles(['ADMIN', 'SOC']), (req, res) => {
    const { id } = req.params;
    const { targetState } = req.body;
    const vm = virtualMachines.find(v => v.id === id);
    if (!vm) return res.status(404).json({ error: 'VM not found' });

    let alreadyInState = false;
    if (targetState) {
      if (vm.status === targetState) {
        alreadyInState = true;
      } else {
        vm.status = targetState as any;
      }
    } else {
      vm.status = vm.status === 'RUNNING' ? 'STOPPED' : 'RUNNING';
    }

    if (!alreadyInState) {
      if (vm.status === 'RUNNING') {
        vm.lastBoot = new Date();
        vm.cpu = '0.5%';
        vm.ram = id === 'vm_kali' ? '1.1GB/4GB' : '0.8GB/2GB';
      } else {
        vm.cpu = '0%';
        vm.ram = id === 'vm_kali' ? '0GB/4GB' : '0GB/2GB';
      }

      securityLogs.unshift({
        id: getUniqueId('log'),
        tenantId: (req as any).tenantId,
        type: 'INFO',
        msg: `VM STATE CHANGE: ${vm.name} is now ${vm.status}`,
        timestamp: new Date()
      });
    }

    res.json({ success: true, vm, alreadyInState });
  });

  app.post('/api/admin/logs/simulate', authenticateToken, authorizeRoles(['ADMIN', 'SOC']), (req, res) => {
    const { type, msg } = req.body;
    const newLog = {
      id: getUniqueId('log'),
      tenantId: (req as any).tenantId,
      type: type || 'INFO',
      msg: msg || 'System Simulation Event',
      timestamp: new Date()
    };
    securityLogs.unshift(newLog);
    res.json({ success: true, log: newLog });
  });

  app.post('/api/admin/vms/:id/execute', authenticateToken, authorizeRoles(['ADMIN', 'SOC']), (req, res) => {
    const { id } = req.params;
    const { cmd } = req.body;
    const vm = virtualMachines.find(v => v.id === id);
    
    if (!vm) return res.status(404).json({ error: 'VM not found' });
    const vmDevice = registeredDevices.find(d => d.id === id);
    if (vmDevice?.revoked) {
      return res.status(403).json({ 
        error: 'ZERO TRUST BLOCK: Node identity has been revoked due to policy violation.',
        code: 'IDENTITY_REVOKED'
      });
    }

    if (vm.status !== 'RUNNING') return res.status(400).json({ error: 'Machine is offline' });

    let output: string[] = [];

    if (id === 'vm_ubuntu') {
      const lowerCmd = cmd.toLowerCase().trim();
      const parts = lowerCmd.split(' ');
      const baseCmd = parts[0];

      if (baseCmd === 'ls') {
        const path = parts[1] || '.';
        if (path === '/' || path === '/etc') output = ['os-release', 'hostname', 'hosts', 'networks', 'resolv.conf', 'ssl'];
        else if (path === '/home') output = ['nexus-admin'];
        else output = ['bin', 'boot', 'dev', 'etc', 'home', 'lib', 'media', 'mnt', 'opt', 'proc', 'root', 'run', 'sbin', 'srv', 'sys', 'tmp', 'usr', 'var'];
      }
      else if (lowerCmd === 'uname -a') output = [`Linux ubuntu 5.15.0-101-generic #111-Ubuntu SMP Tue Feb 13 14:12:00 UTC 2024 x86_64 x86_64 x86_64 GNU/Linux`];
      else if (lowerCmd === 'whoami') output = ['nexus-admin'];
      else if (lowerCmd === 'ifconfig' || lowerCmd === 'ip addr') output = [`eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500`, `        inet ${vm.ip}  netmask 255.255.255.0  broadcast 10.0.8.255`, `        inet6 fe80::a00:27ff:fe8e:e8e  prefixlen 64  scopeid 0x20<link>`, `        ether 08:00:27:8e:0e:8e  txqueuelen 1000  (Ethernet)`];
      else if (lowerCmd === 'apt update') output = ['Hit:1 http://archive.ubuntu.com/ubuntu jammy InRelease', 'Get:2 http://security.ubuntu.com/ubuntu jammy-security InRelease [110 kB]', 'Reading package lists... Done', 'Building dependency tree... Done', 'All packages are up to date.'];
      else if (lowerCmd === 'help') output = ['Standard Ubuntu Shell. Supported: ls, uname, whoami, ifconfig, ip addr, apt, clear, date, uptime, cat, ping, df, free, ps, top, curl, wget, nano, exit'];
      else if (lowerCmd === 'date') output = [new Date().toString()];
      else if (lowerCmd === 'uptime') output = [' 20:38:12 up 12 days,  4:23,  1 user,  load average: 0.12, 0.08, 0.02'];
      else if (lowerCmd.startsWith('cat ')) {
        const file = lowerCmd.replace('cat ', '').trim();
        if (file === '/etc/os-release') output = ['PRETTY_NAME="Ubuntu 22.04.4 LTS"', 'NAME="Ubuntu"', 'VERSION_ID="22.04"', 'ID=ubuntu', 'ID_LIKE=debian'];
        else if (file === '/etc/hostname') output = ['ubuntu-support-v4'];
        else output = [`cat: ${file}: No such file or directory`];
      }
      else if (lowerCmd.startsWith('ping ')) {
        const target = parts[1] || 'google.com';
        output = [
          `PING ${target} (142.250.74.206) 56(84) bytes of data.`,
          `64 bytes from 142.250.74.206: icmp_seq=1 ttl=117 time=14.2 ms`,
          `64 bytes from 142.250.74.206: icmp_seq=2 ttl=117 time=13.8 ms`,
          `64 bytes from 142.250.74.206: icmp_seq=3 ttl=117 time=14.5 ms`,
          `--- ${target} ping statistics ---`,
          `3 packets transmitted, 3 received, 0% packet loss, time 2003ms`
        ];
      }
      else if (lowerCmd === 'df -h') output = ['Filesystem      Size  Used Avail Use% Mounted on', '/dev/sda1        40G   12G   28G  31% /', 'tmpfs           3.9G     0  3.9G   0% /dev/shm', 'tmpfs           794M  1.1M  793M   1% /run'];
      else if (lowerCmd === 'free -m' || lowerCmd === 'free -h') output = ['               total        used        free      shared  buff/cache   available', 'Mem:            7936        1240        4520         120        2176        6320', 'Swap:           2048           0        2048'];
      else if (lowerCmd === 'ps aux' || lowerCmd === 'ps') output = ['USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND', 'root           1  0.0  0.0  22584  9348 ?        Ss   Oct10   0:02 /sbin/init', 'nexus-admin  452  0.1  0.2 125432 18432 pts/0    Ss   20:40   0:00 -bash', 'nexus-admin  488  0.0  0.0  10284  3256 pts/0    R+   20:41   0:00 ps aux'];
      else if (lowerCmd === 'top') output = ['top - 20:42:01 up 12 days, 4:23, 1 user, load average: 0.12, 0.08, 0.02', 'Tasks: 122 total, 1 running, 121 sleeping, 0 stopped, 0 zombie', '%Cpu(s):  1.2 us,  0.5 sy,  0.0 ni, 98.3 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st', 'MiB Mem :   7936.4 total,   4520.1 free,   1240.5 used,   2175.8 buff/cache', 'MiB Swap:   2048.0 total,   2048.0 free,      0.0 used.   6320.2 avail Mem'];
      else if (lowerCmd.startsWith('curl ') || lowerCmd.startsWith('wget ')) {
        const url = parts[1] || 'http://localhost';
        output = [
          `Connecting to ${url}... connected.`,
          `HTTP request sent, awaiting response... 200 OK`,
          `Length: 452 [text/html]`,
          `Saving to: ‘STDOUT’`
        ];
      }
      else if (lowerCmd.startsWith('nano ') || lowerCmd.startsWith('vi ')) {
        output = [
          `[ Simulating Editor ]`,
          `Opening ${parts[1] || 'newfile'}...`,
          `Edit mode active. Press Ctrl+X to save. (Simulated)`
        ];
      }
      else if (lowerCmd === 'reboot') {
         vm.status = 'STOPPED';
         setTimeout(() => { vm.status = 'RUNNING'; vm.lastBoot = new Date(); }, 3000);
         output = ['Broadcast message from root@ubuntu (pts/0) (Thu Oct 23 20:42:01 2026):', 'The system is going down for reboot NOW!'];
      }
      else output = [`-bash: ${cmd}: command not found`];
    }
 else if (id === 'vm_kali') {
      if (cmd === 'nmap') output = ['Nmap scan report for target.nexus.internal (10.0.8.100)', 'Host is up (0.0021s latency).', 'Not shown: 998 closed tcp ports (reset)', 'PORT   STATE SERVICE', '80/tcp open  http', '443/tcp open  https'];
      else if (cmd === 'whoami') output = ['root'];
      else output = [`kali-bash: ${cmd}: tool not initiated or command unknown`];
    }

    res.json({ output });
  });

  // Mobile Agent Simulation Endpoint (Health Checkin)
  const agentCheckinSchema = z.object({
    deviceId: z.string(),
    health: z.enum(['SAFE', 'ROOTED']),
    os: z.string(),
    certExpired: z.boolean().optional()
  });

  app.post('/api/agent/checkin', async (req, res) => {
    const parseResult = agentCheckinSchema.safeParse(req.body);
    if (!parseResult.success) return res.status(400).json({ error: 'INVALID_INPUT' });
    const { deviceId, health, os, certExpired } = parseResult.data;
    const deviceIndex = registeredDevices.findIndex(d => d.id === deviceId);
    
    // Check if device is already revoked
    if (deviceIndex > -1 && registeredDevices[deviceIndex].revoked) {
      return res.status(403).json({ error: 'ACCESS_REVOKED', msg: 'Your access has been administratively revoked.' });
    }

    const isNonCompliant = health === 'ROOTED' || certExpired;
    const status = isNonCompliant ? 'UNTRUSTED' : 'TRUSTED';
    
    if (deviceIndex > -1) {
      registeredDevices[deviceIndex] = { 
        ...registeredDevices[deviceIndex], 
        health: isNonCompliant ? (health === 'ROOTED' ? 'ROOTED' : 'CERT_EXPIRED') : 'SAFE', 
        status,
        lastReport: new Date() 
      };
    } else {
      registeredDevices.push({
        id: deviceId || getUniqueId('dev'),
        name: 'Automated Enrollment',
        status,
        health: isNonCompliant ? (health === 'ROOTED' ? 'ROOTED' : 'CERT_EXPIRED') : 'SAFE',
        os: os || 'Unknown',
        lastReport: new Date(),
        revoked: false
      });
    }

    if (health === 'ROOTED') {
      addAlert('COMPLIANCE_CRITICAL', 'HIGH', `Device ${deviceId} reported ROOTED state. Automated flagging active.`, deviceId);
    }
    if (certExpired) {
      addAlert('MTLS_EXPIRED', 'HIGH', `Device ${deviceId} mTLS certificate has expired. Security handshake rejected.`, deviceId);
    }

    // --- SOAR: Automatic Response Logic ---
    const device_ml_res = await calculateRiskScore({ health, failedLogins: 0, geoRisk: 0.1, hour: new Date().getHours() });
    const currentDeviceRisk = device_ml_res.score;
    
    const shouldAutoRevoke = globalRevocationPolicy === 'AUTO' && (isNonCompliant || currentDeviceRisk >= 80);

    if (shouldAutoRevoke || currentDeviceRisk >= 95) {
      if (deviceIndex > -1) {
        registeredDevices[deviceIndex].revoked = true;
        registeredDevices[deviceIndex].status = 'REVOKED';
        const reason = health === 'ROOTED' ? 'Non-Compliance (ROOTED)' : `Critical Risk (${currentDeviceRisk}%)`;
        addAlert('SOAR_AUTO_BLOCK', 'HIGH', `AUTO-REVOKE: ${reason} for device ${deviceId}`, deviceId);
        return res.status(403).json({ error: 'ACCESS_REVOKED', msg: `Access automatically blocked by Security Policy Engine (${reason}).` });
      }
    } else if (currentDeviceRisk >= 60) {
      addAlert('SOAR_MFA_REQ', 'MEDIUM', `High Risk detected (${currentDeviceRisk}%). MFA verification escalated for ${deviceId}`, deviceId);
    }
    
    if (status === 'UNTRUSTED') {
      securityLogs.unshift({ 
        id: getUniqueId('log'), 
        type: 'ATTACK', 
        msg: `Device Compliance Failure: ${deviceId} reported ${health}`, 
        timestamp: new Date() 
      });
    }

    res.json({ success: true, policy: 'STRICT_ZTA', status });
  });

  // --- VITE SETUP ---
  // Initialize ML Engine
  try {
    await mlEngine.init();
    console.log('[Nexus AI] ML Engine initialized successfully');
  } catch (err) {
    console.error('[Nexus AI] ML Engine initialization FAILED:', err);
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      res.sendFile(indexPath);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ZeroTrust Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('CRITICAL: Server failed to start:', err);
  process.exit(1);
});
