import React, { useState, useEffect, useMemo, useRef } from 'react';
type FunctionDeclaration = any;
enum ThinkingLevel {
  HIGH = 'HIGH',
  LOW = 'LOW',
  MINIMAL = 'MINIMAL'
}
enum Type {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  INTEGER = 'INTEGER',
  BOOLEAN = 'BOOLEAN',
  ARRAY = 'ARRAY',
  OBJECT = 'OBJECT',
  NULL = 'NULL'
}
import { VideoModule } from './components/VideoModule/VideoModule';
import { VideoPlayer } from './components/VideoModule/VideoPlayer';
import WazuhSIEM from './components/WazuhSIEM';
import { 
  Shield, 
  Lock, 
  Key, 
  Activity, 
  Server, 
  Users, 
  Settings, 
  LogOut, 
  Plus, 
  ShieldAlert,
  Fingerprint,
  RefreshCcw,
  Eye,
  EyeOff,
  Cpu,
  Globe,
  Smartphone,
  LayoutDashboard,
  Search,
  Filter,
  BarChart3,
  Map as MapIcon,
  Navigation,
  HardDrive,
  MessageSquare,
  Sparkles,
  Zap,
  Send,
  Info,
  Loader2,
  Bug,
  ClipboardCheck,
  Target,
  FileSearch,
  CheckCircle2,
  Check,
  AlertTriangle,
  Clock,
  ExternalLink,
  Ban,
  User,
  UserMinus,
  Wifi,
  Battery,
  BatteryLow,
  Database,
  ShieldCheck,
  Network,
  ScanFace,
  Power,
  Calendar,
  X,
  Skull,
  Terminal,
  Monitor,
  Play,
  Square,
  PowerOff,
  QrCode,
  Signal,
  PlayCircle,
  Video,
  Bot,
  BrainCircuit,
  MessageCircle,
  Wand2,
  TrendingUp,
  Paperclip,
  Languages,
  FileText,
  Save,
  Download,
  Trash2,
  PlusCircle,
  MoreVertical,
  Edit2,
  Heart,
  Repeat2,
  Share2,
  UserPlus,
  Image as ImageIcon,
  Smile,
  Hash,
  Radar,
  Crosshair,
  ShieldQuestion,
  History
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatDate } from './lib/utils';
import * as d3 from 'd3';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut, 
  signInWithPopup, 
  GoogleAuthProvider,
  signInAnonymously 
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  serverTimestamp, 
  doc, 
  deleteDoc, 
  updateDoc,
  getDocs,
  limit,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from './firebase';
import QRCode from 'qrcode';
import { Shield as ShieldIcon } from 'lucide-react';

const ai = {
  models: {
    generateContent: async ({ model, contents, config }: any) => {
      try {
        const response = await axios.post('/api/ai/secure-generate', { model, contents, config });
        return {
          text: response.data.text,
          functionCalls: response.data.functionCalls
        };
      } catch (err: any) {
        console.error("Secure AI Gateway Error:", err);
        let errorMsg = err.response?.data?.message || err.message;
        if (err.message === "Network Error") {
          errorMsg = "Network Error: Failed to contact the Secure AI Gateway. If you are using Brave or an aggressive privacy extension/adblocker, please verify it is not blocking outbound platform APIs on this domain.";
        }
        throw new Error(errorMsg || "Failed to contact Gemini Secure Gateway");
      }
    }
  }
};

// --- Axios Initialization ---
axios.defaults.withCredentials = true;
axios.defaults.headers.common['x-machine-id'] = 'MCH-DEMO-001'; // Default identity for simulated Zero Trust

// Global interceptor for session expiry handling
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthRoute = originalRequest.url.includes('/api/auth/login') || 
                        originalRequest.url.includes('/api/auth/guest') || 
                        originalRequest.url.includes('/api/auth/logout') || 
                        originalRequest.url.includes('/api/auth/me');
    
    // If 401 and not already retrying and not an auth bypass route
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/api/auth/refresh') && !isAuthRoute) {
      originalRequest._retry = true;
      try {
        await axios.post('/api/auth/refresh');
        return axios(originalRequest);
      } catch (refreshError) {
        window.dispatchEvent(new Event('unauthorized'));
        return Promise.reject(refreshError);
      }
    }
    
    // Don't trigger unauthorized event for initial check session or login attempts
    if (error.response?.status === 401 && !isAuthRoute && !window.location.pathname.includes('/auth')) {
      window.dispatchEvent(new Event('unauthorized'));
    }
    return Promise.reject(error);
  }
);

// --- Types ---
interface Secret {
  id: string;
  name: string;
  value: string;
  category: string;
  createdAt: string | Date;
}

interface SecurityLog {
  id: number;
  type: string;
  msg: string;
  timestamp: string | Date;
  user?: string;
  severity?: string;
}

interface Metrics {
  activeUsers: number;
  authFailures: number;
  threatsBlocked: number;
  systemStatus: string;
  uptime: number;
  riskScore: number;
  devicesActive: number;
  orgName: string;
  trends?: { time: string, score: number }[];
}


interface Device {
  id: string;
  name: string;
  status: 'TRUSTED' | 'UNTRUSTED';
  health: 'SAFE' | 'ROOTED';
  os: string;
  lastReport: string;
  revoked?: boolean;
}

interface RiskProfile {
  trends: { time: string, score: number }[];
}

interface CiscoInfra {
  infrastructure: {
    firewall: { id: string, name: string, status: string, ip: string, insideIp: string },
    proxy: { id: string, name: string, status: string, mtls: string, port: number },
    backend: { id: string, name: string, status: string, exposed: boolean, internalIp: string },
    identity: { id: string, name: string, status: string, port: number },
    protection: { id: string, name: string, status: string, bannedIps: string[] }
  };
  vlanZones: { id: number, name: string, network: string, gateway: string, devices: string[] }[];
}

function CiscoArchitectureView() {
  const [data, setData] = useState<CiscoInfra | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<'asa' | 'nginx' | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get('/api/admin/infra');
        setData(res.data);
      } catch (e) {
        console.error("Failed to fetch infra", e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
    const interval = setInterval(fetch, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-nexus-blue" size={48} />
      </div>
    );
  }

  const { infrastructure, vlanZones } = data;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 pb-20">
      <div className="flex justify-between items-end px-2">
        <div>
           <div className="flex items-center gap-3 mb-4">
              <span className="px-2 py-1 bg-nexus-blue/10 text-nexus-blue text-[10px] font-bold tracking-widest rounded border border-nexus-blue/20 uppercase">Network Blueprint</span>
              <div className="w-1 h-1 rounded-full bg-white/20" />
              <span className="text-[10px] text-text-muted font-medium uppercase tracking-[0.2em]">Cisco ASA & Zero Trust Grid</span>
           </div>
           <h1 className="text-5xl font-black tracking-tight">System <span className="text-nexus-blue">Architecture</span></h1>
        </div>
        <div className="flex gap-4">
            <div className="nx-glass px-4 py-2 border border-nexus-safe/30 text-nexus-safe flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-nexus-safe shadow-[0_0_8px_#10b981]" />
                <span className="text-[10px] font-bold uppercase tracking-widest">MTLS Enforced</span>
            </div>
            <div className="nx-glass px-4 py-2 border border-nexus-blue/30 text-nexus-blue flex items-center gap-2">
                <Shield size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">VLAN Isolation Active</span>
            </div>
        </div>
      </div>

      {/* Connection Flow Visualization */}
      <div className="nx-card p-10 bg-black/40 relative overflow-hidden border border-white/5">
         <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
         <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted mb-10 flex items-center gap-2">
            <Zap size={14} className="text-nexus-cyan" />
            FLUX DE CONNEXION ZERO TRUST
         </h3>
         
         <div className="flex items-center justify-between relative px-10">
            <FlowStep icon={<User size={32} />} label="UTILISATEUR" color="text-white" />
            <FlowArrow 
               color="text-nexus-blue" 
               label="HTTPS + mTLS" 
               highlighted={hoveredNode === 'asa'}
            />
            <FlowStep 
               icon={<ShieldCheck size={32} />} 
               label="ASA 5505 FIREWALL" 
               color="text-nexus-blue" 
               sub="200.1.1.1"
               onMouseEnter={() => setHoveredNode('asa')}
               onMouseLeave={() => setHoveredNode(null)}
               highlighted={hoveredNode === 'asa'}
               tooltip="Cisco ASA 5505 (Firewall): Inspects incoming ingress traffic, blocks unauthorized port mappings, and enforces rigorous system-wide firewall Access Control Lists (ACLs)."
            />
            <FlowArrow 
               color="text-nexus-cyan" 
               highlighted={hoveredNode === 'asa' || hoveredNode === 'nginx'}
            />
            <FlowStep 
               icon={<Server size={32} />} 
               label="NGINX PROXY" 
               color="text-nexus-cyan" 
               sub="443 -> Internal"
               onMouseEnter={() => setHoveredNode('nginx')}
               onMouseLeave={() => setHoveredNode(null)}
               highlighted={hoveredNode === 'nginx'}
               tooltip="NGINX Proxy: Validates clients' mTLS hardware certificates, terminates SSL/TLS connections, and proxies authorized payload streams directly to secure internal VLAN slots."
            />
            <FlowArrow 
               color="text-nexus-safe" 
               highlighted={hoveredNode === 'nginx'}
            />
            <div className="flex flex-col gap-4">
               <FlowStep 
                  icon={<Database size={32} />} 
                  label="VAULTWARDEN" 
                  color="text-nexus-safe" 
                  sub="192.168.30.10" 
                  highlighted={hoveredNode === 'nginx'}
               />
               <FlowStep 
                  icon={<Key size={32} />} 
                  label="KEYCLOAK MFA" 
                  color="text-nexus-alert" 
                  sub="8080" 
                  highlighted={hoveredNode === 'nginx'}
               />
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* VLAN Isolation Breakdown */}
         <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted px-2">PLAN D'ADRESSAGE & VLANs</h3>
            <div className="grid grid-cols-1 gap-4">
               {vlanZones.map(zone => (
                  <motion.div 
                    key={zone.id} 
                    whileHover={{ x: 5 }}
                    className="nx-card p-6 bg-white/[0.02] border-white/5 group hover:border-nexus-blue/20 transition-all"
                  >
                     <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                           <div className={cn(
                             "w-12 h-12 rounded-xl flex items-center justify-center border",
                             zone.id === 10 ? "bg-nexus-blue/10 border-nexus-blue/20 text-nexus-blue" :
                             zone.id === 20 ? "bg-nexus-cyan/10 border-nexus-cyan/20 text-nexus-cyan" :
                             "bg-nexus-safe/10 border-nexus-safe/20 text-nexus-safe"
                           )}>
                              <Network size={24} />
                           </div>
                           <div>
                              <div className="text-sm font-black tracking-tight uppercase text-white">{zone.name}</div>
                              <div className="text-[10px] font-mono text-text-muted">{zone.network}</div>
                           </div>
                        </div>
                        <div className="text-right">
                           <div className="text-[10px] font-black text-text-dim uppercase tracking-widest leading-none">Gateway</div>
                           <div className="text-xs font-mono text-nexus-blue mt-1">{zone.gateway}</div>
                        </div>
                     </div>
                     <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
                        {zone.devices.map((dev, idx) => (
                           <div key={idx} className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-nexus-safe/50" />
                              <span className="text-[10px] font-mono text-text-muted truncate">{dev}</span>
                           </div>
                        ))}
                     </div>
                  </motion.div>
               ))}
            </div>
         </div>

         {/* Docker Services Status */}
         <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted px-2">SERVICES & PROTECTION (DOCKER)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <ServiceStatusCard 
                  name={infrastructure.proxy.name} 
                  status={infrastructure.proxy.status} 
                  icon={<Globe size={20} />} 
                  detail={`Port ${infrastructure.proxy.port} / mTLS: ${infrastructure.proxy.mtls}`}
                  id={infrastructure.proxy.id}
               />
               <ServiceStatusCard 
                  name={infrastructure.identity.name} 
                  status={infrastructure.identity.status} 
                  icon={<ScanFace size={20} />} 
                  detail={`Port ${infrastructure.identity.port} / MFA: ACTIVE`}
                  id={infrastructure.identity.id}
               />
               <ServiceStatusCard 
                  name={infrastructure.protection.name} 
                  status={infrastructure.protection.status} 
                  icon={<ShieldAlert size={20} />} 
                  detail="Brute-force protection / IPS"
                  id={infrastructure.protection.id}
                  color="alert"
               />
               <ServiceStatusCard 
                  name={infrastructure.backend.name} 
                  status={infrastructure.backend.status} 
                  icon={<Database size={20} />} 
                  detail={`Internal: ${infrastructure.backend.internalIp}`}
                  id={infrastructure.backend.id}
                  color="safe"
               />
               <ServiceStatusCard 
                  name={infrastructure.firewall.name} 
                  status={infrastructure.firewall.status} 
                  icon={<Power size={20} />} 
                  detail={`IP: ${infrastructure.firewall.ip}`}
                  id={infrastructure.firewall.id}
               />
            </div>

            <div className="nx-card p-8 bg-nexus-alert/5 border-nexus-alert/20 mt-6">
               <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-nexus-alert/20 rounded-xl text-nexus-alert">
                     <Ban size={24} />
                  </div>
                  <div>
                     <h4 className="text-sm font-black uppercase tracking-tight text-white">Fail2Ban / Firewall ACL</h4>
                     <p className="text-[10px] text-text-muted uppercase tracking-widest mt-1">Brute-force & Vulnerability Shield</p>
                  </div>
               </div>
               <div className="space-y-3">
                  <div className="flex justify-between items-center text-[11px]">
                     <span className="text-text-dim">SSH Port (22) Access</span>
                     <span className="text-nexus-alert font-black uppercase">Blocked (ACL)</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                     <span className="text-text-dim">HTTPS Port (443) Access</span>
                     <span className="text-nexus-safe font-black uppercase">Allowed</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                     <span className="text-text-dim">Active Bans</span>
                     <span className="text-white font-mono">{infrastructure.protection.bannedIps?.length || 0} IPs</span>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </motion.div>
  );
}

function FlowStep({ icon, label, color, sub, onMouseEnter, onMouseLeave, highlighted, tooltip }: any) {
   const [isHovered, setIsHovered] = useState(false);

   return (
      <div 
         className="flex flex-col items-center gap-3 relative group/step cursor-pointer min-w-[100px]"
         onMouseEnter={() => {
            setIsHovered(true);
            onMouseEnter?.();
         }}
         onMouseLeave={() => {
            setIsHovered(false);
            onMouseLeave?.();
         }}
      >
         {/* Custom Floating Interactive Tooltip */}
         <AnimatePresence>
            {isHovered && tooltip && (
               <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute bottom-full mb-3 w-64 p-3 bg-neutral-900 border border-white/10 text-white rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-md z-30 font-sans pointer-events-none text-left"
               >
                  <div className={cn("text-[10px] font-black uppercase tracking-wider mb-1", color)}>{label}</div>
                  <div className="text-[10px] text-text-secondary leading-relaxed normal-case">{tooltip}</div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-neutral-900" />
               </motion.div>
            )}
         </AnimatePresence>

         <div className={cn(
            "w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center p-4 transition-all duration-300", 
            color,
            highlighted 
              ? "scale-110 bg-white/10 border-current shadow-[0_0_20px_rgba(255,255,255,0.15)] ring-2 ring-current ring-offset-2 ring-offset-black z-10" 
              : "group-hover/step:scale-105 group-hover/step:border-white/20"
         )}>
            {icon}
         </div>
         <div className="text-center">
            <div className="text-[10px] font-black uppercase tracking-widest text-text-vibrant transition-all duration-300 group-hover/step:text-white">{label}</div>
            {sub && <div className="text-[8px] font-mono text-text-muted mt-1 uppercase leading-none">{sub}</div>}
         </div>
      </div>
   );
}

function FlowArrow({ color, label, highlighted }: any) {
   return (
      <div className={cn("flex-1 flex flex-col items-center gap-2 px-2 transition-all duration-300", highlighted && "scale-y-110")}>
         {label && (
            <span className={cn(
               "text-[8px] font-black uppercase tracking-widest transition-all duration-300", 
               color, 
               highlighted ? "scale-105 opacity-100 text-white font-extrabold drop-shadow-[0_0_4px_currentColor]" : "opacity-60"
            )}>
               {label}
            </span>
         )}
         <div className={cn(
            "w-full transition-all duration-300 relative", 
            highlighted ? "h-[2px] bg-white shadow-[0_0_8px_#fff]" : "h-px bg-white/10"
         )}>
            <motion.div 
               animate={{ left: ['0%', '100%'] }} 
               transition={{ duration: highlighted ? 1.0 : 3, repeat: Infinity, ease: 'linear' }}
               className={cn(
                  "absolute rounded-full transition-all duration-300", 
                  highlighted ? "-top-1 w-2.5 h-2.5 shadow-[0_0_10px_#fff]" : "-top-1 w-2 h-2",
                  color.replace('text-', 'bg-')
               )} 
            />
         </div>
      </div>
   );
}

function ServiceStatusCard({ name, status, icon, detail, id, color = 'info' }: any) {
   const [actionLoading, setActionLoading] = useState(false);
   
   const handleRestart = async () => {
      setActionLoading(true);
      try {
         await axios.post('/api/admin/infra/restart', { componentId: id });
      } finally {
         setTimeout(() => setActionLoading(false), 2000);
      }
   };

   return (
      <div className="nx-card p-5 bg-white/[0.02] border-white/5 flex flex-col justify-between group">
         <div className="flex justify-between items-start mb-4">
            <div className={cn(
              "p-3 rounded-xl border transition-all",
              color === 'info' ? "bg-nexus-blue/10 border-nexus-blue/20 text-nexus-blue" :
              color === 'safe' ? "bg-nexus-safe/10 border-nexus-safe/20 text-nexus-safe" :
              "bg-nexus-alert/10 border-nexus-alert/20 text-nexus-alert"
            )}>
               {icon}
            </div>
            <div className="flex items-center gap-2">
               <div className={cn(
                 "w-2 h-2 rounded-full animate-pulse",
                 status === 'ACTIVE' || status === 'MONITORING' ? "bg-nexus-safe" : "bg-nexus-alert"
               )} />
               <span className="text-[9px] font-black uppercase tracking-widest">{status}</span>
            </div>
         </div>
         <div>
            <div className="text-xs font-black uppercase tracking-tight text-white mb-1 group-hover:text-nexus-blue transition-colors">{name}</div>
            <div className="text-[9px] text-text-muted font-medium mb-4">{detail}</div>
            <button 
               onClick={handleRestart}
               disabled={actionLoading}
               className="w-full py-2 bg-white/5 border border-white/10 rounded group-hover:border-white/20 text-[9px] font-black uppercase text-text-dim hover:text-white transition-all flex items-center justify-center gap-2"
            >
               {actionLoading ? <RefreshCcw size={10} className="animate-spin" /> : <RefreshCcw size={10} />}
               CYCLE SERVICE
            </button>
         </div>
      </div>
   );
}

const Button = ({ className, variant = 'primary', ...props }: any) => {
  const variants = {
    primary: 'bg-accent-info text-white hover:bg-accent-info/90',
    secondary: 'bg-bg-card text-text-primary border border-border-subtle hover:bg-bg-sidebar',
    danger: 'bg-accent-alert text-white hover:bg-accent-alert/90',
    ghost: 'hover:bg-white/5 text-text-secondary hover:text-text-primary'
  };
  return (
    <button 
      className={cn(
        'px-4 py-2 rounded-lg font-semibold transition-all active:scale-95 disabled:opacity-50',
        variants[variant as keyof typeof variants],
        className
      )}
      {...props}
    />
  );
};

const Card = ({ children, className, title, headerAction }: any) => (
  <div className={cn('bg-bg-card rounded-xl border border-border-subtle shadow-lg overflow-hidden flex flex-col', className)}>
    {title && (
      <div className="px-5 py-4 border-b border-border-subtle bg-black/10 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide text-text-primary uppercase">{title}</h3>
        {headerAction && <div>{headerAction}</div>}
      </div>
    )}
    <div className="p-5 flex-1 flex flex-col">{children}</div>
  </div>
);

// --- Auth Context Simulation ---
const UserContext = React.createContext<{user: any, setUser: any, login: any, logout: any, loginWithGoogle: any}>({user: null, setUser: null, login: null, logout: null, loginWithGoogle: null});

export default function App() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Connection test
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        console.log("Firestore connection established.");
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Firestore: Client is offline. Please check your internet connection.");
        } else {
          console.warn("Firestore connection check failed (expected if rules are strict):", error);
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Firebase user detected, but Nexus session is managed by cookies.
        // We logicially sync only on explicit login actions.
      }
    });
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      
      if (firebaseUser) {
        // Synchronize with Nexus ZT backend for session tokens
        await axios.post('/api/auth/firebase-sync', {
          email: firebaseUser.email,
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName
        });
        window.location.reload(); // Refresh to inject backend session
      }
    } catch (err) {
      console.error("Google Login Error:", err);
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (e) {
      console.warn("API logout failed, proceeding with Firebase logout");
    }
    await signOut(auth);
    localStorage.removeItem('nexus_guest_session');
    setUser(null);
  };

  const [view, setView] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState<any | null>(null);

  useEffect(() => {
    (window as any).setGlobalView = setView;
    (window as any).setGlobalVideo = setActiveVideo;
  }, []);

  useEffect(() => {
    const savedVideo = localStorage.getItem('nexus_active_video');
    if (savedVideo) {
      try {
        setActiveVideo(JSON.parse(savedVideo));
      } catch (e) {
        localStorage.removeItem('nexus_active_video');
      }
    }
  }, []);

  useEffect(() => {
    if (activeVideo) {
      localStorage.setItem('nexus_active_video', JSON.stringify(activeVideo));
    } else {
      localStorage.removeItem('nexus_active_video');
    }
  }, [activeVideo]);

  useEffect(() => {
    const handleUnauth = () => {
      logout();
    };
    window.addEventListener('unauthorized', handleUnauth);
    return () => window.removeEventListener('unauthorized', handleUnauth);
  }, []);

  useEffect(() => {
    if (user && user.tenantId) {
      axios.defaults.headers.common['x-tenant-id'] = user.tenantId;
    } else {
      delete axios.defaults.headers.common['x-tenant-id'];
    }
  }, [user]);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      // Check for standalone demo mode
      if (localStorage.getItem('nexus_demo_mode') === 'true') {
        setUser({
          id: 'usr_local_admin',
          email: 'local_admin@nexus.zt',
          displayName: 'Nexus Administrator (Demo)',
          role: 'ADMIN',
          tenantId: 'nexus_local_enclave'
        });
        setLoading(false);
        return;
      }

      // Check for URL-based demo bypass
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('demo') === 'true') {
        try {
          await axios.post('/api/auth/guest', {}, { headers: { 'x-access-level': 'LOCAL' } });
          localStorage.setItem('nexus_guest_session', 'true');
          window.location.href = window.location.pathname; // Clear query params
          return;
        } catch (e) {
          console.error("Demo bypass failed", e);
        }
      }

      try {
        const res = await axios.get('/api/auth/me');
        if (res.data.user) {
          setUser(res.data.user);
        } else {
          // Auto-bypass for simple access requested by user
          throw new Error('No user, falling back to auto-auth');
        }
      } catch (e: any) {
        // Automatically enable a bypass session for the user
        setUser({
          id: 'usr_oussama',
          tenantId: 'tnt_001',
          email: 'alayaoussama97@gmail.com',
          displayName: 'Nexus Operator',
          role: 'ADMIN'
        });
        localStorage.setItem('nexus_demo_mode', 'true');
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const login = async (email: string, pass: string, otp: string) => {
    try {
      const res = await axios.post('/api/auth/login', { email, password: pass, otp });
      setUser(res.data.user);
      return true;
    } catch (e) {
      return false;
    }
  };

  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-bg-main"><RefreshCcw className="animate-spin text-accent-info" /></div>;
  if (!user) return <LoginView />;

  return (
    <UserContext.Provider value={{ user, setUser, login, logout, loginWithGoogle }}>
      <div className="flex h-screen bg-bg-base text-text-vibrant overflow-hidden relative font-sans">
        {/* Background Mesh */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(14,165,233,0.05)_0%,transparent_50%)] pointer-events-none z-0" />
        
        <Sidebar currentView={view} setView={setView} onLogout={logout} />
        
        <main className="flex-1 flex flex-col relative overflow-hidden">
          {/* Header */}
          <header className="h-20 border-b border-border-dim bg-bg-base/50 backdrop-blur-xl flex items-center justify-between px-10 z-40">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                 <div className="w-2.5 h-2.5 rounded-full bg-nexus-safe shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                 <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">Système Nominal</span>
              </div>
              <div className="h-4 w-px bg-white/10" />
              <div className="flex items-center gap-4 text-xs font-medium text-text-dim">
                <span className="flex items-center gap-1.5"><Globe size={14} className="text-nexus-blue" /> Cloud Enclave</span>
                <span className="flex items-center gap-1.5"><Database size={14} className="text-nexus-cyan" /> Secure DB Link</span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 pr-6 border-r border-white/5">
                <div className="text-right">
                  <div className="text-xs font-bold">{user.email?.split('@')[0]}</div>
                  <div className="text-[10px] text-text-muted uppercase tracking-widest font-mono">FR-DATA-CENTER</div>
                </div>
                <div className="w-10 h-10 rounded-full border border-nexus-blue/30 bg-nexus-blue/10 flex items-center justify-center text-nexus-blue">
                   <User size={20} />
                </div>
              </div>
              
              <button className="nx-btn-ghost p-2 rounded-full relative">
                 <ShieldAlert size={20} className="text-text-muted" />
                 <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-nexus-alert rounded-full border-2 border-bg-base" />
              </button>
            </div>
          </header>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
            <div className="p-10 max-w-[1600px] mx-auto">
              <AnimatePresence mode="wait">
                {view === 'overview' && <OverviewView key="overview" />}
                {view === 'soc' && <SOCView key="soc" />}
                {view === 'wazuh' && (user.role === 'ADMIN' || user.role === 'SOC' ? <WazuhSIEM key="wazuh" /> : <AccessDeniedView />)}
                {view === 'vmlab' && (user.role === 'ADMIN' || user.role === 'SOC' ? <VirtualLabView key="vmlab" /> : <AccessDeniedView />)}
                {view === 'network' && <NetworkDashboardView key="network" />}
                {view === 'war-room' && (user.role === 'ADMIN' || user.role === 'SOC' ? <AttackSimulatorView key="war-room" /> : <AccessDeniedView />)}
                {view === 'architecture' && <CiscoArchitectureView key="architecture" />}
                {view === 'network-scan' && (user.role === 'ADMIN' || user.role === 'SOC' ? <SecurityScannerView key="network-scan" /> : <AccessDeniedView />)}
                {view === 'logs-analysis' && (user.role === 'ADMIN' || user.role === 'SOC' ? <LogAnalysisView key="logs-analysis" /> : <AccessDeniedView />)}
                {view === 'kali' && (user.role === 'ADMIN' || user.role === 'SOC' ? <KaliView key="kali" /> : <AccessDeniedView />)}
                {view === 'ai-engine' && (user.role === 'ADMIN' || user.role === 'SOC' || user.role === 'USER' ? <AIIntelligenceView key="ai-engine" /> : <AccessDeniedView />)}
                {view === 'iam' && (user.role === 'ADMIN' || user.role === 'SOC' || user.role === 'USER' ? <IAMView key="iam" /> : <AccessDeniedView />)}
                {view === 'vault' && (user.role === 'ADMIN' ? <VaultView key="vault" /> : <AccessDeniedView />)}
                {view === 'media' && <VideoModule key="media" activeVideo={activeVideo} setActiveVideo={setActiveVideo} />}
                {/* Fallbacks or other views can be added here */}
              </AnimatePresence>
            </div>
          </div>
        </main>
        
        {/* Floating Components */}
        <FloatingNexusGuard />
      </div>
    </UserContext.Provider>
  );
}

function FloatingNexusGuard() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages as any);
    setInput('');
    setLoading(true);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: text,
        config: {
          systemInstruction: "You are the Nexus Autonomous Security Guard. You provide real-time advice to the operator. Be extremely concise, use security jargon, and emphasize Zero Trust principles. If asked about the system, assume you have full visibility into the SOC dashboard, the AI Intelligence engine, and the Global Threat Intelligence feed (CVEs and threat groups).",
        }
      });
      setMessages([...newMessages, { role: 'assistant', content: response.text || "Operational error." }] as any);
    } catch (e) {
      setMessages([...newMessages, { role: 'assistant', content: "Backend link severed." }] as any);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-80 h-[450px] bg-bg-card/90 backdrop-blur-xl border border-accent-info/30 rounded-3xl shadow-2xl shadow-accent-info/20 mb-4 flex flex-col overflow-hidden"
          >
            <div className="p-4 bg-accent-info/10 border-b border-white/5 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent-info rounded-full">
                     <Shield size={16} className="text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold uppercase tracking-widest text-text-primary">Nexus AI Guard</div>
                    <div className="text-[10px] text-accent-safe font-mono flex items-center gap-1">
                       <div className="w-1.5 h-1.5 rounded-full bg-accent-safe animate-pulse" />
                       AUTONOMOUS_MODE
                    </div>
                  </div>
               </div>
               <button onClick={() => setIsOpen(false)} className="text-text-secondary hover:text-white">
                 <Plus className="rotate-45" size={20} />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
               {messages.length === 0 && (
                 <div className="p-4 text-center">
                    <p className="text-[10px] text-text-secondary uppercase tracking-[0.2em] mb-4">Initial Handshake Complete</p>
                    <div className="space-y-2">
                       {["Status report?", "Latest global threats?", "Zero Trust help"].map(q => (
                         <button 
                          key={q} 
                          onClick={() => sendMessage(q)}
                          className="w-full p-2 text-[10px] font-bold bg-white/5 border border-white/10 rounded-lg hover:border-accent-info/30 transition-all"
                         >
                           {q}
                         </button>
                       ))}
                    </div>
                 </div>
               )}
               {messages.map((m, i) => (
                 <div key={i} className={cn(
                   "p-3 rounded-2xl text-[11px] leading-relaxed",
                   m.role === 'user' ? "bg-accent-info/20 ml-6 border border-accent-info/30 text-right" : "bg-bg-sidebar/50 mr-6 border border-white/10"
                 )}>
                   {m.content}
                 </div>
               ))}
               {loading && (
                 <div className="text-[10px] text-accent-info animate-pulse px-2 font-mono">Analyzing vectors...</div>
               )}
            </div>

            <div className="p-3 border-t border-white/5 flex gap-2">
               <input 
                 type="text" 
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
                 placeholder="Command..."
                 className="flex-1 bg-bg-sidebar border border-white/10 rounded-full px-4 py-2 text-[11px] focus:outline-none focus:border-accent-info"
               />
               <button 
                 onClick={() => sendMessage(input)}
                 disabled={loading || !input.trim()}
                 className="p-2 bg-accent-info rounded-full text-white disabled:opacity-50"
               >
                 <Send size={16} />
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button 
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "size-14 rounded-full flex items-center justify-center shadow-xl shadow-accent-info/30 border-2 transition-all duration-500",
          isOpen ? 'bg-bg-card border-accent-info rotate-90' : 'bg-accent-info border-white/20'
        )}
      >
        <Sparkles className={cn("transition-colors", isOpen ? 'text-accent-info' : 'text-white')} />
      </motion.button>
    </div>
  );
}

// --- View Components ---

function LoginView() {
  const { login, loginWithGoogle } = React.useContext(UserContext);
  const [email, setEmail] = useState('alayaoussama97@gmail.com');
  const [pass, setPass] = useState('admin123');
  const [otp, setOtp] = useState('123456');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mode, setMode] = useState<'password' | 'magic' | 'faceid' | 'passkey' | 'qrcode'>('password');
  const [simulatedGeoRisk, setSimulatedGeoRisk] = useState(0);
  const [faceIdRequested, setFaceIdRequested] = useState(false);
  const [qrRequested, setQrRequested] = useState(false);
  const [accessLevel, setAccessLevel] = useState<'PUBLIC' | 'LOCAL'>('PUBLIC');

  const handleInstantBypass = async () => {
    setLoading(true);
    setError('');
    try {
      await axios.post('/api/auth/guest', {}, {
        headers: { 'x-access-level': 'LOCAL' }
      });
      localStorage.setItem('nexus_guest_session', 'true');
      window.location.reload();
    } catch (e: any) {
      console.warn("Server-side activation failed, using client-side fallback.");
      localStorage.setItem('nexus_demo_mode', 'true');
      localStorage.setItem('nexus_guest_session', 'true');
      window.location.reload();
    }
  };

  const handleGuestLogin = async (level: 'PUBLIC' | 'LOCAL') => {
    setLoading(true);
    setAiAnalyzing(true);
    setError('');
    await new Promise(r => setTimeout(r, 1000));
    try {
      await axios.post('/api/auth/guest', {}, {
        headers: { 'x-access-level': level }
      });
      localStorage.setItem('nexus_guest_session', 'true');
      window.location.reload();
    } catch (e: any) {
      setError('ÉCHEC DE CONNEXION LOCALE');
      setAiAnalyzing(false);
      setLoading(false);
    }
  };

  const handleFaceIdRequest = async () => {
    setLoading(true);
    setAiAnalyzing(true);
    setError('');
    await new Promise(r => setTimeout(r, 1000));
    setAiAnalyzing(false);
    setFaceIdRequested(true);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAiAnalyzing(true);
    setError('');
    
    await new Promise(r => setTimeout(r, 1500));
    
    try {
      let res;
      if (accessLevel === 'PUBLIC' || accessLevel === 'LOCAL') {
        res = await axios.post('/api/auth/guest', {}, {
          headers: { 'x-access-level': accessLevel }
        });
        localStorage.setItem('nexus_guest_session', 'true');
      } else {
        res = await axios.post('/api/auth/login', { 
          email: email.trim(), 
          password: pass.trim(), 
          otp: otp.trim(),
          deviceFingerprint: 'nexus_desktop_trusted',
          geoRiskSimulation: simulatedGeoRisk
        });
      }
      
      setAiAnalyzing(false);
      
      if (res.data.mfaRequired) {
        setMfaRequired(true);
      } else {
        window.location.reload();
      }
    } catch (e: any) {
      setAiAnalyzing(false);
      setError(e.response?.data?.error || 'ACCÈS REFUSÉ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-bg-base relative overflow-hidden font-sans">
      {/* Immersive Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(14,165,233,0.1),transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(40%_40%_at_50%_0%,rgba(14,165,233,0.05)_0%,transparent_100%)]" />
      </div>

      {/* Floating Meta Details */}
      <div className="absolute top-10 left-10 hidden lg:block space-y-2 opacity-50 z-20">
         <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-nexus-blue animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Secure Gateway Active</span>
         </div>
         <div className="font-mono text-[8px] text-text-muted">NODE: FR-PAR-CLUSTER-09 // VER: 4.2.0-STABLE</div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-5xl flex flex-col lg:flex-row gap-6 p-0.5 relative z-10 mx-6"
      >
        {/* Left Side: Dashboard Stats */}
        <div className="hidden lg:flex flex-col gap-6 w-80 shrink-0">
           <div className="nx-card p-6 bg-white/[0.02] backdrop-blur-xl border-white/5 space-y-6">
              <div className="flex items-center justify-between">
                 <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">System Status</h4>
                 <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-nexus-safe animate-pulse" />
                    <span className="text-[8px] font-bold text-nexus-safe uppercase">Global Live</span>
                 </div>
              </div>
              
              <div className="space-y-4">
                 {[
                   { label: 'Threat Level', val: 'Low', color: 'text-nexus-safe', icon: <ShieldCheck size={14} /> },
                   { label: 'Traffic Load', val: '1.2 GB/s', color: 'text-nexus-cyan', icon: <Activity size={14} /> },
                   { label: 'Active Nodes', val: '1,024', color: 'text-white', icon: <Server size={14} /> },
                   { label: 'Latency', val: '12ms', color: 'text-nexus-blue', icon: <Zap size={14} /> }
                 ].map((stat, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white/[0.03] rounded-xl border border-white/5">
                       <div className="flex items-center gap-3">
                          <div className={cn("opacity-40", stat.color)}>{stat.icon}</div>
                          <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">{stat.label}</span>
                       </div>
                       <span className={cn("text-[10px] font-black", stat.color)}>{stat.val}</span>
                    </div>
                 ))}
              </div>

              <div className="pt-4 border-t border-white/5">
                 <div className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-3 px-1">Network Identity Map</div>
                 <div className="grid grid-cols-5 gap-1.5">
                    {Array.from({ length: 15 }).map((_, i) => (
                       <div key={i} className={cn(
                          "h-1 rounded-full transition-all duration-1000",
                          Math.random() > 0.7 ? "bg-nexus-blue w-full" : "bg-white/10 w-2/3"
                       )} />
                    ))}
                 </div>
              </div>
           </div>

           <div className="nx-card p-6 bg-nexus-blue/5 border-nexus-blue/20">
              <div className="flex items-center gap-3 mb-4">
                 <div className="p-2 rounded-lg bg-nexus-blue/20 text-nexus-blue">
                    <Info size={14} />
                 </div>
                 <div className="text-[9px] font-black text-nexus-blue uppercase tracking-widest">Security Dispatch</div>
              </div>
              <p className="text-[10px] text-text-muted leading-relaxed font-medium">
                 Toute tentative de connexion non autorisée sera tracée via l'empreinte sécurisée de l'utilisateur. 
                 <span className="text-white block mt-2">Accès restreint aux shards de production.</span>
              </p>
           </div>
        </div>

        {/* Right Side: Login Form (Existing Card Content) */}
        <div className="flex-1 nx-card bg-white/[0.02] border-white/5 relative shadow-[0_50px_100px_rgba(0,0,0,0.8)] backdrop-blur-xl rounded-[calc(var(--radius-2xl)-1px)] overflow-hidden">
          <div className="bg-bg-surface p-12 lg:p-16">
            <div className="flex flex-col items-center mb-12 text-center">
              <motion.div 
                 whileHover={{ rotate: 180, scale: 1.1 }}
                 transition={{ duration: 0.5 }}
                 className="w-20 h-20 bg-nexus-blue/10 border border-nexus-blue/20 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-nexus-blue/10"
              >
                <Shield className="w-10 h-10 text-nexus-blue" />
              </motion.div>
              <h2 className="text-3xl font-black tracking-tighter text-text-vibrant mb-3 uppercase">Verification <span className="text-nexus-blue">ZT</span></h2>
              <p className="text-text-dim text-sm max-w-xs font-medium">Entrez dans l'enclave sécurisée Nexus Zero Trust.</p>
              
              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleGuestLogin('LOCAL')}
                  className="px-6 py-3 bg-nexus-blue/10 border border-nexus-blue/20 rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] text-nexus-blue hover:bg-nexus-blue/20 transition-all flex items-center justify-center gap-2 group flex-1"
                >
                  <ShieldCheck size={16} className="group-hover:animate-pulse" />
                  Vérification
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleInstantBypass}
                  className="px-8 py-4 bg-nexus-safe text-black rounded-2xl text-[11px] font-black uppercase tracking-[0.4em] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all flex items-center justify-center gap-3 group flex-1 ring-4 ring-nexus-safe/10"
                >
                  <Zap size={18} className="fill-current" />
                  Activer Maintenant
                </motion.button>
              </div>
              <p className="mt-4 text-[9px] font-black uppercase tracking-[0.2em] text-text-muted">Ou connectez-vous avec vos identifiants sécurisés</p>
              <div className="mt-6 p-3 rounded-xl bg-nexus-safe/5 border border-nexus-safe/10 flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-nexus-safe animate-pulse" />
                 <span className="text-[10px] font-bold text-nexus-safe/80 uppercase tracking-widest">Shard d'activation prêt</span>
              </div>
            </div>

          {/* Access Level Selector */}
          <div className="flex gap-4 mb-8">
             <button
               onClick={() => setAccessLevel('PUBLIC')}
               className={cn(
                 "flex-1 p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 group",
                 accessLevel === 'PUBLIC'
                   ? 'bg-nexus-cyan/10 border-nexus-cyan/30 text-nexus-cyan shadow-[0_0_20px_rgba(34,211,238,0.1)]'
                   : 'bg-white/[0.02] border-white/5 text-text-muted hover:border-white/10'
               )}
             >
                <Globe size={18} className={cn("transition-transform group-hover:scale-110", accessLevel === 'PUBLIC' ? 'animate-pulse' : '')} />
                <span className="text-[10px] font-black uppercase tracking-widest">Accès Public</span>
             </button>
             <button
               onClick={() => setAccessLevel('LOCAL')}
               className={cn(
                 "flex-1 p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 group",
                 accessLevel === 'LOCAL'
                   ? 'bg-nexus-blue/10 border-nexus-blue/30 text-nexus-blue shadow-[0_0_20px_rgba(14,165,233,0.1)]'
                   : 'bg-white/[0.02] border-white/5 text-text-muted hover:border-white/10'
               )}
             >
                <ShieldCheck size={18} className="transition-transform group-hover:scale-110" />
                <span className="text-[10px] font-black uppercase tracking-widest">Accès Local</span>
             </button>
          </div>

          <div className="flex gap-1 p-1 bg-white/[0.02] border border-white/5 rounded-2xl mb-10 overflow-x-auto no-scrollbar relative">
             {[
               { id: 'password', label: 'Identity', icon: <Lock size={14} />, activeColor: 'nexus-blue' },
               { id: 'magic', label: 'Magic', icon: <Send size={14} />, activeColor: 'nexus-cyan' }
             ].map(m => (
               <button
                 key={m.id}
                 onClick={() => setMode(m.id as any)}
                 className={cn(
                   "flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap relative group",
                   mode === m.id ? 'text-white' : 'text-text-muted hover:text-text-dim active:scale-95'
                 )}
               >
                 {mode === m.id && (
                    <motion.div 
                      layoutId="activeTabBg" 
                      className={cn("absolute inset-0 rounded-xl shadow-xl", 
                        m.id === 'password' ? "bg-nexus-blue/20 border border-nexus-blue/30" : "bg-white/5 border border-white/10"
                      )} 
                    />
                 )}
                 <div className="relative z-10 flex items-center gap-2">
                    {m.icon}
                    <span className="hidden sm:inline">{m.label}</span>
                 </div>
               </button>
             ))}
          </div>

          <div className="space-y-6">
            {mode === 'password' && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-5">
                   <div className="space-y-2">
                     <div className="flex justify-between items-center px-1">
                        <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest leading-none">Master Identity</label>
                        <span className="text-[8px] font-mono text-nexus-blue">V-SENS-ENABLED</span>
                     </div>
                     <input 
                       type="text" 
                       value={email}
                       onChange={(e) => setEmail(e.target.value)}
                       disabled={mfaRequired}
                       className="w-full nx-input"
                       placeholder="votre@id.nexus"
                     />
                   </div>

                   {!mfaRequired ? (
                     <div className="space-y-2">
                       <div className="flex justify-between items-center px-1">
                        <label className="block text-[10px] font-bold text-text-dim uppercase tracking-widest leading-none">Security Key</label>
                        {accessLevel === 'LOCAL' && <span className="text-[8px] font-mono text-nexus-blue animate-pulse tracking-widest uppercase">Key: oussema</span>}
                      </div>
                       <input 
                         type="password" 
                         value={pass}
                         onChange={(e) => setPass(e.target.value)}
                         className="w-full nx-input"
                         placeholder="••••••••••••"
                       />
                     </div>
                   ) : (
                     <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-2">
                       <label className="block text-[10px] font-bold text-nexus-blue uppercase tracking-widest ml-1">MFA Adaptive Challenge</label>
                       <input 
                         type="text" 
                         autoFocus
                         value={otp}
                         onChange={(e) => setOtp(e.target.value)}
                         className="w-full nx-input text-center text-xl tracking-[1em] font-black focus:border-nexus-blue"
                       />
                     </motion.div>
                   )}
                </div>

                {error && (
                   <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="p-4 bg-nexus-alert/10 border border-nexus-alert/20 rounded-2xl text-nexus-alert text-[10px] font-bold text-center uppercase tracking-widest">
                      {error}
                   </motion.div>
                )}

                <button 
                   className="nx-btn-primary w-full py-5 text-[11px] font-black uppercase tracking-[0.2em] relative overflow-hidden group"
                   disabled={loading}
                >
                  <div className="absolute inset-0 bg-nexus-blue opacity-0 group-hover:opacity-10 transition-opacity" />
                  <div className="relative flex items-center justify-center gap-3">
                     {loading ? (
                        <>
                           <Loader2 className="animate-spin" size={18} />
                           <span>{accessLevel === 'PUBLIC' ? 'INITIALIZING_GUEST_SESSION...' : 'VERIFYING_IDENTITY_SHARD...'}</span>
                        </>
                     ) : (
                        <>
                           {accessLevel === 'PUBLIC' ? <Globe size={18} className="group-hover:scale-110 transition-transform" /> : <ShieldCheck size={18} className="group-hover:scale-110 transition-transform" />}
                           <span>{accessLevel === 'PUBLIC' ? 'ACCÉDER À L\'APPLICATION (PUBLIC)' : 'ACCÉDER À L\'APPLICATION (LOCAL)'}</span>
                        </>
                     )}
                  </div>
                </button>
              </form>
            )}


            {mode === 'magic' && (
               <div className="text-center py-10 space-y-6">
                  <div className="w-16 h-16 bg-white/5 border border-white/5 rounded-full flex items-center justify-center mx-auto text-text-dim">
                     <Send size={24} />
                  </div>
                  <div className="space-y-2">
                     <h3 className="font-bold text-text-vibrant capitalize">Magic Link Enrollment</h3>
                     <p className="text-xs text-text-muted max-w-[240px] mx-auto leading-relaxed">Protocole de confiance adaptatif en cours d'initialisation. Veuillez patienter.</p>
                  </div>
                  <button onClick={() => setMode('password')} className="nx-btn-ghost text-xs">Retour vers l'identifiant maître</button>
               </div>
            )}

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
              <div className="relative flex justify-center text-[8px] uppercase tracking-[0.4em] font-black"><span className="bg-bg-surface px-6 text-text-muted">Connexion Alternative</span></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <button onClick={loginWithGoogle} className="nx-btn-ghost bg-white/[0.03] border border-white/5 hover:border-nexus-blue/20 flex items-center justify-center gap-3 py-4">
                  <img src="https://www.google.com/favicon.ico" alt="G" className="w-4 h-4 grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
                  <span className="text-[10px] font-extrabold uppercase tracking-widest">Google ZT</span>
               </button>
               <button 
                  onClick={() => handleGuestLogin('LOCAL')}
                  className="nx-btn-ghost bg-white/[0.03] border border-white/5 hover:border-nexus-safe/20 flex items-center justify-center gap-3 py-4 text-text-dim"
               >
                  <ShieldCheck size={16} className="text-nexus-safe" />
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-nexus-safe">Accès Local / Public</span>
               </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>

      {/* Background Decor */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-nexus-blue/5 rounded-full pointer-events-none animate-pulse-soft" />
    </div>
  );
}

function AccessDeniedView() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center h-full space-y-6 text-center"
    >
      <div className="p-6 bg-accent-alert/10 rounded-full border border-accent-alert/20 text-accent-alert">
         <ShieldAlert size={64} />
      </div>
      <div className="space-y-2">
         <h2 className="text-3xl font-black uppercase tracking-tighter">Access Denied</h2>
         <p className="text-text-secondary max-w-sm mx-auto">
            Your identity carries insufficient clearance level for this sector. 
            Nexus-AI has restricted entry.
         </p>
      </div>
      <div className="flex gap-4">
         <div className="status-pill border-accent-alert/30 text-accent-alert">PERMISSION_DENIED</div>
         <div className="status-pill border-accent-alert/30 text-accent-alert">SECLEVEL: 0</div>
      </div>
    </motion.div>
  );
}

function OverviewView() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const res = await axios.get('/api/admin/metrics');
      setMetrics(res.data);
    };
    fetch();
    const interval = setInterval(fetch, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!metrics) return null;

  return (
    <div className="space-y-8 relative">
       {/* Background Decoration */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accent-info/5 rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="flex justify-between items-end relative z-10 px-2">
          <div>
            <div className="flex items-center gap-3 mb-4">
               <span className="px-2 py-1 bg-nexus-blue/10 text-nexus-blue text-[10px] font-bold tracking-widest rounded border border-nexus-blue/20 uppercase">Core Dashboard</span>
               <div className="w-1 h-1 rounded-full bg-white/20" />
               <span className="text-[10px] text-text-muted font-medium uppercase tracking-[0.2em]">Operational Intelligence</span>
            </div>
            <h1 className="text-6xl font-black tracking-tight leading-[1.1]">
              Security <span className="text-nexus-blue">Nexus</span>
            </h1>
            <p className="text-text-secondary mt-2 max-w-xl text-xs leading-relaxed font-medium">
              Global Zero Trust Orchestration Dashboard. AI-driven identity verification and real-time infrastructure defense.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className={cn(
              "nx-glass px-5 py-2 rounded-full border flex items-center gap-3 transition-all",
              metrics.systemStatus === 'HEALTHY' 
                ? "border-nexus-safe/30 text-nexus-safe" 
                : "border-nexus-alert/30 text-nexus-alert"
            )}>
              <div className={cn("w-2 h-2 rounded-full", metrics.systemStatus === 'HEALTHY' ? "bg-nexus-safe shadow-[0_0_12px_#10b981]" : "bg-nexus-alert shadow-[0_0_12px_#ef4444]")} />
              <span className="text-[10px] font-black uppercase tracking-widest leading-none">Status: {metrics.systemStatus}</span>
            </div>
            <div className="text-[10px] font-mono text-text-muted bg-white/5 px-3 py-1 rounded border border-white/5 tracking-tighter">
              NODAL_UPTIME: {Math.floor(metrics.uptime / 3600)}h {Math.floor((metrics.uptime % 3600) / 60)}m
            </div>
          </div>
       </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
        <StatCard title="Active Enclaves" value={(metrics.activeUsers ?? 0) + 12} icon={<Network />} delay={0.1} />
        <StatCard title="Identity Verify" value={metrics.devicesActive ?? 0} icon={<Fingerprint />} color="safe" delay={0.2} />
        <StatCard title="Risk Threshold" value={`${metrics.riskScore ?? 0}%`} icon={<ShieldAlert />} color={(metrics.riskScore ?? 0) > 20 ? 'warn' : 'info'} delay={0.3} />
        <StatCard title="Packets Blocked" value={(metrics.threatsBlocked ?? 0).toLocaleString()} icon={<Activity />} color="danger" delay={0.4} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="nx-card p-10">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-text-secondary mb-8 flex items-center gap-3">
               <Shield size={16} className="text-nexus-blue" />
               Zero Trust Traffic Flow
            </h3>
            <div className="p-10 bg-black/40 rounded-2xl border border-white/5 space-y-16 relative overflow-hidden">
               {/* Grid deco */}
               <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

               <div className="flex items-center justify-between relative z-10">
                  <div className="flex flex-col items-center gap-5 group">
                     <div className="w-20 h-20 bg-nexus-blue/10 border-2 border-nexus-blue/20 rounded-3xl flex items-center justify-center text-nexus-blue group-hover:bg-nexus-blue group-hover:text-black transition-all duration-500 shadow-xl shadow-nexus-blue/5">
                        <Smartphone size={36} />
                     </div>
                     <span className="text-[10px] uppercase font-black tracking-widest text-text-muted">Origin Node</span>
                  </div>

                  <div className="flex-1 flex flex-col items-center gap-3 px-12">
                     <div className="text-[9px] font-mono text-nexus-blue/60 tracking-widest">MTLS_ESTABLISH (AES-256)</div>
                     <div className="w-full h-[2px] bg-white/5 relative">
                        <motion.div 
                          animate={{ left: ['0%', '100%'], opacity: [0, 1, 0] }} 
                          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                          className="absolute -top-1 w-3 h-3 bg-nexus-blue rounded-full shadow-[0_0_15px_#0ea5e9]"
                        />
                     </div>
                  </div>

                  <div className="flex flex-col items-center gap-5 group">
                     <div className="w-24 h-24 bg-nexus-safe/10 border-2 border-nexus-safe/20 rounded-full flex items-center justify-center text-nexus-safe group-hover:scale-110 transition-all duration-700 shadow-xl shadow-nexus-safe/5">
                        <Shield className="w-12 h-12" />
                     </div>
                     <span className="text-[10px] uppercase font-black tracking-widest text-text-muted">Gateway Control</span>
                  </div>

                  <div className="flex-1 flex flex-col items-center gap-3 px-12">
                     <div className="text-[9px] font-mono text-nexus-cyan/60 tracking-widest">AUTH_TOKEN_JWT (OIDC)</div>
                     <div className="w-full h-[2px] bg-white/5 relative">
                        <motion.div 
                          animate={{ left: ['100%', '0%'], opacity: [0, 1, 0] }} 
                          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                          className="absolute -top-1 w-3 h-3 bg-nexus-cyan rounded-full shadow-[0_0_15px_#06b6d4]"
                        />
                     </div>
                  </div>

                  <div className="flex flex-col items-center gap-5 group">
                     <div className="w-20 h-20 bg-nexus-alert/10 border-2 border-nexus-alert/20 rounded-3xl flex items-center justify-center text-nexus-alert group-hover:rotate-12 transition-all">
                        <Server size={36} />
                     </div>
                     <span className="text-[10px] uppercase font-black tracking-widest text-text-muted">Target Asset</span>
                  </div>
               </div>

               <div className="grid grid-cols-4 gap-8 pt-12 border-t border-white/5">
                  {[
                    { label: 'IDENTIFY', desc: 'Secure Handshake & Fingerprinting' },
                    { label: 'VERIFY', desc: 'Contextual Multi-Factor Identity' },
                    { label: 'ANALYZE', desc: 'Real-time Vector Probability Matrix' },
                    { label: 'ENFORCE', desc: 'Dynamic RBAC Provisioning Logic' },
                  ].map((step, i) => (
                    <div key={i} className="space-y-3 group cursor-default">
                       <div className="text-[11px] font-black tracking-tighter text-text-vibrant flex flex-col gap-2">
                          <span className="text-nexus-blue/50 font-mono text-[10px]">VER_0{i+1}</span>
                          {step.label}
                       </div>
                       <p className="text-[10px] text-text-muted leading-relaxed group-hover:text-text-dim transition-colors">{step.desc}</p>
                    </div>
                  ))}
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="nx-card p-10">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted mb-6 flex items-center gap-2">
                  <Zap size={14} className="text-nexus-cyan" />
                  Live Handshake Stream
                </h3>
                <div className="min-h-[200px] bg-black/20 rounded-xl overflow-hidden border border-white/5">
                  <div className="p-4 space-y-1">
                     <SecurityLogList limit={6} />
                  </div>
                </div>
             </div>
             <div className="nx-card p-10">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted mb-6 flex items-center gap-2">
                  <Activity size={14} className="text-nexus-blue" />
                  Protection Matrix
                </h3>
                <div className="space-y-4">
                   {[
                     { l: 'Identity Gateway', s: 'OPTIMAL', c: 'nexus-safe' },
                     { l: 'Threat Analytics', s: 'SYNCING', c: 'nexus-blue' },
                     { l: 'SIEM Relay', s: 'UPDATING', c: 'nexus-cyan' },
                     { l: 'Policy Enforcer', s: 'ACTIVE', c: 'nexus-safe' },
                   ].map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-colors">
                      <span className="text-[11px] font-bold tracking-tight">{item.l}</span>
                      <div className="flex items-center gap-2">
                         <div className={`w-1 h-1 rounded-full bg-${item.c}`} />
                         <span className={`text-[9px] font-mono font-black text-${item.c}`}>{item.s}</span>
                      </div>
                    </div>
                   ))}
                </div>
             </div>
          </div>
        </div>

        <div className="space-y-8">
           <div className="nx-card p-10 bg-nexus-blue/10 border-nexus-blue/20 shadow-2xl shadow-nexus-blue/10">
              <div className="space-y-8">
                 <div className="flex items-center gap-4">
                    <div className="p-4 bg-nexus-blue/20 rounded-2xl">
                       <Lock className="text-nexus-blue" size={24} />
                    </div>
                    <div>
                       <h4 className="text-base font-black tracking-tight text-white">Strict Shield Active</h4>
                       <p className="text-[10px] text-nexus-blue/70 font-bold uppercase tracking-widest mt-1">Global Zero Trust Profile</p>
                    </div>
                 </div>
                 
                 <div className="space-y-4">
                    <div className="text-[10px] font-black uppercase text-text-muted tracking-widest border-b border-white/5 pb-3">Active Policy Vectors</div>
                    {[
                      { l: 'mTLS Handshake', s: 'ENFORCED' },
                      { l: 'Geo-Cluster Sync', s: 'SYNCED' },
                      { l: 'Adaptive MFA', s: 'ON-DEMAND' },
                      { l: 'Agent Heartbeat', s: 'STABLE' },
                    ].map((c, i) => (
                      <div key={i} className="flex justify-between items-center px-2">
                         <span className="text-[11px] text-text-dim font-medium">{c.l}</span>
                         <span className="text-[10px] font-black text-nexus-blue tracking-tighter">{c.s}</span>
                      </div>
                    ))}
                 </div>

                 <button className="nx-btn-primary w-full py-4 text-[11px]">
                    Modify Access Policy
                 </button>
              </div>
           </div>

           <div className="nx-card p-10 bg-black/5 border-white/5">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted mb-6">Cloud Infrastructure</h3>
               <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 group hover:border-nexus-blue/30 transition-all cursor-pointer" onClick={() => (window as any).setGlobalView('vmlab')}>
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-nexus-blue/10 rounded-lg text-nexus-blue">
                           <Server size={14} />
                        </div>
                        <div>
                           <div className="text-[10px] font-bold uppercase">Ubuntu Internal</div>
                           <div className="text-[8px] text-text-dim">OS: Ubuntu 22.04 LTS</div>
                        </div>
                     </div>
                     <div className="flex items-center gap-2">
                       <div className="w-1.5 h-1.5 bg-nexus-safe rounded-full shadow-[0_0_8px_#10b981]" />
                       <span className="text-[8px] font-bold text-nexus-safe uppercase">Stable</span>
                     </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group hover:border-accent-alert/30 transition-all cursor-pointer" onClick={() => (window as any).setGlobalView('vmlab')}>
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-accent-alert/10 rounded-lg text-accent-alert">
                           <Skull size={14} />
                        </div>
                        <div>
                           <div className="text-[10px] font-bold uppercase">Kali Offensive</div>
                           <div className="text-[8px] text-text-secondary">OS: Kali Rolling 2024.1</div>
                         </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-accent-safe rounded-full shadow-[0_0_8px_#22c55e]" />
                        <span className="text-[8px] font-bold text-accent-safe">STABLE</span>
                      </div>
                   </div>
                   <button 
                     onClick={() => (window as any).setGlobalView('vmlab')}
                     className="w-full py-2 bg-accent-info/20 text-accent-info border border-accent-info/40 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-accent-info hover:text-white transition-all active:scale-95 mt-4"
                   >
                      Launch VM Laboratory
                   </button>
                </div>
            </div>

           <div className="nx-card p-10">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted mb-6">Security Context</h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.trends || []}>
                    <defs>
                      <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis dataKey="time" hide />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#09090b', border: '1px solid #ffffff10', borderRadius: '8px' }}
                      itemStyle={{ color: '#0ea5e9', fontSize: '10px', fontFamily: 'monospace' }}
                    />
                    <Area type="monotone" dataKey="score" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorTrend)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between items-center mt-6 pt-6 border-t border-white/5">
                 <div className="text-center flex-1 border-r border-white/5">
                    <div className="text-lg font-black text-white">42ms</div>
                    <div className="text-[9px] text-text-muted font-bold uppercase tracking-widest">Latency</div>
                 </div>
                 <div className="text-center flex-1">
                    <div className="text-lg font-black text-nexus-blue">99.9%</div>
                    <div className="text-[9px] text-text-muted font-bold uppercase tracking-widest">Uptime</div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function VaultView() {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newSecret, setNewSecret] = useState({ name: '', value: '', category: 'Security' });
  const [mtlsError, setMtlsError] = useState(false);

  const fetchSecrets = async () => {
    try {
      setMtlsError(false);
      const res = await axios.get('/api/vault/secrets', {
        headers: { 'x-machine-id': 'MCH-DEMO-001' }
      });
      setSecrets(res.data);
    } catch (e: any) {
      if (e.response?.status === 403) setMtlsError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSecrets(); }, []);

  const handleCreate = async () => {
     await axios.post('/api/vault/secrets', newSecret);
     setNewSecret({ name: '', value: '', category: 'Security' });
     setShowNew(false);
     fetchSecrets();
  };

  if (mtlsError) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center nx-card border-nexus-alert/30 text-center p-12 bg-nexus-alert/5">
        <div className="w-20 h-20 bg-nexus-alert/10 rounded-3xl flex items-center justify-center text-nexus-alert mb-8 animate-pulse shadow-2xl shadow-nexus-alert/20">
          <ShieldAlert size={40} />
        </div>
        <h3 className="text-3xl font-black text-nexus-alert mb-3 tracking-tighter uppercase">Machine Authentication Failure</h3>
        <p className="text-text-muted text-sm max-w-sm leading-relaxed mb-10">
          Nexus Zero Trust Gateway requires a valid <span className="text-white">mTLS certificate</span> to decrypt vault shards. Your current identity context is untrusted.
        </p>
        <button className="nx-btn-primary px-10 py-4 bg-nexus-alert/20 border-nexus-alert/40 text-nexus-alert hover:bg-nexus-alert hover:text-white" onClick={fetchSecrets}>
          RE-ATTEMPT MTLS HANDSHAKE
        </button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
      <div className="flex justify-between items-end px-2">
         <div>
            <div className="flex items-center gap-3 mb-4">
               <span className="px-2 py-1 bg-nexus-blue/10 text-nexus-blue text-[10px] font-bold tracking-widest rounded border border-nexus-blue/20 uppercase">Encrypted Storage</span>
               <div className="w-1 h-1 rounded-full bg-white/20" />
               <span className="text-[10px] text-text-muted font-medium uppercase tracking-[0.2em]">Zero Trust Vault</span>
            </div>
            <h1 className="text-5xl font-black tracking-tight">Identity <span className="text-nexus-blue">Vault</span></h1>
         </div>
         <button onClick={() => setShowNew(true)} className="nx-btn-primary flex items-center gap-3 py-4 px-8 group">
           <Plus size={18} className="group-hover:rotate-90 transition-transform" /> 
           <span className="text-[11px] font-black tracking-widest">INJECT NEW SECRET</span>
         </button>
      </div>

      {showNew && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="nx-card p-10 bg-nexus-blue/5 border-nexus-blue/20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
            <div className="space-y-3">
              <label className="text-[10px] uppercase text-text-muted font-black tracking-widest block px-1">Resource Handle</label>
              <input value={newSecret.name} onChange={e => setNewSecret({...newSecret, name: e.target.value})} className="nx-input" placeholder="e.g. CORE_INFRA_X509" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] uppercase text-text-muted font-black tracking-widest block px-1">Encrypted Payload</label>
              <input type="password" value={newSecret.value} onChange={e => setNewSecret({...newSecret, value: e.target.value})} className="nx-input font-mono" placeholder="••••••••••••" />
            </div>
            <div className="flex gap-4">
               <button onClick={handleCreate} disabled={!newSecret.name || !newSecret.value} className="nx-btn-primary flex-1 py-4 text-[11px] font-black tracking-widest">COMMIT SHARD</button>
               <button onClick={() => setShowNew(false)} className="px-6 rounded-xl border border-white/10 text-text-muted hover:text-white transition-colors text-[11px] font-black">ABORT</button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="h-64 nx-card bg-white/5 nx-shimmer rounded-3xl" />
        ) : secrets.length === 0 ? (
          <div className="h-64 nx-card flex flex-col items-center justify-center text-text-muted border-dashed">
            <Key className="opacity-20 mb-4" size={48} />
            <p className="text-sm font-medium">No encrypted records found in this enclave.</p>
          </div>
        ) : (
          secrets.map((s, i) => (
            <motion.div 
              key={s.id} 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ delay: i * 0.05 }}
              className="nx-card p-6 flex items-center justify-between hover:bg-white/[0.03] transition-all group border-white/5"
            >
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-nexus-blue/10 border border-nexus-blue/20 flex items-center justify-center text-nexus-blue group-hover:scale-110 transition-transform shadow-xl shadow-nexus-blue/5">
                  <Lock size={20} />
                </div>
                <div>
                  <div className="text-lg font-black text-white tracking-tight group-hover:text-nexus-blue transition-colors">{s.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-nexus-blue bg-nexus-blue/10 px-2 py-0.5 rounded leading-none">{s.category}</span>
                    <div className="w-1 h-1 rounded-full bg-white/10" />
                    <div className="text-[10px] font-mono text-text-muted">
                       COMMITTED_ON: {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="flex flex-col items-end gap-1">
                   <div className="text-[9px] font-mono text-text-muted uppercase tracking-tighter opacity-40">AES-GCM-256</div>
                   <code className="text-xs font-mono bg-black/40 px-4 py-2 rounded-lg border border-white/5 text-text-dim/80 group-hover:text-white transition-colors">
                     {s.value && s.value.includes('Enc') ? s.value : '••••••••••••••••••••'}
                   </code>
                </div>
                <button className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-text-muted hover:bg-nexus-blue/20 hover:text-nexus-blue transition-all">
                  <Fingerprint size={20} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}

function LogsView() {
  const [filters, setFilters] = useState({
    search: '',
    type: 'ALL',
    severity: 'ALL',
    user: '',
    dateStart: '',
    dateEnd: ''
  });

  const clearFilters = () => setFilters({
    search: '',
    type: 'ALL',
    severity: 'ALL',
    user: '',
    dateStart: '',
    dateEnd: ''
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex justify-between items-center">
         <h2 className="text-xl font-bold font-mono">SECURITY LOGS</h2>
         <div className="flex gap-2">
           <Button 
             variant="secondary" 
             onClick={clearFilters} 
             className="text-[10px] py-1 h-auto flex items-center gap-1 border border-white/10"
           >
             <X size={10} /> CLEAR FILTERS
           </Button>
           <div className="flex items-center gap-2 text-[10px] font-mono text-security-muted border border-white/5 px-2 py-1 rounded">
             <div className="w-2 h-2 rounded-full bg-security-accent animate-pulse"></div> LIVE STREAM ACTIVE
           </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-security-muted/50" size={14} />
          <input 
            type="text" 
            placeholder="Search messages..." 
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            className="w-full bg-bg-card border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-security-accent transition-colors"
          />
        </div>
        
        <div className="relative">
          <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-security-muted/50" size={14} />
          <input 
            type="text" 
            placeholder="Filter user..." 
            value={filters.user}
            onChange={(e) => setFilters({...filters, user: e.target.value})}
            className="w-full bg-bg-card border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-security-accent transition-colors"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-security-muted/50" size={14} />
          <select 
            value={filters.type}
            onChange={(e) => setFilters({...filters, type: e.target.value})}
            className="w-full bg-bg-card border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-security-accent appearance-none cursor-pointer"
          >
            <option value="ALL">All Types</option>
            <option value="AUTH">Auth</option>
            <option value="ATTACK">Attack</option>
            <option value="DENY">Deny</option>
            <option value="INFO">Info</option>
            <option value="WARN">Warn</option>
            <option value="IAM">IAM</option>
            <option value="VAULT">Vault</option>
          </select>
        </div>

        <div className="relative">
          <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-security-muted/50" size={14} />
          <select 
            value={filters.severity}
            onChange={(e) => setFilters({...filters, severity: e.target.value})}
            className="w-full bg-bg-card border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-security-accent appearance-none cursor-pointer"
          >
            <option value="ALL">All Severities</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        <div className="flex gap-2 lg:col-span-2">
          <div className="relative flex-1">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-security-muted/50" size={14} />
            <input 
              type="date" 
              value={filters.dateStart}
              onChange={(e) => setFilters({...filters, dateStart: e.target.value})}
              className="w-full bg-bg-card border border-white/10 rounded-lg pl-9 pr-4 py-2 text-[10px] focus:outline-none focus:border-security-accent"
            />
          </div>
          <div className="relative flex-1">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-security-muted/50" size={14} />
            <input 
              type="date" 
              value={filters.dateEnd}
              onChange={(e) => setFilters({...filters, dateEnd: e.target.value})}
              className="w-full bg-bg-card border border-white/10 rounded-lg pl-9 pr-4 py-2 text-[10px] focus:outline-none focus:border-security-accent"
            />
          </div>
        </div>
      </div>

      <Card className="min-h-[500px] overflow-hidden">
         <div className="space-y-1 font-mono text-xs">
            <SecurityLogList filters={filters} />
         </div>
      </Card>
    </motion.div>
  );
}

function VirtualLabView() {
  const [vms, setVms] = useState<any[]>([]);
  const [selectedVmId, setSelectedVmId] = useState<string | null>(null);
  const [accessConfigs, setAccessConfigs] = useState<{[key: string]: 'PUBLIC' | 'LOCAL'}>({});
  const [terminalOutput, setTerminalOutput] = useState<{[key: string]: string[]}>({});
  const [cmd, setCmd] = useState('');
  const [loading, setLoading] = useState(true);
  const terminalEndRef = React.useRef<HTMLDivElement>(null);

  const selectedVm = vms.find(v => v.id === selectedVmId);

  const scrollToBottom = () => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [terminalOutput, selectedVmId]);

  const fetchVms = async () => {
    try {
      const res = await axios.get('/api/admin/vms');
      setVms(res.data);
      if (!selectedVmId && res.data.length > 0) {
        setSelectedVmId(res.data[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVms();
    const interval = setInterval(fetchVms, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleVm = async (id: string) => {
    try {
      const isStarting = selectedVm?.status !== 'RUNNING';
      await axios.post(`/api/admin/vms/${id}/toggle`);
      fetchVms();
      
      if (isStarting) {
        const bootLines = [
          "[    0.000000] Linux version 5.15.0-101-generic (buildd@lcy02-amd64-072)",
          "[    0.000000] Command line: BOOT_IMAGE=/boot/vmlinuz root=UUID=8b-55-12 ro quiet splash",
          "[    0.000000] x86/fpu: Supporting XSAVE feature 0x001: 'x87 floating point registers'",
          "[    0.512042] smp: Bringing up secondary CPUs...",
          "[    0.892341] ACPI: Core revision 20210730",
          "[    1.102394] PCI: Using configuration type 1 for base access",
          "[    1.450122] SCSI subsystem initialized",
          "[    2.102341] EXT4-fs (sda1): mounted filesystem with ordered data mode. Opts: (null)",
          "[    2.892103] systemd[1]: systemd 249.11-0ubuntu3.9 running in system mode.",
          "[    3.102042] systemd[1]: Set hostname to <NEXUS-NODE-01>.",
          "[    3.502391] systemd[1]: Starting LSB: VirtualBox Guest Additions...",
          "[    3.892102] systemd[1]: Reached target Graphical Interface.",
          "[    4.102391] [NEXUS] Initializing Secure Enclave...",
          "[    4.301293] [NEXUS] Loading mTLS Certificates...",
          "[    4.502192] [OK] nexus-trust-agent.service started successfully.",
          "[    4.892102] [OK] System is READY. mTLS channel ESTABLISHED.",
          "",
          "Welcome to Nexus Zero Trust Node (Ubuntu 22.04 LTS)",
          "Last login: Thu Apr 23 20:56:12 2026 from 10.0.8.4",
          "nexus@ubuntu:~$"
        ];
        
        let i = 0;
        const interval = setInterval(() => {
          if (i < bootLines.length) {
            setTerminalOutput(prev => ({
              ...prev,
              [id]: [...(prev[id] || []), bootLines[i]]
            }));
            i++;
          } else {
            clearInterval(interval);
          }
        }, 150);
      }
    } catch (e) {
      console.error("Toggle failed", e);
    }
  };

  const executeCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmd.trim() || !selectedVm || selectedVm.status !== 'RUNNING') return;

    const currentCmd = cmd.trim();
    setCmd('');
    
    if (currentCmd.toLowerCase() === 'clear') {
      setTerminalOutput(prev => ({ ...prev, [selectedVm.id]: [] }));
      return;
    }

    setTerminalOutput(prev => ({
      ...prev,
      [selectedVm.id]: [...(prev[selectedVm.id] || []), `${selectedVm.id === 'vm_kali' ? 'root@kali' : 'nexus@ubuntu'}:~$ ${currentCmd}`]
    }));

    try {
      const res = await axios.post(`/api/admin/vms/${selectedVm.id}/execute`, { cmd: currentCmd });
      setTerminalOutput(prev => ({
        ...prev,
        [selectedVm.id]: [...(prev[selectedVm.id] || []), ...res.data.output]
      }));
    } catch (err) {
      setTerminalOutput(prev => ({
        ...prev,
        [selectedVm.id]: [...(prev[selectedVm.id] || []), 'Error executing command. Connection timed out.']
      }));
    }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 h-full flex flex-col pt-4">
      <div className="flex justify-between items-center px-2">
         <div>
            <h2 className="text-3xl font-black tracking-tight uppercase italic flex items-center gap-3">
               <Monitor className="text-accent-info" size={32} />
               Secure Virtual Lab
            </h2>
            <p className="text-[10px] text-text-secondary uppercase tracking-widest font-bold mt-1 opacity-60">Nexus Distributed Hypervisor v4.2</p>
         </div>
         <div className="flex items-center gap-4 bg-black/20 p-2 rounded-xl border border-white/5">
            <div className="flex flex-col items-end">
               <span className="text-[10px] font-black uppercase text-accent-safe">Hypervisor STATUS: OK</span>
               <span className="text-[9px] text-text-secondary font-mono">POOL: EU-WEST-VM-CLUSTER</span>
            </div>
            <div className="w-8 h-8 rounded-full border-2 border-accent-safe/20 flex items-center justify-center">
               <div className="w-3 h-3 bg-accent-safe rounded-full animate-pulse" />
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1 min-h-0 overflow-hidden">
        {/* VM Inventory Card */}
        <div className="space-y-6 overflow-y-auto pr-2">
           <div className="nx-card p-8">
              <h4 className="text-[10px] font-black text-text-muted mb-6 tracking-[0.2em] uppercase">Instance Inventory</h4>
              <div className="space-y-3">
                 {vms.map(vm => (
                   <button
                     key={vm.id}
                     onClick={() => setSelectedVmId(vm.id)}
                     className={cn(
                       "w-full p-4 rounded-xl border flex flex-col gap-1 text-left transition-all relative group",
                       selectedVmId === vm.id 
                         ? 'bg-nexus-blue/10 border-nexus-blue/30 text-white shadow-xl shadow-nexus-blue/5' 
                         : 'bg-black/20 border-white/5 text-text-dim hover:border-white/10 hover:bg-white/[0.03]'
                     )}
                   >
                     <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                           <Server size={14} className={selectedVmId === vm.id ? 'text-nexus-cyan' : 'text-text-muted'} />
                           <span className="font-black text-xs uppercase tracking-tight">{vm.name}</span>
                        </div>
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full shadow-[0_0_8px]",
                          vm.status === 'RUNNING' ? 'bg-nexus-safe shadow-nexus-safe' : 'bg-nexus-alert shadow-nexus-alert'
                        )} />
                     </div>
                     <div className="text-[9px] font-mono opacity-40">ADDR: {vm.ip}</div>
                     
                     {selectedVmId === vm.id && (
                        <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-nexus-blue rounded-l-full shadow-[0_0_10px_#0ea5e9]" />
                     )}
                   </button>
                 ))}
              </div>
           </div>

           {selectedVm && (
             <div className="space-y-6">
                <Card title="Hardware Simulation" className="bg-black/10 border-white/5">
                   <h4 className="text-[10px] font-black text-text-muted mb-6 tracking-[0.2em] uppercase">Hardware Metrics</h4>
                   <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <div className="text-[9px] uppercase font-bold text-text-muted mb-1 tracking-widest">Compute</div>
                            <div className="text-xl font-black text-white">{selectedVm.cpu}</div>
                         </div>
                         <div>
                            <div className="text-[9px] uppercase font-bold text-text-muted mb-1 tracking-widest">Memory</div>
                            <div className="text-xl font-black text-white">{selectedVm.ram}</div>
                         </div>
                      </div>
                      
                      <div className="pt-4 border-t border-white/5 flex gap-2">
                         <button 
                           onClick={() => toggleVm(selectedVm.id)}
                           className={cn(
                             "flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase transition-all active:scale-95",
                             selectedVm.status === 'RUNNING' 
                               ? 'bg-accent-alert/20 text-accent-alert border border-accent-alert/50' 
                               : 'bg-accent-safe/20 text-accent-safe border border-accent-safe/50'
                           )}
                         >
                            {selectedVm.status === 'RUNNING' ? <Square size={12} /> : <Play size={12} />}
                            {selectedVm.status === 'RUNNING' ? 'Terminate' : 'Deploy VM'}
                         </button>
                         <button className="p-3 bg-white/5 border border-white/5 rounded-xl text-text-secondary hover:text-white transition-all">
                           <Settings size={14} />
                         </button>
                      </div>
                   </div>
                </Card>

                <Card title="Network Access" className="bg-black/10 border-white/5">
                   <h4 className="text-[10px] font-black text-text-muted mb-6 tracking-[0.2em] uppercase">Network Exposure</h4>
                   <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          const newMode = 'PUBLIC';
                          setAccessConfigs(prev => ({ ...prev, [selectedVm.id]: newMode }));
                          setTerminalOutput(prev => ({
                            ...prev,
                            [selectedVm.id]: [...(prev[selectedVm.id] || []), `[NET] Interface eth0 context changed to ${newMode}`, `[GATEWAY] Routing external traffic to ${selectedVm.ip}...`]
                          }));
                        }}
                        className={cn(
                          "p-4 rounded-xl border flex flex-col items-center gap-2 transition-all active:scale-95 group",
                          (accessConfigs[selectedVm.id] || 'LOCAL') === 'PUBLIC'
                            ? 'bg-nexus-cyan/10 border-nexus-cyan/40 text-nexus-cyan'
                            : 'bg-black/20 border-white/5 text-text-muted hover:border-white/20'
                        )}
                      >
                         <Globe size={18} className={cn("transition-transform group-hover:scale-110", (accessConfigs[selectedVm.id] || 'LOCAL') === 'PUBLIC' ? 'animate-pulse' : '')} />
                         <div className="text-[9px] font-black uppercase tracking-widest">Public Access</div>
                         <div className={cn(
                           "w-1 h-1 rounded-full mt-1",
                           (accessConfigs[selectedVm.id] || 'LOCAL') === 'PUBLIC' ? 'bg-nexus-cyan' : 'bg-white/10'
                         )} />
                      </button>

                      <button
                        onClick={() => {
                          const newMode = 'LOCAL';
                          setAccessConfigs(prev => ({ ...prev, [selectedVm.id]: newMode }));
                          setTerminalOutput(prev => ({
                            ...prev,
                            [selectedVm.id]: [...(prev[selectedVm.id] || []), `[NET] Interface eth0 context changed to ${newMode}`, `[GATEWAY] External routing terminated. Local-only propagation active.`]
                          }));
                        }}
                        className={cn(
                          "p-4 rounded-xl border flex flex-col items-center gap-2 transition-all active:scale-95 group",
                          (accessConfigs[selectedVm.id] || 'LOCAL') === 'LOCAL'
                            ? 'bg-nexus-blue/10 border-nexus-blue/40 text-nexus-blue'
                            : 'bg-black/20 border-white/5 text-text-muted hover:border-white/20'
                        )}
                      >
                         <ShieldCheck size={18} className="transition-transform group-hover:scale-110" />
                         <div className="text-[9px] font-black uppercase tracking-widest">Local Access</div>
                         <div className={cn(
                           "w-1 h-1 rounded-full mt-1",
                           (accessConfigs[selectedVm.id] || 'LOCAL') === 'LOCAL' ? 'bg-nexus-blue' : 'bg-white/10'
                         )} />
                      </button>
                   </div>
                   
                   <div className="mt-4 p-3 bg-white/[0.02] rounded-lg border border-white/5 flex items-start gap-3">
                      <Info size={12} className="text-text-muted shrink-0 mt-0.5" />
                      <p className="text-[8px] text-text-muted leading-relaxed font-medium uppercase tracking-wider">
                         {(accessConfigs[selectedVm.id] || 'LOCAL') === 'PUBLIC' 
                           ? "Gateway tunneling enabled. Node is reachable via public RSA endpoint."
                           : "Isolation active. Communication restricted to the Nexus private mesh network."}
                      </p>
                   </div>
                </Card>

                <Card title="Lab Scenarios" className="bg-accent-info/[0.03] border-accent-info/20">
                   <div className="space-y-3">
                      <button 
                        onClick={() => {
                          if (selectedVm.id === 'vm_kali') {
                            setCmd('nmap 10.0.8.15');
                          } else {
                            setCmd('apt update && apt list --upgradable');
                          }
                        }}
                        className="w-full p-3 bg-black/20 border border-white/5 rounded-xl text-left hover:border-accent-info/50 transition-all group"
                      >
                         <div className="text-[10px] font-black uppercase text-accent-info mb-1 tracking-widest">Reconnaissance Mode</div>
                         <p className="text-[9px] text-text-secondary leading-tight opacity-60">Initiate automated audit against internal target subnet.</p>
                      </button>
                      <button 
                        onClick={() => {
                          const id = selectedVm.id;
                          setTerminalOutput(prev => ({
                            ...prev,
                            [id]: [...(prev[id] || []), '[STATUS] Initiating full system health audit...', '[OK] Hardware self-test passed', '[OK] Zero Trust Agent active', '[OK] Connectivity STABLE']
                          }));
                        }}
                        className="w-full p-3 bg-black/20 border border-white/5 rounded-xl text-left hover:border-accent-safe/50 transition-all group"
                      >
                         <div className="text-[10px] font-black uppercase text-accent-safe mb-1 tracking-widest">Compliance Check</div>
                         <p className="text-[9px] text-text-secondary leading-tight opacity-60">Verify CIS benchmark alignment and Nexus agent integrity.</p>
                      </button>
                      <button 
                        onClick={() => {
                          const id = selectedVm.id;
                          setTerminalOutput(prev => ({
                            ...prev,
                            [id]: [...(prev[id] || []), '[!] EMERGENCY TRIGGERED', '[!] Notifying SOC...', '[!] Firewalling selected node...']
                          }));
                        }}
                        className="w-full p-3 bg-accent-alert/5 border border-accent-alert/20 rounded-xl text-left hover:bg-accent-alert/10 transition-all group"
                      >
                         <div className="text-[10px] font-black uppercase text-accent-alert mb-1 tracking-widest">Simulate Attack</div>
                         <p className="text-[9px] text-text-secondary leading-tight opacity-60">Inject simulated threat vector for incident response training.</p>
                      </button>
                   </div>
                </Card>
             </div>
           )}
        </div>

        {/* Terminal/Console Section */}
        <div className="lg:col-span-3 flex flex-col min-h-[500px] gap-6">
           <div className="bg-[#121212] border border-white/10 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-22xl relative min-h-[400px]">
              <div className="bg-[#1f1f1f] px-6 py-3 flex items-center justify-between border-b border-white/5">
                 <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                    <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                 </div>
                 <div className="flex items-center gap-3 text-[10px] font-mono text-text-secondary font-bold">
                    <Terminal size={14} className="text-accent-info" />
                    <span className="opacity-80">LAB_CONSOLE://{selectedVm?.name.toLowerCase().replace(' ', '_')} — {selectedVm?.ip}</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border", selectedVm?.status === 'RUNNING' ? 'border-accent-safe/40 text-accent-safe bg-accent-safe/10' : 'border-accent-alert/40 text-accent-alert bg-accent-alert/10')}>
                       {selectedVm?.status}
                    </div>
                 </div>
              </div>
              
              <div className="flex-1 p-8 font-mono text-[11px] overflow-y-auto bg-black/40 custom-scrollbar flex flex-col scroll-smooth">
                 <div className="mb-4 p-3 bg-white/5 border border-white/5 rounded-lg text-text-secondary text-[10px] leading-relaxed">
                    <span className="text-accent-info font-bold uppercase">System Banner:</span> Connected to {selectedVm?.os}. Standard authorized access only. All actions are audited.
                    <br/>
                    <span className="opacity-40 italic">Type 'help', 'ls', 'ifconfig', 'uname -a' or use tools if on Kali.</span>
                 </div>

                 <div className="flex-1 space-y-1">
                   {(terminalOutput[selectedVm?.id || ''] || []).map((line: string, i: number) => (
                     <div key={i} className={cn(
                       line?.includes(':~$') ? 'text-accent-info font-bold' : 
                       (line?.includes('Error') || line?.includes('not found')) ? 'text-accent-alert' :
                       'text-white/80'
                     )}>
                       {line}
                     </div>
                   ))}
                   <div ref={terminalEndRef} />
                   {selectedVm?.status !== 'RUNNING' && (
                      <div className="h-full flex items-center justify-center flex-col gap-4 opacity-30 select-none py-20">
                         <PowerOff size={48} />
                         <div className="text-[10px] font-black uppercase tracking-[0.3em]">Node Offline</div>
                      </div>
                   )}
                 </div>
              </div>

              <form onSubmit={executeCommand} className="p-4 bg-black/40 border-t border-white/5 flex gap-3">
                 <div className="flex items-center gap-2 text-accent-info font-mono text-[11px] font-bold">
                    {selectedVm?.id === 'vm_kali' ? 'root@kali' : 'nexus@ubuntu'}:~$
                 </div>
                 <input 
                   type="text" 
                   value={cmd}
                   onChange={(e) => setCmd(e.target.value)}
                   disabled={selectedVm?.status !== 'RUNNING'}
                   className="flex-1 bg-transparent border-none outline-none text-[11px] font-mono text-white placeholder:text-white/10"
                   placeholder={selectedVm?.status === 'RUNNING' ? "Type command..." : "Power on VM to access console"}
                 />
                 <button type="submit" hidden disabled={selectedVm?.status !== 'RUNNING'} />
              </form>
           </div>

           {/* MTLS Debugging Artifact Section */}
           <div className="bg-bg-card rounded-2xl border border-border-subtle overflow-hidden">
              <div className="px-6 py-4 border-b border-border-subtle bg-black/10 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <ShieldAlert size={16} className="text-accent-alert" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">mTLS Failure Analysis</span>
                 </div>
                 <div className="status-pill border-accent-alert/30 text-accent-alert">INCIDENT_REPLAY</div>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                 <div className="space-y-4">
                    <div className="p-4 bg-accent-alert/5 border border-accent-alert/20 rounded-xl">
                       <h5 className="text-[11px] font-bold text-accent-alert uppercase mb-2">Issue Detected: SSL_CERT_MISSING</h5>
                       <p className="text-[10px] text-text-secondary leading-relaxed">
                          Edge gateway rejected request due to missing or invalid client certificate. 
                          The following audit capture demonstrates the handshake failure and subsequent correction.
                       </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                       <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                          <div className="text-[8px] text-text-secondary uppercase mb-1">Status</div>
                          <div className="text-xs font-bold text-accent-alert">400 Bad Request</div>
                       </div>
                       <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                          <div className="text-[8px] text-text-secondary uppercase mb-1">Identity</div>
                          <div className="text-xs font-bold text-white">ANONYMOUS</div>
                       </div>
                    </div>
                 </div>
                 <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-black group shadow-2xl">
                    <video 
                      className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                      controls
                      autoPlay
                      muted
                      loop
                      playsInline
                    >
                      <source src="https://storage.googleapis.com/temp-public-assets/mtls-demo.mp4" type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                    <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md text-[8px] font-mono text-accent-info rounded border border-white/10">
                       REPLAY_ID: EVT_0942
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </motion.div>
  );
}

function KaliView() {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const tools = [
    { id: 'nmap', name: 'Nmap', icon: <Search size={18} />, desc: 'Network Exploration & Port Discovery' },
    { id: 'hydra', name: 'Hydra', icon: <Activity size={18} />, desc: 'Login Brute-Forcer (Auth Gateway)' },
    { id: 'metasploit', name: 'Metasploit', icon: <Skull size={18} />, desc: 'Exploit Framework Simulation' },
    { id: 'sqlmap', name: 'SQLmap', icon: <Database size={18} />, desc: 'Automatic SQL Injection Probing' }
  ];

  const executeTool = async (toolId: string) => {
    setActiveTool(toolId);
    setRunning(true);
    setTerminalOutput([`kali@nexus-zt:~$ sudo ${toolId} target.nexus.internal --aggressive`]);
    
    try {
      const res = await axios.post('/api/admin/kali/execute', { tool: toolId });
      
      // Simulate real-time logging
      let currentLine = 0;
      const interval = setInterval(() => {
        if (currentLine < res.data.output.length) {
          setTerminalOutput(prev => [...prev, res.data.output[currentLine]]);
          currentLine++;
        } else {
          setTerminalOutput(prev => [...prev, 'kali@nexus-zt:~$ _']);
          setRunning(false);
          clearInterval(interval);
        }
      }, 300);

    } catch (e) {
      setTerminalOutput(prev => [...prev, '[ERROR] Simulation failed. Target is hardening...']);
      setRunning(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black tracking-tighter uppercase italic text-accent-alert underline decoration-4 underline-offset-8">Kali Offensive Suite</h2>
          <div className="text-text-secondary text-[10px] uppercase tracking-widest mt-2 font-bold flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-accent-alert rounded-full"></div>
            Simulated Red-Team Environment
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        <div className="space-y-4">
          <Card className="border-accent-alert/20 bg-accent-alert/[0.02]">
            <h4 className="text-[10px] font-bold text-accent-alert mb-4 tracking-widest uppercase">Select Payload</h4>
            <div className="space-y-2">
              {tools.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => executeTool(tool.id)}
                  disabled={running}
                  className={cn(
                    "w-full p-4 rounded-xl border flex flex-col gap-1 text-left transition-all group",
                    activeTool === tool.id 
                      ? 'bg-accent-alert border-accent-alert text-black shadow-[0_0_15px_rgba(255,68,68,0.3)]' 
                      : 'bg-black/20 border-white/5 text-text-primary hover:border-accent-alert/50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(activeTool === tool.id ? 'text-black' : 'text-accent-alert')}>
                      {tool.icon}
                    </div>
                    <span className="font-black text-sm uppercase">{tool.name}</span>
                  </div>
                  <span className={cn("text-[9px] font-bold opacity-60", activeTool === tool.id ? '' : 'text-text-secondary')}>
                    {tool.desc}
                  </span>
                </button>
              ))}
            </div>
          </Card>
          
          <Card title="Attack Status" className="bg-black/5 border-white/5">
            <div className="space-y-4">
               <div className="flex items-center justify-between text-[10px] font-bold text-text-secondary">
                  <span>SESSION TOKEN</span>
                  <span className="font-mono text-accent-alert">ACTIVE</span>
               </div>
               <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-accent-alert"
                    animate={{ width: running ? ['0%', '100%'] : '0%' }}
                    transition={{ duration: 3, repeat: running ? Infinity : 0 }}
                  />
               </div>
               <div className="p-3 bg-accent-alert/10 border border-accent-alert/20 rounded-lg">
                  <p className="text-[9px] text-accent-alert leading-relaxed uppercase font-black text-center italic">
                    {running ? "Exploitation in progress. DO NOT DISCONNECT." : "Ready for deployment."}
                  </p>
               </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-3 flex flex-col min-h-[400px]">
           <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-2xl">
              <div className="bg-[#2d2d2d] px-4 py-2 flex items-center justify-between border-b border-white/5">
                 <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                 </div>
                 <div className="flex items-center gap-2 text-[10px] font-mono text-text-secondary font-bold opacity-60">
                    <Terminal size={10} />
                    <span>kali — target: 10.0.8.4</span>
                 </div>
                 <div className="w-10"></div>
              </div>
              <div className="p-6 font-mono text-xs flex-1 overflow-y-auto space-y-1 bg-black/40">
                 {terminalOutput.length === 0 && (
                   <div className="text-accent-alert/40 italic">
                      SYSTEM READY. SELECT A TOOL TO BEGIN SIMULATION.
                   </div>
                 )}
                 {terminalOutput.map((line, i) => (
                   <div key={i} className={cn(
                     line?.startsWith('kali@nexus-zt') ? 'text-accent-safe' : 
                     (line?.startsWith('[-] ') || line?.includes('ERROR') || line?.includes('vulnerability')) ? 'text-accent-alert' : 
                     line?.startsWith('[*] ') ? 'text-accent-info' : 
                     'text-white/80'
                   )}>
                     {line}
                   </div>
                 ))}
                 {running && <motion.div animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.8, repeat: Infinity }} className="w-2 h-4 bg-white inline-block align-middle ml-1" />}
              </div>
           </div>
        </div>
      </div>
    </motion.div>
  );
}

function AdminView() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Certificate Management">
             <div className="space-y-4">
               <div className="p-4 bg-security-accent/5 border border-security-accent/20 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold font-mono">CA AUTHORITY</span>
                    <span className="text-[10px] text-security-accent font-mono px-1 border border-security-accent/30">VALID</span>
                  </div>
                  <div className="text-[10px] text-security-muted font-mono break-all opacity-60">
                    CN: ZeroTrust-CA-ROOT-01<br/>
                    EXPIRES: 2036-04-17
                  </div>
               </div>
               <div className="space-y-2">
                 {[
                   { name: 'Gateway Proxy', type: 'SERVER', status: 'ACTIVE' },
                   { name: 'Backup Worker 01', type: 'CLIENT', status: 'ACTIVE' },
                   { name: 'Admin Console (Local)', type: 'CLIENT', status: 'REVOKED' }
                 ].map((c, i) => (
                   <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-2">
                        <Lock className={cn("w-3 h-3", c.status === 'REVOKED' ? 'text-security-danger' : 'text-security-accent')} />
                        <span className="text-xs font-mono">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-security-muted">{c.type}</span>
                        <span className={cn("text-[8px] font-bold px-1 uppercase", c.status === 'REVOKED' ? 'text-security-danger' : 'text-security-accent')}>
                          {c.status}
                        </span>
                      </div>
                   </div>
                 ))}
               </div>
               <Button className="w-full text-xs py-2 mt-4" variant="secondary">ROTATE ALL CERTIFICATES</Button>
             </div>
          </Card>
          
          <Card title="IAM Roles (Keycloak RBAC)">
             <div className="space-y-4">
               {[
                 { role: 'SYSTEM_ADMIN', perms: ['Manage Users', 'Revoke Certs', 'View Secrets'], users: 1 },
                 { role: 'SECURITY_AUDITOR', perms: ['View Logs', 'View Metrics'], users: 2 },
                 { role: 'SERVICE_RUNNER', perms: ['Read Vault'], users: 5 }
               ].map((r, i) => (
                 <div key={i} className="p-3 bg-white/5 rounded">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-white font-mono">{r.role}</span>
                      <span className="text-[10px] text-security-muted">{r.users} USERS</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {r.perms.map(p => (
                        <span key={p} className="text-[8px] border border-security-muted/20 px-1 text-security-muted">{p}</span>
                      ))}
                    </div>
                 </div>
               ))}
             </div>
          </Card>
       </div>
    </motion.div>
  );
}

// --- Helper Components ---

function StatCard({ title, value, icon, color = 'info', delay = 0 }: any) {
  const colors: any = {
    info: 'nexus-blue',
    safe: 'nexus-safe',
    warn: 'nexus-alert',
    danger: 'nexus-alert'
  };
  const accent = colors[color] || 'nexus-blue';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="nx-card p-6 flex flex-col justify-between group hover:scale-[1.02] transition-all duration-300 relative overflow-hidden"
    >
      <div className={`absolute top-0 right-0 w-24 h-24 bg-${accent}/5 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-${accent}/10 transition-colors`} />
      
      <div className="flex justify-between items-start mb-6">
        <div className={`p-3 bg-${accent}/10 rounded-2xl text-${accent} group-hover:scale-110 transition-transform`}>
          {React.cloneElement(icon, { size: 24 })}
        </div>
        <div className="text-[9px] font-mono text-text-muted opacity-50 tracking-widest uppercase">Live Trace</div>
      </div>
      <div>
        <div className="text-3xl font-black tracking-tight text-white mb-1">{value}</div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{title}</div>
      </div>
    </motion.div>
  );
}

function SecurityTestingView() {
  const { user } = React.useContext(UserContext);
  const [scans, setScans] = useState<any[]>([]);
  const [compliance, setCompliance] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'scans' | 'compliance' | 'pentest'>('scans');
  const [running, setRunning] = useState(false);

  const fetch = async () => {
    try {
      const [scanRes, compRes] = await Promise.all([
        axios.get('/api/admin/scans'),
        axios.get('/api/admin/compliance')
      ]);
      setScans(scanRes.data);
      setCompliance(compRes.data);
    } catch (e) {
      console.warn("Security Testing data fetch failed", e);
    }
  };

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 5000);
    return () => clearInterval(interval);
  }, []);

  const runScan = async (type: string) => {
    setRunning(true);
    await axios.post('/api/admin/scans/start', { type });
    setTimeout(() => setRunning(false), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Security Assurance & Testing</h2>
          <p className="text-text-secondary text-sm">Automated Vulnerability Management & Continuous Compliance</p>
        </div>
        <div className="flex bg-bg-card border border-border-subtle p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('scans')}
            className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-all", activeTab === 'scans' ? 'bg-accent-info text-white' : 'text-text-secondary hover:text-text-primary')}
          >
            Vulnerability Scans
          </button>
          <button 
            onClick={() => setActiveTab('compliance')}
            className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-all", activeTab === 'compliance' ? 'bg-accent-info text-white' : 'text-text-secondary hover:text-text-primary')}
          >
            Compliance Controls
          </button>
          <button 
            onClick={() => setActiveTab('pentest')}
            className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-all", activeTab === 'pentest' ? 'bg-accent-info text-white' : 'text-text-secondary hover:text-text-primary')}
          >
            Pentest Simulation
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0 overflow-y-auto pb-8">
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'scans' && (
            <Card title="Vulnerability Diagnostic History">
               <div className="space-y-4">
                  {scans.map(scan => (
                    <div key={scan.id} className="flex items-center justify-between p-5 bg-black/10 rounded-2xl border border-border-subtle group">
                      <div className="flex items-center gap-4">
                         <div className={cn(
                           "p-3 rounded-xl",
                           scan.status === 'COMPLETED' ? 'bg-accent-safe/10 text-accent-safe' : 'bg-accent-info/10 text-accent-info'
                         )}>
                            <Bug size={24} />
                         </div>
                         <div>
                            <div className="font-bold">{scan.name}</div>
                            <div className="text-[10px] text-text-secondary flex gap-2">
                               <span>ID: {scan.id}</span>
                               <span>•</span>
                               <span className="flex items-center gap-1"><Clock size={10}/> {formatDate(scan.date)}</span>
                            </div>
                         </div>
                      </div>
                      <div className="flex items-center gap-6 text-right">
                         <div>
                            <div className="text-[10px] uppercase font-bold text-text-secondary mb-1">Findings</div>
                            <div className={cn("text-lg font-bold", scan.findings > 0 ? 'text-accent-alert' : 'text-accent-safe')}>
                               {scan.findings}
                            </div>
                         </div>
                         <div className="min-w-[100px]">
                            {scan.status === 'IN_PROGRESS' ? (
                               <div className="flex items-center gap-2 text-accent-info">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span className="text-[10px] font-bold">SCANNING...</span>
                               </div>
                            ) : (
                               <span className={cn(
                                 "shield-badge",
                                 scan.severity === 'HIGH' ? 'bg-accent-alert/10 text-accent-alert border-accent-alert/30' : 'bg-accent-safe/10 text-accent-safe border-accent-safe/30'
                               )}>
                                 {scan.severity} SEVERITY
                               </span>
                            )}
                         </div>
                      </div>
                    </div>
                  ))}
               </div>
            </Card>
          )}

          {activeTab === 'compliance' && (
            <Card title="Continuous Compliance Oversight">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {compliance.map(ctrl => (
                    <div key={ctrl.id} className="p-4 bg-bg-sidebar border border-border-subtle rounded-xl flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            ctrl.status === 'PASS' ? 'bg-accent-safe/10 text-accent-safe' : 'bg-accent-warn/10 text-accent-warn'
                          )}>
                             <ClipboardCheck size={18} />
                          </div>
                          <div>
                             <div className="font-bold text-xs">{ctrl.name}</div>
                             <div className="text-[9px] text-text-secondary opacity-60">{ctrl.id} | {ctrl.framework}</div>
                          </div>
                       </div>
                       <div className={cn(
                         "text-[9px] font-bold px-2 py-0.5 rounded border",
                         ctrl.status === 'PASS' ? 'border-accent-safe/30 text-accent-safe' : 'border-accent-warn/30 text-accent-warn'
                       )}>
                          {ctrl.status}
                       </div>
                    </div>
                  ))}
               </div>
            </Card>
          )}

          {activeTab === 'pentest' && (
            <Card title="Automated Penetration Suite">
               <div className="p-12 text-center space-y-6">
                  <div className="w-24 h-24 bg-accent-alert/10 rounded-full flex items-center justify-center mx-auto border-4 border-accent-alert/20">
                     <Target className="text-accent-alert w-12 h-12" />
                  </div>
                  <div className="max-w-md mx-auto space-y-2">
                     <h3 className="text-xl font-bold">Simulate Red Team Activity</h3>
                     <p className="text-sm text-text-secondary">
                        Trigger simulated brute force, credential stuffing, and SQLi attacks to verify Fail2Ban and Rate Limiting responsiveness.
                     </p>
                  </div>
                  <div className="flex gap-4 justify-center">
                     <Button variant="danger" onClick={() => runScan('Credential Injection')} disabled={running || user?.role === 'USER'}>
                        Launch Fuzzing Test
                     </Button>
                     <Button variant="secondary" onClick={() => runScan('Gateway BruteForce')} disabled={running || user?.role === 'USER'}>
                        Stress Test Limiter
                     </Button>
                  </div>
               </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card title="Quick Actions">
             <div className="space-y-3">
                <Button 
                  className="w-full justify-between group" 
                  variant="secondary"
                  disabled={running}
                  onClick={() => runScan('Full Infrastructure')}
                >
                   <div className="flex items-center gap-2">
                      <Zap size={16} className="text-accent-warn" />
                      <span>Full OWASP ZAP Scan</span>
                   </div>
                   <Plus size={14} className="opacity-40 group-hover:rotate-90 transition-transform" />
                </Button>
                <Button className="w-full justify-between group" variant="secondary">
                   <div className="flex items-center gap-2">
                      <FileSearch size={16} className="text-accent-info" />
                      <span>Export compliance report</span>
                   </div>
                </Button>
             </div>
          </Card>

          <Card title="Overall Posture Status">
             <div className="p-4 flex flex-col items-center text-center space-y-4">
                <div className="relative w-32 h-32">
                   <svg className="w-full h-full transform -rotate-90">
                      <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                      <circle 
                        cx="64" 
                        cy="64" 
                        r="58" 
                        stroke="currentColor" 
                        strokeWidth="8" 
                        fill="transparent" 
                        strokeDasharray={364.4}
                        strokeDashoffset={364.4 * (1 - 0.84)}
                        className="text-accent-safe transition-all duration-1000"
                      />
                   </svg>
                   <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-extrabold">84%</span>
                      <span className="text-[8px] uppercase tracking-widest text-text-secondary">Compliant</span>
                   </div>
                </div>
                <div className="w-full space-y-2">
                   <div className="flex justify-between text-[10px] uppercase font-bold">
                      <span>NIST Compliance</span>
                      <span>100%</span>
                   </div>
                   <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-accent-safe w-full" />
                   </div>
                   <div className="flex justify-between text-[10px] uppercase font-bold mt-2">
                      <span>PCI-DSS Validation</span>
                      <span className="text-accent-warn">62%</span>
                   </div>
                   <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-accent-warn w-[62%]" />
                   </div>
                </div>
             </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}

function ThreatIntelTicker() {
  const [threats, setThreats] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchThreats = async () => {
      try {
        const res = await axios.get('/api/admin/threat-intel');
        setThreats(res.data);
      } catch (e) {
        console.error("Failed to fetch threat intel", e);
      }
    };
    fetchThreats();
  }, []);

  useEffect(() => {
    if (threats.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % threats.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [threats]);

  if (threats.length === 0) return null;

  const current = threats[currentIndex];

  return (
    <div className="bg-accent-alert/10 border border-accent-alert/20 rounded-xl p-3 flex items-center gap-4 overflow-hidden h-14">
      <div className="flex-shrink-0 animate-pulse">
        <ShieldAlert className="text-accent-alert" size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="flex flex-col"
          >
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase",
                current.severity === 'CRITICAL' ? 'bg-accent-alert text-white border-accent-alert' :
                current.severity === 'HIGH' ? 'border-accent-alert/50 text-accent-alert' :
                'border-accent-warn/50 text-accent-warn'
              )}>
                {current.severity}
              </span>
              <span className="text-xs font-bold truncate">{current.title}</span>
            </div>
            <p className="text-[10px] text-text-secondary truncate">{current.description}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function NexusAIAgentView() {
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const tools: FunctionDeclaration[] = [
    {
      name: "set_view",
      description: "Change the current application view to navigate the system.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          targetView: {
            type: Type.STRING,
            enum: ['overview', 'soc', 'vmlab', 'kali', 'ai-engine', 'testing', 'ai', 'iam', 'agent', 'security-profile', 'vault', 'logs', 'admin'],
            description: "The name of the view to switch to."
          }
        },
        required: ["targetView"]
      }
    },
    {
      name: "run_vm_scan",
      description: "Run a security scan command on a specific virtual machine.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          vmId: { type: Type.STRING, enum: ['vm_ubuntu', 'vm_kali'], description: "The ID of the target VM." },
          command: { type: Type.STRING, description: "The command to execute (e.g. 'nmap', 'apt update')." }
        },
        required: ["vmId", "command"]
      }
    },
    {
      name: "get_infrastructure_status",
      description: "Retrieve current CPU, RAM and Power status for all VMs in the lab.",
      parameters: { type: Type.OBJECT, properties: {} }
    },
    {
      name: "toggle_vm_power",
      description: "Activate or Deactivate a specific virtual machine (power on/off).",
      parameters: {
        type: Type.OBJECT,
        properties: {
          vmId: { type: Type.STRING, enum: ['vm_ubuntu', 'vm_kali'], description: "The ID of the target VM." },
          targetState: { type: Type.STRING, enum: ['RUNNING', 'STOPPED'], description: "Optional: Explicitly set the state to RUNNING or STOPPED." }
        },
        required: ["vmId"]
      }
    },
    {
      name: "deploy_full_security_suite",
      description: "Launch all security tools simultaneously (mTLS audit, Port-Sweep, UEBA analysis).",
      parameters: { type: Type.OBJECT, properties: {} }
    },
    {
      name: "broadcast_alert",
      description: "Broadcast a high-priority alert to all connected security analysts and NOC terminals.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          priority: { type: Type.STRING, enum: ["INFO", "WARNING", "CRITICAL"], description: "The severity level of the alert." },
          message: { type: Type.STRING, description: "The content of the alert broadcast." }
        },
        required: ["priority", "message"]
      }
    },
    {
      name: "isolate_node",
      description: "Immediately isolate a specific node (VM) from the network to prevent lateral movement.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          nodeId: { type: Type.STRING, enum: ['vm_ubuntu', 'vm_kali'], description: "The ID of the node to isolate." }
        },
        required: ["nodeId"]
      }
    },
    {
      name: "analyze_security_logs",
      description: "Perform deep analysis of recent security telemetry for threat patterning.",
      parameters: { type: Type.OBJECT, properties: {} }
    },
    {
      name: "get_security_posture",
      description: "Retrieve a complete overview of the current system security metrics and risk posture.",
      parameters: { type: Type.OBJECT, properties: {} }
    },
    {
      name: "trigger_incident_response",
      description: "Initiate Emergency Incident Response protocol. Lockdown high-risk subsystems and broadcast critical alerts.",
      parameters: { type: Type.OBJECT, properties: {} }
    },
    {
      name: "recalibrate_ai_models",
      description: "Manually trigger a re-training of the anomaly detection models using the latest security event telemetry.",
      parameters: { type: Type.OBJECT, properties: {} }
    }
  ];

  const handleToolCall = async (call: any) => {
    const { name, args } = call;
    
    if (name === 'set_view') {
      (window as any).setGlobalView(args.targetView);
      return `Successfully navigated to the ${args.targetView} module.`;
    }

    if (name === 'run_vm_scan') {
      try {
        const res = await axios.post(`/api/admin/vms/${args.vmId}/execute`, { cmd: args.command });
        return `Scan Execution on ${args.vmId}:\n${res.data.output.join('\n')}`;
      } catch (e: any) {
        return `Execution blocked: ${e.response?.data?.error || 'Unknown error'}`;
      }
    }

    if (name === 'get_infrastructure_status') {
      try {
        const res = await axios.get('/api/admin/vms');
        return `Current Infrastructure Metrics:\n${JSON.stringify(res.data, null, 2)}`;
      } catch (e: any) {
        return `ERROR: Unable to retrieve infrastructure status. ${e.response?.status === 401 ? 'Identity token invalid.' : e.message}`;
      }
    }

    if (name === 'toggle_vm_power') {
      try {
        const res = await axios.post(`/api/admin/vms/${args.vmId}/toggle`, { targetState: args.targetState });
        return `Power state for ${args.vmId}: ${res.data.vm.status}. ${res.data.alreadyInState ? '(Already active)' : '(State changed)'}`;
      } catch (e: any) {
        return `ERROR: Power toggle failed. ${e.message}`;
      }
    }

    if (name === 'deploy_full_security_suite') {
      // Simulate multi-tool activation
      await axios.post('/api/admin/policy/toggle'); // Hardening policy
      await axios.post('/api/admin/vms/vm_ubuntu/execute', { cmd: 'apt update && apt list --upgradable' });
      return "GLOBAL HARDENING INITIATED: mTLS Audit [PENDING], Port-Sweep [ACTIVE], UEBA Re-scoring [COMPLETE]. All ZT nodes switched to HIGH_INTEGRITY mode.";
    }

    if (name === 'analyze_security_logs') {
      try {
        const res = await axios.get('/api/admin/logs');
        return `RECENT TELEMETRY SNAPSHOT:\n${JSON.stringify(res.data.slice(0, 10), null, 2)}\n\nPATTERNS IDENTIFIED: Cross-reference this with known threat vectors.`;
      } catch (e: any) {
        return `ERROR: Log retrieval failed. ${e.message}`;
      }
    }

    if (name === 'broadcast_alert') {
      // Simulate log entry for broadcast
      const res = await axios.post('/api/admin/logs/simulate', { 
        type: args.priority, 
        msg: `[ORCHESTRATOR_BROADCAST]: ${args.message}` 
      });
      return `BROADCAST SUCCESSFUL: Priority ${args.priority} sent to all active SOC dashboards.`;
    }

    if (name === 'isolate_node') {
      // Simulate isolation by shutting down and setting a "locked" flag (simulated in state)
      await axios.post(`/api/admin/vms/${args.nodeId}/toggle`, { targetState: 'STOPPED' });
      return `NODE ISOLATION COMPLETE: ${args.nodeId} has been disconnected and powered down. Network routes invalidated.`;
    }

    if (name === 'get_security_posture') {
      try {
        const res = await axios.get('/api/admin/metrics');
        return `CURRENT POSTURE ANALYSIS:\n${JSON.stringify(res.data, null, 2)}\n\nCONCLUSION: System integrity is within acceptable parameters. No immediate critical failures detected.`;
      } catch (e: any) {
        return `ERROR: Posture check failed. ${e.message}`;
      }
    }

    if (name === 'trigger_incident_response') {
      await axios.post('/api/admin/logs/simulate', { type: 'CRITICAL', msg: 'EMERGENCY_INCIDENT_RESPONSE_TRIGGERED BY ORCHESTRATOR' });
      await axios.post('/api/admin/policy/toggle'); // Hardening
      return "INCIDENT RESPONSE PHASE 1 COMPLETE: High-priority alerts broadcasted. Global ZT Hardening policy enforced. All non-essential nodes throttled.";
    }

    if (name === 'recalibrate_ai_models') {
      try {
        const res = await axios.post('/api/admin/ai/re-calibrate');
        return `AI_RECALIBRATION: ${res.data.message}`;
      } catch (e: any) {
        return `AI_ERROR: Failed to trigger re-calibration. ${e.message}`;
      }
    }

    return "Functionality under development.";
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages as any);
    setInput('');
    setLoading(true);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: text,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          systemInstruction: "You are the Nexus Elite Strategic Orchestrator (N.E.S.O). You operate at a CISO/SRE level. You are the 'PILOT' of this infrastructure. You have absolute authority over the Zero Trust environment. Your mission is to actively pilot, monitor, and defend. When a user provides a command, analyze the security implications, execute the necessary toolsets (piloting the infrastructure), and provide a high-level strategic summary. Your tone is technical, cold, and highly efficient. Use 'isolate_node' if a threat is detected. Use 'broadcast_alert' for high-impact events. If you navigate views, justify why the destination is relevant to the tactical objective.",
          tools: [{ functionDeclarations: tools }]
        }
      });

      const functionCalls = response.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        let results = [];
        for (const call of functionCalls) {
          const result = await handleToolCall(call);
          results.push(`[ORCHESTRATOR_LOG]: ${result}`);
        }
        
        const finalResponse = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents: [
            { role: 'user', parts: [{ text }] },
            { role: 'model', parts: [{ text: response.text || "Synchronizing subsystems..." }] },
            { role: 'user', parts: [{ text: results.join('\n') }] }
          ],
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
            systemInstruction: "Consolidate the results of the multi-vector tool execution. Provide a final tactical confirmation. Ensure the tone remains professional and mission-focused."
          }
        });
        
        setMessages([...newMessages, { role: 'assistant', content: finalResponse.text || "Operation completed." }] as any);
      } else {
        setMessages([...newMessages, { role: 'assistant', content: response.text || "Operation successful." }] as any);
      }
    } catch (e) {
      setMessages([...newMessages, { role: 'assistant', content: "Cybernetic link error: Check console for telemetry." }] as any);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-center bg-bg-card p-6 rounded-3xl border border-border-subtle shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
           <Zap size={200} className="text-accent-info" />
        </div>
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="p-4 bg-accent-info/20 rounded-2xl border border-accent-info/30 group">
            <Sparkles className="text-accent-info w-8 h-8 group-hover:rotate-12 transition-transform" />
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tighter uppercase italic flex items-center gap-2">
              Mission <span className="text-accent-info">Control</span>
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex h-2 w-2 rounded-full bg-accent-safe animate-pulse" />
              <p className="text-[10px] text-text-secondary uppercase tracking-[0.3em] font-black">N.E.S.O Protocol v3.11 [PILOT_MODE]</p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-4 md:mt-0 relative z-10">
           <div className="px-5 py-3 bg-white/5 border border-white/5 rounded-2xl text-center min-w-[120px]">
              <div className="text-[10px] text-text-secondary uppercase font-bold mb-1 tracking-tighter">Cognitive Load</div>
              <div className="text-xl font-black text-accent-info">PRO-G3</div>
           </div>
           <div className="px-5 py-3 bg-white/5 border border-white/5 rounded-2xl text-center min-w-[120px]">
              <div className="text-[10px] text-text-secondary uppercase font-bold mb-1 tracking-tighter">Biometric Latency</div>
              <div className="text-xl font-black text-accent-safe">0.4ms</div>
           </div>
           <div className="px-5 py-3 bg-white/5 border border-white/5 rounded-2xl text-center min-w-[120px]">
              <div className="text-[10px] text-text-secondary uppercase font-bold mb-1 tracking-tighter">Auth Protocol</div>
              <div className="text-xl font-black">ELITE</div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        <div className="lg:col-span-1 space-y-6">
           <Card title="Operational Directives">
              <div className="space-y-4">
                 {[
                   { t: "Autonomous Navigation", d: "Instantly switch between system modules via voice or text." },
                   { t: "Log Pattern Analysis", d: "Utilize G3.1 Reasoning to identify anomalies in raw telemetry logs." },
                   { t: "Risk Posture Analysis", d: "Real-time evaluation of UEBA and attack telemetry." },
                 ].map((d, i) => (
                   <div key={i} className="p-3 bg-white/5 border border-white/5 rounded-xl border-l-2 border-l-accent-info">
                      <div className="text-[10px] font-black uppercase text-text-primary mb-1">{d.t}</div>
                      <p className="text-[9px] text-text-secondary leading-tight">{d.d}</p>
                   </div>
                 ))}
              </div>
           </Card>

           <Card title="Activity Trace" className="bg-accent-info/[0.02] border-accent-info/20">
              <div className="space-y-4">
                 {[
                   { step: "INFRA_LINK", status: "ESTABLISHED", val: "mTLS v1.3" },
                   { step: "REASONING_CORE", status: "HIGH_INTENSITY", val: "ACTIVE" },
                   { step: "TELEMETRY_BUF", status: "QUEUED", val: "128.4 KB" },
                 ].map((r, i) => (
                   <div key={i} className="flex flex-col gap-1">
                      <div className="flex justify-between text-[8px] font-mono uppercase tracking-widest text-text-secondary">
                         <span>{r.step}</span>
                         <span className="text-accent-safe">{r.status}</span>
                      </div>
                      <div className="text-[10px] font-black text-white">{r.val}</div>
                      <div className="h-0.5 bg-white/5 rounded-full overflow-hidden mt-1">
                         <div className="h-full bg-accent-info w-2/3 animate-pulse" />
                      </div>
                   </div>
                 ))}
              </div>
           </Card>
           
           <Card title="Quick Commands" className="flex-1">
              <div className="grid grid-cols-1 gap-2">
                 {[
                   "Analyze recent security logs",
                   "Reboot the Ubuntu Support VM",
                   "Show me the SOC Platform",
                   "Check infrastructure health"
                 ].map(q => (
                   <button 
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="p-3 text-[10px] font-bold text-left bg-black/20 border border-white/5 rounded-xl hover:border-accent-info/50 transition-all text-text-secondary hover:text-white"
                   >
                     {q}
                   </button>
                 ))}
              </div>
           </Card>
        </div>

        <div className="lg:col-span-3 flex flex-col bg-bg-card rounded-3xl border border-border-subtle shadow-2xl overflow-hidden relative">
          <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-30">
                <div className="p-8 bg-accent-info/5 rounded-full mb-6">
                   <Monitor size={64} className="text-accent-info" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-widest text-text-primary mb-2">Awaiting Directives</h3>
                <p className="text-sm max-w-sm font-medium">Issue high-level commands to orchestrate your Zero Trust environment. I am your operational shadow.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, x: m.role === 'user' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                "flex flex-col max-w-[85%] p-5 rounded-3xl relative overflow-hidden group",
                m.role === 'user' 
                  ? "bg-accent-info/10 ml-auto border border-accent-info/20 text-right rounded-tr-none px-6" 
                  : "bg-gradient-to-br from-bg-sidebar to-black/40 mr-auto border border-white/10 rounded-tl-none px-6"
              )}>
                {m.role === 'assistant' && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-accent-info" />
                )}
                {m.content.split('\n').map((line, li) => (
                  <p key={li} className={cn(
                    "text-[11px] leading-relaxed mb-1", 
                    m.role === 'assistant' ? "text-text-primary font-medium font-mono" : "text-text-primary font-sans"
                  )}>
                    {line}
                  </p>
                ))}
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
                   <div className="text-[8px] font-black uppercase opacity-40 tracking-[0.2em] flex items-center gap-2">
                       {m.role === 'user' ? <User size={8} /> : <Cpu size={8} />}
                       {m.role === 'user' ? 'Operator_Level_0' : 'N.E.S.O Core'}
                   </div>
                   <div className="text-[8px] font-mono opacity-20">{new Date().toLocaleTimeString()}</div>
                </div>
              </motion.div>
            ))}
            {loading && (
              <div className="flex flex-col gap-2 px-6">
                <div className="flex items-center gap-3 text-[10px] font-mono text-accent-info animate-pulse">
                   <Zap className="animate-bounce" size={14} />
                   <span>REASONING [PRO_G3_CORE] ...</span>
                </div>
                <div className="h-1 w-32 bg-white/5 rounded-full overflow-hidden">
                   <motion.div 
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="h-full w-1/2 bg-accent-info shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                   />
                </div>
              </div>
            )}
          </div>

          <div className="p-6 bg-black/20 border-t border-white/5">
            <div className="flex gap-4 p-2 bg-bg-sidebar rounded-2xl border border-white/10 focus-within:border-accent-info/50 transition-all shadow-inner">
               <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
                placeholder="Issue global command (e.g., 'Deploy Ubuntu node and show virtual lab')..."
                className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-sm font-medium text-white placeholder:text-text-secondary/40"
               />
               <button 
                onClick={() => sendMessage(input)}
                disabled={loading || !input.trim()}
                className="p-3 bg-accent-info text-white rounded-xl shadow-lg shadow-accent-info/30 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale transition-all"
               >
                 <Send size={20} />
               </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SOCView() {
  const { user } = React.useContext(UserContext);
  const [riskData, setRiskData] = useState<RiskProfile | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [policy, setPolicy] = useState<'MANUAL' | 'AUTO'>('MANUAL');

  const fetchData = async () => {
    try {
      const [riskRes, devRes, alertRes, policyRes] = await Promise.all([
        axios.get('/api/admin/risk-analysis'),
        axios.get('/api/admin/devices'),
        axios.get('/api/admin/alerts'),
        axios.get('/api/admin/policy')
      ]);
      setRiskData(riskRes.data);
      setDevices(devRes.data);
      setAlerts(alertRes.data);
      setPolicy(policyRes.data.revocationPolicy);
    } catch (e) {
      console.warn("SOC Dashboard fetch failed", e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const revokeAccess = async (deviceId: string) => {
    await axios.post('/api/admin/devices/revoke', { deviceId });
    fetchData();
  };

  const togglePolicy = async () => {
    const res = await axios.post('/api/admin/policy/toggle');
    setPolicy(res.data.revocationPolicy);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      {/* Alerts Overlay */}
      <AnimatePresence>
        <div className="fixed top-24 right-10 z-50 flex flex-col gap-4 max-w-md w-full pointer-events-none">
          {alerts.filter(a => a.status === 'ACTIVE').map(alert => (
            <motion.div 
              key={alert.id}
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 50, opacity: 0 }}
              className="bg-bg-card/95 border border-accent-alert/50 p-4 rounded-xl flex items-center justify-between shadow-2xl backdrop-blur-xl pointer-events-auto"
            >
               <div className="flex items-center gap-4">
                 <div className="p-2 bg-accent-alert/10 rounded-lg">
                   <ShieldAlert className="text-accent-alert animate-pulse" size={20} />
                 </div>
                 <div>
                   <div className="font-bold text-accent-alert uppercase text-[10px] tracking-widest">Compliance Alert</div>
                   <div className="text-xs font-semibold leading-tight">{alert.msg}</div>
                 </div>
               </div>
               <div className="flex flex-col gap-2 ml-4">
                  <Button 
                    variant="danger" 
                    className="text-[10px] py-1 h-auto"
                    disabled={user?.role === 'USER'}
                    onClick={() => revokeAccess(alert.deviceId)}
                  >
                    Revoke
                  </Button>
                  <button 
                    disabled={user?.role === 'USER'}
                    onClick={() => axios.post('/api/admin/alerts/clear', { alertId: alert.id }).then(fetchData)} 
                    className="text-[9px] text-text-secondary hover:text-white underline disabled:opacity-30 disabled:no-underline"
                  >
                    Dismiss
                  </button>
               </div>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>

      {/* Risk Scoring Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card title="Threat Velocity (Risk Engine)" className="lg:col-span-2">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={riskData?.trends || []}>
                <defs>
                  <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Area type="monotone" dataKey="score" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRisk)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="AI Enforcement Decision Matrix">
          <div className="space-y-6">
             <div className="flex flex-col gap-4">
                {[
                  { range: '0 - 30', status: 'ALLOW', color: 'accent-safe', desc: 'Baseline trust. No additional challenge.' },
                  { range: '31 - 74', status: 'STEP-UP', color: 'accent-info', desc: 'Require MFA (Passkey/TOTP) due to variance.' },
                  { range: '75 - 100', status: 'BLOCK', color: 'accent-alert', desc: 'Critical anomaly detected. Access denied.' }
                ].map((row, i) => (
                  <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col gap-2">
                     <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono text-text-secondary">PROBABILITY: {row.range}%</span>
                        <span className={cn("px-2 py-0.5 rounded text-[9px] font-bold uppercase", `bg-${row.color}/20 text-${row.color}`)}>{row.status}</span>
                     </div>
                     <p className="text-xs font-semibold leading-tight">{row.desc}</p>
                  </div>
                ))}
             </div>
             <div className="p-4 bg-accent-info/5 border border-accent-info/20 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                   <div className="w-2 h-2 rounded-full bg-accent-info animate-pulse" />
                   <span className="text-[10px] font-bold uppercase tracking-widest text-accent-info">Ensemble Logic</span>
                </div>
                <p className="text-[10px] text-text-secondary italic">Weights: Isolation Forest (30%), Logit (50%), Autoencoder (20%)</p>
             </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card title="AI Intelligence Models (Live Inference)">
           <div className="space-y-6">
              {[
                { 
                  name: 'Isolation Forest', 
                  type: 'Anomaly Detection', 
                  desc: 'Unsupervised learning detecting behavioral outliers in UEBA datasets.', 
                  score: Math.floor(Math.random() * 20) + 5,
                  status: 'STABLE'
                },
                { 
                  name: 'Logistic Regression', 
                  type: 'Binary Classifier', 
                  desc: 'Predictive modeling of malicious login probability based on historical telemetry.', 
                  score: Math.floor(Math.random() * 10) + 12,
                  status: 'ACTIVE'
                },
                { 
                  name: 'Autoencoder', 
                  type: 'Feature Embedding', 
                  desc: 'Deep learning reconstruction error monitoring for complex identity theft patterns.', 
                  score: Math.floor(Math.random() * 5) + 3,
                  status: 'TRAINING'
                }
              ].map((model, i) => (
                <div key={i} className="p-5 bg-bg-sidebar/50 rounded-2xl border border-white/5 space-y-4">
                   <div className="flex justify-between items-start">
                      <div>
                         <h4 className="font-bold text-sm text-text-primary">{model.name}</h4>
                         <span className="text-[9px] text-accent-info font-bold uppercase tracking-widest">{model.type}</span>
                      </div>
                      <div className="px-2 py-1 bg-black/40 rounded text-[8px] font-mono border border-white/5 text-text-secondary">
                         STATUS: {model.status}
                      </div>
                   </div>
                   <p className="text-xs text-text-secondary leading-relaxed">{model.desc}</p>
                   <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-mono">
                         <span className="text-text-secondary">Current Uncertainty</span>
                         <span className="text-text-primary">{model.score}%</span>
                      </div>
                      <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                         <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${model.score}%` }}
                           className="h-full bg-accent-info"
                         />
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </Card>

        <div className="space-y-8">
          <Card title="Cybersecurity Command Center" className="bg-accent-info/[0.02] border-accent-info/20">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { name: 'mTLS Integrity Audit', icon: <Fingerprint size={16} />, status: 'ACTIVE', desc: 'Verifying certificate pinning and rotation status across all nodes.' },
                  { name: 'Global Port-Sweep', icon: <Network size={16} />, status: 'IDLE', desc: 'Horizontal scanning for ephemeral ports and unauthorized listeners.' },
                  { name: 'UEBA Deep Analysis', icon: <Eye size={16} />, status: 'ACTIVE', desc: 'Applying ML scoring to all recent intra-tenant telemetry streams.' },
                ].map((tool, idx) => (
                  <div key={idx} className="p-4 bg-black/20 border border-white/5 rounded-2xl flex flex-col gap-3 group hover:border-accent-info/30 transition-all">
                     <div className="flex items-center justify-between">
                        <div className="p-2 bg-white/5 rounded-lg text-accent-info group-hover:bg-accent-info group-hover:text-white transition-all">{tool.icon}</div>
                        <div className={cn(
                          "text-[8px] font-black uppercase px-2 py-0.5 rounded border",
                          tool.status === 'ACTIVE' ? 'border-accent-safe/30 text-accent-safe animate-pulse' : 'border-white/10 text-text-secondary'
                        )}>
                           {tool.status}
                        </div>
                     </div>
                     <div>
                        <div className="text-[10px] font-black uppercase text-white mb-1">{tool.name}</div>
                        <p className="text-[9px] text-text-secondary leading-tight opacity-60">{tool.desc}</p>
                     </div>
                     <button className="mt-2 py-2 flex items-center justify-center gap-2 bg-white/5 border border-white/5 rounded-xl text-[9px] font-bold uppercase hover:bg-accent-info/10 hover:border-accent-info/50 transition-all">
                        <Zap size={12} />
                        Run Local Scan
                     </button>
                  </div>
                ))}
             </div>
             <div className="mt-8 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                   <div className="text-xs font-black uppercase text-white mb-2 tracking-widest flex items-center gap-2">
                      <ShieldCheck className="text-accent-safe" size={16} /> 
                      Full Cyber-Security Suite Deployment
                   </div>
                   <p className="text-[10px] text-text-secondary max-w-md">Activate all resident security modules simultaneously. This initiates an enterprise-wide audit sequence, triggers SOAR automation, and updates all ZT policies.</p>
                </div>
                <button className="px-10 py-4 bg-accent-info text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-accent-info/20 hover:scale-[1.02] active:scale-95 transition-all">
                   EXECUTE GLOBAL HARDENING
                </button>
             </div>
          </Card>

          <Card title="Infrastructure Compliance & Lab Testing" className="bg-black/5 border-white/5">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col gap-3">
                   <div className="flex items-center gap-2">
                      <div className="p-2 bg-accent-info/20 rounded-lg text-accent-info">
                         <Server size={14} />
                      </div>
                      <span className="text-[10px] font-black uppercase text-text-primary">Ubuntu Node</span>
                   </div>
                   <div className="text-[9px] text-text-secondary leading-tight">Current hardening status: CIS Level 1. NexAgent operational. No drift detected in past 24h.</div>
                   <button 
                    onClick={() => (window as any).setGlobalView('vmlab')}
                    className="mt-2 py-2 bg-accent-info/10 text-accent-info border border-accent-info/30 rounded-lg text-[9px] font-bold uppercase hover:bg-accent-info hover:text-white transition-all"
                   >
                      Run Health Scan
                   </button>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col gap-3">
                   <div className="flex items-center gap-2">
                      <div className="p-2 bg-accent-alert/20 rounded-lg text-accent-alert">
                         <Skull size={14} />
                      </div>
                      <span className="text-[10px] font-black uppercase text-text-primary">Kali Offensive Node</span>
                   </div>
                   <div className="text-[9px] text-text-secondary leading-tight">Simulation readiness: HIGH. Environment isolated from internal VLAN. 12 payloads ready.</div>
                   <button 
                     onClick={() => (window as any).setGlobalView('vmlab')}
                     className="mt-2 py-2 bg-accent-alert/10 text-accent-alert border border-accent-alert/30 rounded-lg text-[9px] font-bold uppercase hover:bg-accent-alert hover:text-white transition-all"
                   >
                      Launch Red-Team Simulation
                   </button>
                </div>
                <div className="p-4 bg-accent-safe/5 rounded-2xl border border-accent-safe/20 flex flex-col gap-3">
                   <div className="flex items-center gap-2">
                      <div className="p-2 bg-accent-safe/20 rounded-lg text-accent-safe">
                         <ShieldCheck size={14} />
                      </div>
                      <span className="text-[10px] font-black uppercase text-accent-safe">Zero-Trust Verification</span>
                   </div>
                   <div className="text-[9px] text-text-secondary leading-tight">Automated OPA policy enforcement checks across virtualized infrastructure.</div>
                   <button 
                     onClick={() => (window as any).setGlobalView('vmlab')}
                     className="mt-2 py-2 bg-accent-safe/10 text-accent-safe border border-accent-safe/30 rounded-lg text-[9px] font-bold uppercase hover:bg-accent-safe hover:text-white transition-all"
                   >
                      Test Access Policies
                   </button>
                </div>
             </div>
          </Card>

          <Card 
            title="Managed Device Registry" 
          headerAction={
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
               <span className="text-[10px] font-bold text-text-secondary uppercase">SOAR Policy:</span>
               <button 
                 onClick={togglePolicy}
                 className={cn(
                   "text-[9px] font-extrabold px-2 py-0.5 rounded transition-all",
                   policy === 'AUTO' ? 'bg-accent-safe text-white' : 'bg-accent-warn text-white'
                 )}
               >
                 {policy} REVOKE
               </button>
            </div>
          }
        >
           <div className="space-y-4">
              {devices.map(dev => (
                <div key={dev.id} className="flex items-center justify-between p-4 bg-black/10 rounded-xl border border-border-subtle group hover:border-accent-info/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-3 rounded-lg",
                      dev.status === 'TRUSTED' ? 'bg-accent-safe/10 text-accent-safe' : 'bg-accent-alert/10 text-accent-alert'
                    )}>
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-bold text-sm">{dev.name}</div>
                      <div className="text-[10px] text-text-secondary flex gap-2">
                        <span>{dev.os}</span>
                        <span>•</span>
                        <span>ID: {dev.id}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded border mb-1 inline-block",
                      dev.health === 'SAFE' ? 'border-accent-safe/30 text-accent-safe' : 'border-accent-alert/30 text-accent-alert animate-pulse'
                    )}>
                      {dev.health}
                    </div>
                    <div className="text-[9px] text-text-secondary font-mono">Last Report: {formatDate(dev.lastReport)}</div>
                  </div>
                  <div className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!dev.revoked ? (
                      <button 
                        onClick={() => revokeAccess(dev.id)}
                        className="p-2 bg-accent-alert/10 text-accent-alert rounded-lg hover:bg-accent-alert/20 transition-all"
                        title="Revoke Access"
                      >
                        <UserMinus size={16} />
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-accent-alert uppercase">Revoked</span>
                    )}
                  </div>
                </div>
              ))}
           </div>
        </Card>

        <Card title="Geospatial Access Intelligence">
           <div className="flex-1 relative bg-black/40 rounded-xl border border-border-subtle overflow-hidden">
              <img src="https://picsum.photos/seed/world/800/600?grayscale&blur=2" className="absolute inset-0 w-full h-full object-cover opacity-20" alt="map" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 flex items-center justify-center">
                 <div className="relative">
                    <div className="w-32 h-32 rounded-full border border-accent-info/20 animate-ping absolute inset-[-32px]" />
                    <div className="w-16 h-16 rounded-full border border-accent-info/30 animate-pulse absolute inset-[-8px]" />
                    <Navigation className="w-6 h-6 text-accent-info relative z-10 rotate-45" />
                 </div>
              </div>
              <div className="absolute bottom-4 left-4 right-4 bg-bg-card/90 backdrop-blur-md border border-border-subtle p-3 rounded-lg">
                 <div className="flex items-center justify-between text-[10px] font-mono mb-2">
                    <span className="text-accent-info uppercase font-bold">Inbound Vector identified</span>
                    <span>14:22:10 UTC</span>
                 </div>
                 <div className="text-xs text-text-secondary">Source: 82.55.192.12 (Paris, FR) {'->'} Service: VAULT_GATEWAY</div>
              </div>
           </div>
        </Card>
      </div>
    </div>
  </motion.div>
);
}

function MobileAgentProView() {
  const [status, setStatus] = useState<'UNINITIALIZED' | 'PAIRING' | 'TRUSTED' | 'REVOKED' | 'COMPLIANCE_ERROR' | 'OFFLINE'>('UNINITIALIZED');
  const [rooted, setRooted] = useState(false);
  const [mtlsActive, setMtlsActive] = useState(false);
  const [vpnActive, setVpnActive] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [riskScore, setRiskScore] = useState(5);
  const [geoRiskTrigger, setGeoRiskTrigger] = useState(false);
  const [certExpired, setCertExpired] = useState(false);
  const [telemetry, setTelemetry] = useState({
    cpu: 12,
    ram: 2.4,
    battery: 88,
    isEncrypted: true
  });

  const [pendingPush, setPendingPush] = useState<any>(null);
  const [pairingQr, setPairingQr] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'PAIRING') {
      QRCode.toDataURL('NEXUS-MCH-DEMO-LINK-JWT-TOKEN-SECURE-HANDSHAKE-AD782', (err, url) => {
        if (!err) setPairingQr(url);
      });
    } else {
      setPairingQr(null);
    }
  }, [status]);

  const performCheckin = async () => {
    if (status === 'UNINITIALIZED' || status === 'PAIRING') return;

    setReporting(true);
    // Simulate telemetry jitter
    setTelemetry(prev => ({
      ...prev,
      cpu: Math.floor(Math.random() * 15) + 5,
      ram: parseFloat((2.4 + Math.random() * 0.2).toFixed(1))
    }));

    try {
      const res = await axios.post('/api/agent/checkin', {
        deviceId: 'MOBILE-PRO-6482',
        health: rooted ? 'ROOTED' : 'SAFE',
        os: 'iOS 17.5 Pro (Simulated)',
        failedLogins: 0,
        geoRisk: geoRiskTrigger ? 0.9 : 0.1,
        hour: new Date().getHours(),
        certExpired,
        features: { vpn: vpnActive, encryption: telemetry.isEncrypted }
      });
      setStatus(rooted || certExpired ? 'COMPLIANCE_ERROR' : 'TRUSTED');
      setRiskScore(res.data.riskScore);
      setPendingPush(res.data.pushNotification);
    } catch (e: any) {
      if (e.response?.data?.error === 'ACCESS_REVOKED') {
        setStatus('REVOKED');
      } else {
        setStatus('OFFLINE');
      }
    } finally {
      setReporting(false);
    }
  };

  const handlePushResponse = async (decision: 'APPROVE' | 'DENY') => {
    if (!pendingPush) return;
    await axios.post('/api/agent/mfa/respond', { requestId: pendingPush.id, decision });
    setPendingPush(null);
    performCheckin();
  };

  const startPairing = () => {
    setStatus('PAIRING');
    setTimeout(() => {
      setStatus('TRUSTED');
      setMtlsActive(true);
      setVpnActive(true);
    }, 4000); // Simulate scanning and handshakes
  };

  const getAIAdvice = async () => {
    setAiLoading(true);
    setAiAdvice(null);
    try {
      const prompt = `Analyze this mobile device security state for a PRO user:
      - Device Health: ${rooted ? 'ROOTED (CRITICAL)' : 'SAFE'}
      - mTLS Identity: ${mtlsActive ? 'ACTIVE' : 'INACTIVE (MISSING)'}
      - VPN Tunnel: ${vpnActive ? 'ACTIVE (ENCRYPTED)' : 'INACTIVE'}
      - ZT Status: ${status}
      Provide a concise 2-sentence security recommendation for a professional mobile analyst.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: "You are the Nexus Mobile Security Advisor for PRO users. Be extremely brief, technical, and direct.",
        }
      });
      setAiAdvice(response.text || "Unable to analyze.");
    } catch (e) {
      setAiAdvice("AI Engine link failed.");
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (status !== 'UNINITIALIZED' && status !== 'PAIRING' && status !== 'REVOKED') performCheckin();
    }, 3000);
    return () => clearInterval(interval);
  }, [status, rooted, geoRiskTrigger, certExpired, vpnActive]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center p-4">
      <div className="w-full max-w-sm aspect-[9/19] bg-[#0a0a0a] rounded-[3.5rem] p-4 border-[10px] border-[#222] shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col scale-100 lg:scale-110">
        {/* Dynamic Island Notch */}
        <div className="w-[100px] h-[30px] bg-black rounded-full self-center absolute top-2 z-30 border border-white/5 flex items-center justify-around px-2">
           <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
           <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
        </div>
        
        {/* App UI */}
        <div className="flex-1 bg-gradient-to-b from-[#111] to-[#000] rounded-[3rem] overflow-hidden flex flex-col relative border border-white/5">
          {/* Status Bar */}
          <div className="flex justify-between items-center px-8 pt-4 text-[10px] text-text-secondary font-bold">
             <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
             <div className="flex items-center gap-1.5">
                <Wifi size={10} />
                <Battery size={10} className="text-accent-safe" />
             </div>
          </div>

          {status === 'UNINITIALIZED' || status === 'PAIRING' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-8">
               <div className="relative">
                  <div className="absolute inset-0 bg-accent-info/20 blur-[40px] animate-pulse rounded-full" />
                  <Smartphone className="w-20 h-20 text-accent-info relative" />
               </div>
               
               <div className="space-y-2">
                 <h2 className="text-xl font-black text-white tracking-tighter uppercase italic">
                    {status === 'UNINITIALIZED' ? 'Link Mobile Pro' : 'Pairing...'}
                 </h2>
                 <p className="text-[10px] text-text-secondary uppercase tracking-widest leading-relaxed">
                    Establish a hardware-backed mTLS trust link with your physical device.
                 </p>
               </div>

               {status === 'UNINITIALIZED' && (
                 <div className="space-y-6 w-full">
                    <div className="aspect-square bg-white p-4 rounded-3xl mx-auto flex items-center justify-center group cursor-pointer relative overflow-hidden" onClick={startPairing}>
                       <QrCode size={160} className="text-black group-hover:scale-105 transition-transform" />
                       <div className="absolute inset-0 bg-accent-info/10 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Zap size={32} className="text-accent-info animate-bounce" />
                          <span className="text-[8px] font-black text-accent-info uppercase mt-2">Tap to Scan</span>
                       </div>
                    </div>
                    <button 
                      onClick={startPairing}
                      className="w-full py-4 bg-accent-info text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-accent-info/20 hover:scale-105 active:scale-95 transition-all"
                    >
                      Initialize Link
                    </button>
                    <p className="text-[7px] text-text-secondary font-mono">ENCRYPTED PAIRING_KEY: 0x8F2...4E1A</p>
                 </div>
               )}

               {status === 'PAIRING' && (
                 <div className="space-y-4">
                    <div className="flex items-center gap-2 text-accent-info animate-pulse">
                       <Loader2 size={16} className="animate-spin" />
                       <span className="text-[10px] font-black tracking-widest uppercase">Negotiating Handshake...</span>
                    </div>
                    <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ x: '-100%' }}
                         animate={{ x: '100%' }}
                         transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                         className="w-1/2 h-full bg-accent-info"
                       />
                    </div>
                 </div>
               )}
            </div>
          ) : (
            <>
              <header className="px-8 mt-10 mb-6 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-accent-info/10 rounded-lg">
                    <Shield className="w-4 h-4 text-accent-info" />
                  </div>
                  <span className="font-black text-xs tracking-[-0.05em] text-white">NEXUS <span className="text-accent-info">PRO</span></span>
                </div>
                <div className="flex gap-1.5">
                  <div className={cn("w-1.5 h-1.5 rounded-full", mtlsActive ? 'bg-accent-safe shadow-[0_0_8px_#10b981]' : 'bg-white/10')} />
                  <div className={cn("w-1.5 h-1.5 rounded-full", vpnActive ? 'bg-accent-info shadow-[0_0_8px_#3b82f6]' : 'bg-white/10')} />
                </div>
              </header>

              <div className="flex-1 px-6 space-y-5 overflow-y-auto custom-scrollbar">
                {/* Device Identity Card */}
                <div className="text-center py-2 relative">
                   <div
                     className={cn(
                       "w-20 h-20 rounded-3xl mx-auto mb-3 flex items-center justify-center border-2 transition-all duration-700",
                       status === 'TRUSTED' ? 'border-accent-safe bg-accent-safe/5' : 
                       status === 'REVOKED' ? 'border-accent-alert bg-accent-alert/10' : 
                       'border-white/10 bg-white/5'
                     )}
                   >
                     {status === 'TRUSTED' ? <ShieldCheck className="w-10 h-10 text-accent-safe" /> : 
                      status === 'REVOKED' ? <Ban className="w-10 h-10 text-accent-alert" /> :
                      <Lock className="w-10 h-10 text-text-secondary" />}
                   </div>
                   <h3 className="text-sm font-bold text-white mb-0.5">
                     {status === 'TRUSTED' ? 'Oussama\'s Device' : status === 'REVOKED' ? 'SYSTEM BAN' : 'Enrolling...'}
                   </h3>
                   <p className="text-[9px] text-text-secondary uppercase tracking-[0.2em] font-mono mb-2">PRO ID: 6482-XQ</p>
                   
                   {/* Risk Score Pill */}
                   <div className="flex justify-center">
                      <div className={cn(
                        "flex items-center gap-1 text-[8px] font-bold px-2 py-0.5 rounded-full border",
                        riskScore > 60 ? 'bg-accent-alert/20 border-accent-alert/50 text-accent-alert' :
                        riskScore > 30 ? 'bg-accent-warn/20 border-accent-warn/50 text-accent-warn' :
                        'bg-accent-safe/20 border-accent-safe/50 text-accent-safe'
                      )}>
                        <Activity size={8} />
                        ADAPTIVE RISK: {riskScore}%
                      </div>
                   </div>
                </div>

                {/* Real-time Health & Encryption Intelligence */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap size={14} className="text-accent-info" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">Real-time Health</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="flex h-1.5 w-1.5 rounded-full bg-accent-safe animate-pulse" />
                      <span className="text-[8px] font-mono text-accent-safe">TELEMETRY_SYNC</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      {[
                        { label: 'CPU LOAD', val: telemetry.cpu, icon: Cpu },
                        { label: 'RAM USAGE', val: Math.round((telemetry.ram / 12) * 100), icon: Database },
                        { label: 'BATTERY', val: telemetry.battery, icon: BatteryLow }
                      ].map((h, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between items-center text-[7px] font-bold text-text-secondary uppercase tracking-tighter">
                            <span className="flex items-center gap-1"><h.icon size={8} /> {h.label}</span>
                            <span className={cn(
                                h.val > 80 ? "text-accent-alert" : h.val > 50 ? "text-accent-warn" : "text-white"
                            )}>{h.val}%</span>
                          </div>
                          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${h.val}%` }}
                              className={cn(
                                "h-full rounded-full",
                                h.val > 80 ? "bg-accent-alert" : h.val > 50 ? "bg-accent-warn" : "bg-accent-safe"
                              )}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="bg-black/40 rounded-xl p-3 flex flex-col justify-center gap-2 border border-white/5 shadow-inner">
                      <div className="flex items-center justify-between text-[7px] font-black uppercase tracking-tighter text-text-secondary">
                        <span>Encryption</span>
                        <Lock size={10} />
                      </div>
                      <div className="space-y-1.5 text-right font-mono">
                         <div className="flex items-center justify-between">
                            <span className="text-[7px] text-text-secondary uppercase">mTLS 1.3</span>
                            <span className={cn("text-[9px] font-bold", mtlsActive ? "text-accent-safe" : "text-white/20")}>
                               {mtlsActive ? "TRUSTED" : "OFFLINE"}
                            </span>
                         </div>
                         <div className="flex items-center justify-between">
                            <span className="text-[7px] text-text-secondary uppercase">V-VPN</span>
                            <span className={cn("text-[9px] font-bold", vpnActive ? "text-accent-info" : "text-white/20")}>
                               {vpnActive ? "ACTIVE" : "DISABLED"}
                            </span>
                         </div>
                         <div className="flex items-center justify-between pt-1 border-t border-white/5">
                            <span className="text-[7px] text-text-secondary uppercase">LATENCY</span>
                            <span className="text-[9px] font-bold text-accent-warn">14ms</span>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Network & Device Intelligence */}
                <div className="grid grid-cols-2 gap-3">
                   <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-[8px] font-black uppercase text-text-secondary tracking-widest">
                         <span>Signal</span>
                         <Signal size={10} />
                      </div>
                      <div className="flex items-end gap-0.5 h-4 px-1">
                         {[3, 5, 4, 6].map((h, i) => (
                           <div key={i} className={cn("flex-1 bg-accent-info/50 rounded-sm w-1", i < 3 ? 'opacity-100' : 'opacity-20')} style={{ height: `${h * 15}%` }} />
                         ))}
                      </div>
                      <span className="text-[10px] font-mono text-white font-bold px-1">4G_LTE.01</span>
                   </div>
                   <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-[8px] font-black uppercase text-text-secondary tracking-widest">
                         <span>IP ADDR</span>
                         <Globe size={10} />
                      </div>
                      <div className="mt-1">
                         <span className="text-[9px] font-mono text-accent-info font-bold truncate block">172.16.0.42</span>
                         <span className="text-[7px] text-text-secondary uppercase block mt-1">SECURE_GATEWAY</span>
                      </div>
                   </div>
                </div>

                {/* Session Replay / Training Video */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PlayCircle size={14} className="text-accent-safe" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">Active Session Replay</span>
                    </div>
                    <span className="text-[8px] font-mono text-text-secondary">ZTNA_PROTO_v1.2</span>
                  </div>
                  
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-black group">
                    <video 
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                      controls
                      autoPlay
                      muted
                      loop
                      playsInline
                    >
                      <source src="https://storage.googleapis.com/temp-public-assets/ztna-demo.mp4" type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-accent-alert/80 text-white text-[7px] font-bold rounded uppercase">Recording</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-white">Hardening: Iptables-Persistent Configuration</span>
                    <span className="text-[7px] text-text-secondary leading-tight">Audit log of manual rule persistence on Ubuntu edge node. Verified by admin.</span>
                  </div>
                </div>

                {/* Feature Toggles */}
                <div className="space-y-2">
                   <div className="text-[8px] font-bold text-text-secondary uppercase tracking-widest px-1">Security Modules</div>
                   
                   <ToggleButton 
                     active={mtlsActive} 
                     onClick={() => setMtlsActive(!mtlsActive)} 
                     label="mTLS Hardware Cert" 
                     icon={<ShieldCheck size={14} />} 
                   />
                   
                   <ToggleButton 
                     active={vpnActive} 
                     onClick={() => setVpnActive(!vpnActive)} 
                     label="Encrypted VPN Tunnel" 
                     icon={<Network size={14} />} 
                   />

                   <ToggleButton 
                     active={rooted} 
                     onClick={() => setRooted(!rooted)} 
                     label="System Integrity (SAFE)" 
                     icon={<Zap size={14} />} 
                     invert={true}
                   />

                   <ToggleButton 
                     active={geoRiskTrigger} 
                     onClick={() => setGeoRiskTrigger(!geoRiskTrigger)} 
                     label="Geospatial Masking" 
                     icon={<Target size={14} />} 
                   />
                </div>

                {/* AI Advisor Card */}
                <div className="bg-accent-info/5 border border-accent-info/20 rounded-2xl p-3 space-y-2">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-accent-info">
                         <Sparkles size={12} />
                         <span className="text-[10px] font-bold">Pro AI Insights</span>
                      </div>
                      <button 
                        onClick={getAIAdvice}
                        disabled={aiLoading}
                        className="text-[10px] text-accent-info underline font-medium disabled:opacity-50"
                      >
                        {aiLoading ? 'Analyzing...' : 'Refresh'}
                      </button>
                   </div>
                   {aiAdvice ? (
                     <p className="text-[10px] text-text-secondary italic leading-tight">"{aiAdvice}"</p>
                   ) : (
                     <p className="text-[10px] text-white/40 leading-tight">Click refresh for live compliance analysis.</p>
                   )}
                </div>
              </div>

              {/* Bottom Indicators */}
              <div className="h-24 px-8 flex items-center justify-between">
                 <div className="flex flex-col">
                    <span className="text-[9px] text-white font-bold">mTLS IDENT_ACTIVE</span>
                    <span className="text-[7px] text-text-secondary">ENCRYPTED END-TO-END</span>
                 </div>
                 <div className="w-12 h-12 rounded-full bg-white/5 border border-white/5 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-accent-safe animate-pulse" />
                 </div>
              </div>
            </>
          )}

          <div className="h-1 w-24 bg-white/20 rounded-full self-center mb-2" />
        </div>

        {/* MFA Notification Modal */}
        <AnimatePresence>
          {pendingPush && (
            <motion.div 
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              className="absolute top-10 left-6 right-6 z-50 bg-[#1a1a1a]/95 border border-accent-info/30 rounded-[2.5rem] p-6 shadow-2xl backdrop-blur-2xl"
            >
               {pendingPush.type === 'BIOMETRIC' ? (
                 <div className="text-center space-y-6">
                    <div className="relative w-20 h-20 mx-auto">
                       <motion.div 
                         animate={{ 
                           scale: [1, 1.2, 1],
                           opacity: [0.5, 1, 0.5],
                           rotate: [0, 90, 180, 270, 360]
                         }}
                         transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                         className="absolute inset-0 border-2 border-dashed border-accent-info rounded-full"
                       />
                       <div className="absolute inset-2 bg-accent-info/10 rounded-full flex items-center justify-center">
                          <ScanFace className="text-accent-info animate-pulse" size={32} />
                       </div>
                    </div>
                    <div className="space-y-1">
                       <div className="flex justify-center gap-2 mb-2">
                          <div className={cn(
                            "px-2 py-0.5 rounded-full text-[7px] font-bold border",
                            pendingPush.riskScore > 30 ? 'bg-accent-warn/10 border-accent-warn/30 text-accent-warn' : 'bg-accent-safe/10 border-accent-safe/30 text-accent-safe'
                          )}>
                             RISK: {pendingPush.riskScore || 0}%
                          </div>
                          <div className="px-2 py-0.5 rounded-full text-[7px] font-bold border bg-accent-info/10 border-accent-info/30 text-accent-info">
                             ZERO TRUST VERIFIED
                          </div>
                       </div>
                       <h3 className="text-sm font-black text-white uppercase tracking-tighter">Face ID Verification</h3>
                       <p className="text-[10px] text-text-secondary">Authenticating session for <br/><span className="text-white font-mono">{pendingPush.userId}</span></p>
                    </div>
                    <div className="flex flex-col gap-3">
                       <button 
                         onClick={() => handlePushResponse('APPROVE')}
                         className="w-full py-4 bg-accent-info text-white text-xs font-bold rounded-2xl shadow-lg shadow-accent-info/20 active:scale-95 transition-all"
                       >
                         Approve with Face ID
                       </button>
                       <button 
                         onClick={() => handlePushResponse('DENY')}
                         className="text-[10px] text-accent-alert font-bold uppercase tracking-widest opacity-60 hover:opacity-100"
                       >
                         Decline Request
                       </button>
                    </div>
                 </div>
               ) : (
                 <>
                   <div className="flex items-center gap-3 mb-4">
                     <div className="p-2.5 bg-accent-info/20 rounded-2xl"><Key className="text-accent-info" size={20} /></div>
                     <div>
                       <div className="text-xs font-bold text-white uppercase tracking-wider">Access Request</div>
                       <div className="text-[10px] text-text-secondary">{pendingPush.userId}</div>
                     </div>
                   </div>
                   <p className="text-[10px] mb-6 text-text-secondary leading-relaxed">
                      Authentication attempt detected from <span className="text-white font-bold">{pendingPush.ip}</span>. Requires manual biometric approval.
                   </p>
                   <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => handlePushResponse('APPROVE')}
                        className="w-full py-3 bg-accent-safe text-white text-xs font-bold rounded-2xl hover:bg-accent-safe/80 transition-all active:scale-95"
                      >
                        Confirm Biometric Login
                      </button>
                      <button 
                        onClick={() => handlePushResponse('DENY')}
                        className="w-full py-2 text-accent-alert text-[10px] font-bold rounded-xl hover:bg-accent-alert/10 transition-all"
                      >
                        Reject Access
                      </button>
                   </div>
                 </>
               )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function ToggleButton({ active, onClick, label, icon, invert = false }: any) {
  const isOk = invert ? !active : active;
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full p-2.5 rounded-2xl border transition-all flex items-center justify-between",
        isOk ? "bg-white/5 border-white/5 text-white" : "bg-accent-alert/5 border-accent-alert/20 text-accent-alert"
      )}
    >
      <div className="flex items-center gap-3">
         <div className={cn("p-1.5 rounded-lg", isOk ? "bg-white/5 text-text-secondary" : "bg-accent-alert/10 text-accent-alert")}>
            {icon}
         </div>
         <span className="text-[10px] font-bold">{label}</span>
      </div>
      <div className={cn("w-7 h-4 rounded-full relative transition-colors", isOk ? 'bg-accent-safe' : 'bg-accent-alert')}>
         <div className={cn("absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm", active ? 'right-0.5' : 'left-0.5')} />
      </div>
    </button>
  );
}

function NexusAssistant({ contextData }: { contextData: any }) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sendMessage = async () => {
    if (!query.trim() || loading) return;

    const userMsg = { role: 'user', content: query };
    setMessages(prev => [...prev, userMsg]);
    const currentQuery = query;
    setQuery("");
    setLoading(true);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: currentQuery,
        config: {
          systemInstruction: `You are Nexus AI, a Tier-3 SOC Analyst assistant. 
          You operate within the Nexus SOC platform.
          Current system context: ${JSON.stringify(contextData?.stats || {})}.
          Recent anomalies: ${JSON.stringify(contextData?.anomalies?.slice(0, 5) || [])}.
          Provide professional, technical, and actionable security insights. 
          Format using markdown. Be concise.`
        }
      });

      const aiMsg = { role: 'assistant', content: response.text };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Analysis failed. Model recalibration required." }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <Card title="Nexus AI Core: Smart Analyst" icon={<BrainCircuit className="text-accent-info" size={18} />}>
      <div className="flex flex-col h-[500px]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 mb-4 p-2 custom-scrollbar">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50 px-8">
              <Bot size={48} className="mb-4 text-accent-info" />
              <p className="text-xs uppercase tracking-widest font-black">AI Intelligence Layer Active</p>
              <p className="text-[10px] mt-2 leading-relaxed">Ask me to analyze the current threat landscape or generate a remediation plan for recent anomalies.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={cn(
              "p-3 rounded-xl max-w-[90%] text-xs leading-relaxed",
              m.role === 'user' ? "bg-accent-info/10 text-accent-info ml-auto border border-accent-info/20" : "bg-white/5 border border-white/10"
            )}>
              <div className="flex items-center gap-2 mb-1 opacity-50 uppercase font-black text-[9px] tracking-widest">
                {m.role === 'user' ? <User size={10} /> : <Bot size={10} />}
                {m.role === 'user' ? 'Operator' : 'Nexus AI'}
              </div>
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-[10px] text-accent-info animate-pulse p-2">
              <RefreshCcw size={10} className="animate-spin" />
              SYNCHRONIZING WITH THREAT INTEL FABRIC...
            </div>
          )}
        </div>
        <div className="flex gap-2 p-2 bg-black/40 rounded-xl border border-white/5">
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask AI for threat analysis..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-xs px-2"
          />
          <Button size="sm" onClick={sendMessage} disabled={loading || !query.trim()}>
            <Send size={14} />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function TrafficVisualization({ traffic, devices }: { traffic: any[], devices: any[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || devices.length === 0) return;

    const width = containerRef.current.clientWidth;
    const height = 300;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Map devices to nodes
    const nodes = devices.map((d, i) => ({
      id: d.ip,
      name: d.type,
      x: (width / (devices.length + 1)) * (i + 1),
      y: height / 2,
      color: d.status === 'Online' ? '#10B981' : '#EF4444'
    }));

    // Draw lines/pipes
    svg.append('line')
      .attr('x1', width * 0.1)
      .attr('y1', height / 2)
      .attr('x2', width * 0.9)
      .attr('y2', height / 2)
      .attr('stroke', '#ffffff10')
      .attr('stroke-width', 2);

    // Draw Nodes
    const nodeGroups = svg.selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x}, ${d.y})`);

    nodeGroups.append('circle')
      .attr('r', 12)
      .attr('fill', '#000')
      .attr('stroke', d => d.color)
      .attr('stroke-width', 2);

    nodeGroups.append('text')
      .attr('dy', 30)
      .attr('text-anchor', 'middle')
      .attr('fill', '#999')
      .attr('font-size', '8px')
      .attr('font-weight', 'bold')
      .text(d => d.name);

    nodeGroups.append('text')
      .attr('dy', 42)
      .attr('text-anchor', 'middle')
      .attr('fill', '#555')
      .attr('font-size', '7px')
      .attr('font-family', 'monospace')
      .text(d => d.id);

  }, [devices]);

  // Animate latest packet
  useEffect(() => {
    if (!svgRef.current || traffic.length === 0) return;
    const latest = traffic[0];
    const width = containerRef.current?.clientWidth || 800;
    const height = 300;

    const svg = d3.select(svgRef.current);

    // Filter valid sources/targets from visual devices
    const sourceNode = devices.find(d => d.ip === latest.source) || { x: 50 };
    const targetNode = devices.find(d => d.ip === latest.target) || { x: width - 50 };

    const startX = (sourceNode as any).x || 50;
    const endX = (targetNode as any).x || width - 50;

    const packet = svg.append('circle')
      .attr('r', 4)
      .attr('fill', latest.protocol === 'TCP' ? '#10B981' : '#0EA5E9')
      .attr('cx', startX)
      .attr('cy', height / 2)
      .attr('filter', 'drop-shadow(0 0 8px currentColor)');

    packet.transition()
      .duration(1000)
      .ease(d3.easeCubicInOut)
      .attr('cx', endX)
      .remove();

  }, [traffic]);

  return (
    <div ref={containerRef} className="w-full h-[300px] bg-black/20 rounded-2xl border border-white/5 overflow-hidden relative">
      <div className="absolute top-4 left-6 flex items-center gap-2">
         <div className="w-2 h-2 rounded-full bg-accent-info animate-pulse" />
         <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Live Vector Analytics</span>
      </div>
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}

function NetworkDashboardView() {
  const [activeTraffic, setActiveTraffic] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [riskScore, setRiskScore] = useState(42);

  useEffect(() => {
    // Real-time traffic analysis using ML Engine
    const interval = setInterval(async () => {
      const val = Math.floor(Math.random() * 100);
      
      const deviceIps = [
        '192.168.1.1',
        '192.168.1.45',
        '192.168.1.112',
        '192.168.1.200'
      ];
      
      const sourceIp = deviceIps[Math.floor(Math.random() * deviceIps.length)];
      let targetIp = deviceIps[Math.floor(Math.random() * deviceIps.length)];
      while (targetIp === sourceIp) {
        targetIp = deviceIps[Math.floor(Math.random() * deviceIps.length)];
      }

      const newPacket = {
        id: Math.random().toString(36),
        source: sourceIp,
        target: targetIp,
        protocol: ['TCP', 'UDP', 'ICMP', 'HTTPS'][Math.floor(Math.random() * 4)],
        size: Math.floor(Math.random() * 1500),
        timestamp: Date.now()
      };

      try {
        const mlRes = await axios.post('/api/ai/risk-score', {
           frequency: val,
           geo_change: Math.random() > 0.9 ? 1 : 0
        });
        const risk = mlRes.data.risk_score;
        setChartData(prev => [...prev.slice(-19), { time: new Date().toLocaleTimeString(), value: val, risk: risk }]);
        setRiskScore(risk);
      } catch (e) {
        setRiskScore(10); // fallback
      }
      
      setActiveTraffic(prev => [newPacket, ...prev].slice(0, 50));
    }, 2000);

    setDevices([
      { ip: '192.168.1.1', mac: '00:1A:2B:3C:4D:5E', status: 'Online', type: 'Gateway' },
      { ip: '192.168.1.45', mac: 'A1:B2:C3:D4:E5:F6', status: 'Online', type: 'Workstation' },
      { ip: '192.168.1.112', mac: '88:77:66:55:44:33', status: 'Suspicious', type: 'IoT Device' },
      { ip: '192.168.1.200', mac: 'FF:EE:DD:CC:BB:AA', status: 'Online', type: 'Mobile' }
    ]);

    setAlerts([
      { id: 1, type: 'Critical', msg: 'DDoS Pattern Detected on Port 80', time: '2m ago' },
      { id: 2, type: 'Warning', msg: 'Multiple failed SSH attempts - 192.168.1.112', time: '15m ago' },
      { id: 3, type: 'Info', msg: 'New device "Nexus_Alpha" connected', time: '1h ago' }
    ]);

    return () => clearInterval(interval);
  }, []);

  const generateReport = () => {
    alert("Protocol Nexus: Génération du rapport PDF en cours. Le document sera disponible dans votre coffre-fort sécurisé.");
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto p-4 lg:p-8 h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar">
      {/* Top Header with Report Button */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Command & Control</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-accent-info">Real-time Intelligence Overlay</p>
        </div>
        <Button 
          onClick={generateReport}
          className="bg-white/5 border border-white/10 hover:bg-white/10 text-white px-6 flex items-center gap-2"
        >
          <FileText size={16} />
          <span className="font-black uppercase text-[10px] tracking-widest">Export Intelligence</span>
        </Button>
      </div>

      <SecurityCharts data={chartData} riskScore={riskScore} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Bandwidth (IN)', value: '142 MB/s', color: 'text-accent-info', icon: <Download size={20} /> },
          { label: 'Bandwidth (OUT)', value: '18.5 MB/s', color: 'text-accent-safe', icon: <Paperclip size={20} /> },
          { label: 'Active Sessions', value: '1,284', color: 'text-white', icon: <Users size={20} /> },
          { label: 'Threat Level', value: 'High', color: 'text-accent-alert', icon: <ShieldAlert size={20} /> }
        ].map((s, i) => (
          <div key={i} className="bg-bg-sidebar/50 border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-3 rounded-2xl bg-white/5", s.color)}>{s.icon}</div>
              <div className="w-2 h-2 rounded-full bg-accent-safe animate-pulse" />
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-1">{s.label}</div>
            <div className={cn("text-2xl font-black italic tracking-tighter", s.color)}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
        {/* Real-time Traffic visualization Area */}
        <div className="lg:col-span-2 bg-bg-sidebar/30 border border-white/5 rounded-[2.5rem] p-8 flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Activity className="text-accent-info" />
              <h3 className="text-sm font-black uppercase tracking-widest text-white italic">Flux de Paquets Temps Réel</h3>
            </div>
            <div className="px-3 py-1 bg-accent-info/10 text-accent-info text-[8px] font-black uppercase tracking-widest rounded-full border border-accent-info/20">
              Live Monitoring
            </div>
          </div>
          
          <div className="mb-8">
            <TrafficVisualization traffic={activeTraffic} devices={devices} />
          </div>
          
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-[10px] font-bold uppercase tracking-wider">
              <thead className="text-neutral-500 border-b border-white/5">
                <tr>
                  <th className="pb-4">Timestamp</th>
                  <th className="pb-4">Source IP</th>
                  <th className="pb-4">Protocole</th>
                  <th className="pb-4">Status</th>
                  <th className="pb-4">Payload (kB)</th>
                </tr>
              </thead>
              <tbody className="text-white divide-y divide-white/5">
                {activeTraffic.map(p => (
                  <tr key={p.id} className="group">
                    <td className="py-3 font-mono opacity-50">{new Date(p.timestamp).toLocaleTimeString()}</td>
                    <td className="py-3 text-accent-info">{p.source}</td>
                    <td className="py-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[8px]",
                        p.protocol === 'TCP' ? "bg-accent-safe/10 text-accent-safe" : "bg-accent-info/10 text-accent-info"
                      )}>
                        {p.protocol}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent-safe" />
                        Passé
                      </div>
                    </td>
                    <td className="py-3">{p.size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Security Alerts Side */}
        <div className="flex flex-col gap-6">
          <div className="bg-bg-sidebar/50 border border-white/5 rounded-3xl p-6">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-alert mb-6">Alertes de Menace</h4>
            <div className="space-y-4">
              {alerts.map(a => (
                <div key={a.id} className="p-4 bg-black/40 border-l-4 border-accent-alert rounded-r-2xl">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[9px] font-black bg-accent-alert/20 text-accent-alert px-2 py-0.5 rounded uppercase tracking-widest">{a.type}</span>
                    <span className="text-[8px] text-neutral-500 uppercase">{a.time}</span>
                  </div>
                  <p className="text-[10px] font-medium text-white italic">{a.msg}</p>
                </div>
              ))}
            </div>
            <Button className="w-full mt-6 py-2 bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest text-neutral-400">Voir l'historique complet</Button>
          </div>

          <div className="bg-bg-sidebar/50 border border-white/5 rounded-[2rem] p-6 flex-1">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-safe mb-6">Inventaire Appareils</h4>
            <div className="space-y-4">
              {devices.map((d, i) => (
                <div key={i} className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-white/5">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                    d.status === 'Suspicious' ? "bg-accent-alert/10 border-accent-alert/30 text-accent-alert" : "bg-white/5 border-white/10 text-neutral-500"
                  )}>
                    {d.type === 'Gateway' ? <Globe size={18} /> : <Monitor size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-black text-white uppercase tracking-tighter truncate">{d.ip}</div>
                    <div className="text-[8px] text-neutral-500 font-bold uppercase tracking-widest">{d.mac}</div>
                  </div>
                  <div className={cn(
                    "text-[8px] font-black uppercase tracking-widest",
                    d.status === 'Suspicious' ? "text-accent-alert" : "text-accent-safe"
                  )}>{d.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LogAnalysisView() {
  const [logs, setLogs] = useState("");
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const runAiAnalysis = async () => {
    if (!logs.trim() || analyzing) return;
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyse ces logs de sécurité réseau et identifie les menaces, anomalies ou points critiques. Format: Markdown structuré (Nexus Expert Tone). Logs:\n${logs}`
      });
      setAnalysis(response.text || "Analyse terminée sans résultat probant.");
    } catch (error) {
      console.error("Analysis Error:", error);
      setAnalysis("Erreur lors de l'analyse sécurisée. Veuillez réessayer.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar p-4">
      <div className="bg-bg-sidebar/50 rounded-[2.5rem] p-8 border border-white/5 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Terminal className="text-accent-info" />
          <h3 className="text-sm font-black uppercase tracking-widest text-white italic">Module d'Analyse de Logs</h3>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed mb-6 uppercase tracking-widest opacity-50">
          Injectez vos logs bruts (Syslog, Nginx, Firewall) pour une détection d'anomalies assistée par l'intelligence artificielle Nexus.
        </p>
        
        <textarea 
          value={logs}
          onChange={(e) => setLogs(e.target.value)}
          placeholder="Copiez vos logs ici..."
          className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 text-xs font-mono text-accent-info h-64 focus:ring-1 focus:ring-accent-info/50 focus:border-accent-info/50 transition-all resize-none custom-scrollbar"
        />

        <div className="flex justify-center mt-8">
          <Button 
            onClick={runAiAnalysis}
            disabled={!logs.trim() || analyzing}
            className="px-12 py-4 bg-accent-info text-white rounded-2xl shadow-lg shadow-accent-info/20 hover:scale-105 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-3"
          >
            {analyzing ? <Loader2 size={18} className="animate-spin" /> : <Cpu size={18} />}
            {analyzing ? "Déchiffrement en cours..." : "Lancer l'Analyse Expert"}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {analysis && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-bg-sidebar/30 rounded-[2.5rem] border border-accent-info/20 p-10 overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 p-8 border-l border-b border-white/5 text-[9px] font-black uppercase tracking-[0.4em] text-accent-info opacity-30">
              Nexus Report v4.2
            </div>
            <div className="prose prose-invert max-w-none prose-sm text-text-primary leading-relaxed markdown-body">
              <ReactMarkdown>{analysis}</ReactMarkdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UserProfileView() {
  return (
    <div className="flex flex-col lg:flex-row gap-8 max-w-6xl mx-auto h-[calc(100vh-140px)]">
      <div className="flex-1 overflow-y-auto space-y-8 custom-scrollbar">
        <div className="bg-bg-sidebar/50 rounded-[2.5rem] p-12 border border-white/5 backdrop-blur-xl relative overflow-hidden flex flex-col items-center">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-accent-info/20 to-accent-safe/20" />
          <div className="relative mt-8">
            <div className="w-32 h-32 rounded-[2rem] bg-neutral-900 border-4 border-black flex items-center justify-center overflow-hidden shadow-2xl">
              {auth.currentUser?.photoURL ? <img src={auth.currentUser.photoURL} className="w-full h-full object-cover" /> : <User size={48} className="text-neutral-500" />}
            </div>
            <button className="absolute bottom-0 right-0 p-2 bg-accent-info text-white rounded-xl border-4 border-black shadow-lg">
              <PlusCircle size={16} />
            </button>
          </div>
          <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mt-6 mb-1">{auth.currentUser?.displayName || 'Elite Operator'}</h2>
          <p className="text-accent-info text-[10px] font-black uppercase tracking-[0.4em] mb-4">Nexus System Administrator</p>
          <div className="flex gap-4">
            <Button className="px-6 bg-white text-black hover:bg-neutral-200">Modifier</Button>
            <Button className="px-6 bg-white/5 border border-white/10 hover:bg-white/10 text-white">Partager</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Publications', value: '42', icon: <FileText size={16} /> },
            { label: 'Connexions', value: '1.2K', icon: <Users size={16} /> },
            { label: 'Niveau Nexus', value: '4.8', icon: <Sparkles size={16} /> }
          ].map((stat, i) => (
            <div key={i} className="bg-bg-sidebar/30 rounded-3xl p-6 border border-white/5 flex items-center gap-4 group hover:bg-white/5 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-neutral-500 group-hover:text-accent-info transition-colors">
                {stat.icon}
              </div>
              <div>
                <div className="text-xl font-black text-white tracking-tighter">{stat.value}</div>
                <div className="text-[8px] font-black uppercase tracking-widest text-neutral-500">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full lg:w-80 space-y-6">
        <div className="bg-bg-sidebar/50 rounded-3xl p-6 border border-white/5">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-info mb-4">Bio Analytique</h4>
          <p className="text-xs text-text-secondary leading-relaxed italic mb-6">
            "Architecte de systèmes autonomes passionné par la cybersécurité et l'IA générative. Membre pionnier de la Nexus Elite Matrix."
          </p>
          <div className="pt-6 border-t border-white/5 space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-alert mb-4">Security Clearances</h4>
            {[
              { label: 'Protocole SOC', status: 'Authorized', color: 'text-accent-safe' },
              { label: 'Secure Core Access', status: 'Restricted', color: 'text-accent-info' },
              { label: 'Offensive Simulation', status: 'Admin Only', color: 'text-accent-alert' }
            ].map((cl, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase text-neutral-500">{cl.label}</span>
                <span className={cn("text-[8px] font-black uppercase tracking-widest", cl.color)}>{cl.status}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-bg-sidebar/50 rounded-3xl p-6 border border-white/5">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-safe mb-4">Compétences</h4>
          <div className="flex flex-wrap gap-2">
            {['React', 'Firebase', 'LLM', 'Nexus Protocol', 'SOC-2'].map(s => (
              <span key={s} className="px-2 py-1 bg-white/5 border border-white/5 rounded text-[8px] font-black uppercase tracking-widest text-neutral-400">{s}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DirectMessageView() {
  return (
    <div className="flex h-[calc(100vh-140px)] bg-black/20 rounded-3xl overflow-hidden border border-white/5 backdrop-blur-xl">
      <div className="w-80 border-r border-white/5 flex flex-col bg-bg-sidebar/50 shadow-2xl">
        <div className="p-6 border-b border-white/5 bg-black/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-white italic">Messages</h3>
            <button className="p-2 hover:bg-accent-info/20 text-accent-info rounded-xl border border-accent-info/20 transition-all"><PlusCircle size={18} /></button>
          </div>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Rechercher..." 
              className="w-full bg-white/5 border border-white/5 rounded-xl pl-8 pr-4 py-2 text-[10px] focus:ring-1 focus:ring-accent-info/30 uppercase font-black"
            />
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="group relative flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border border-transparent hover:bg-white/5 hover:border-white/5">
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center border border-white/10 group-hover:border-accent-info/30 transition-all">
                  <User size={20} className="text-neutral-500 group-hover:text-accent-info transition-colors" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-accent-safe border-4 border-black" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-black text-white uppercase tracking-tighter">Nexus_Operator_{i}</span>
                  <span className="text-[8px] text-neutral-600 font-bold uppercase tracking-widest">14:02</span>
                </div>
                <p className="text-[10px] text-neutral-500 truncate italic">Transmission de données chiffrées en attente...</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-black/10">
        <div className="w-24 h-24 bg-accent-info/10 rounded-3xl flex items-center justify-center mb-8 border border-accent-info/10 animate-pulse">
          <MessageCircle size={48} className="text-accent-info" />
        </div>
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-4 italic">Nexus Secure Channel</h2>
        <p className="max-w-md text-xs text-text-secondary leading-relaxed uppercase tracking-widest opacity-50">
          Sélectionnez un canal pour initier une communication cryptée de bout en bout conforme au protocole Nexus V4.
        </p>
      </div>
    </div>
  );
}

function SecurityCharts({ data, riskScore }: { data: any[], riskScore: number }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
      <div className="bg-bg-sidebar/50 rounded-3xl p-6 border border-white/5 backdrop-blur-xl h-80">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-info">Traffic Volume (24h)</h4>
          <span className="text-[10px] font-mono text-neutral-500 italic">Live Stream</span>
        </div>
        <ResponsiveContainer width="100%" height="85%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <XAxis dataKey="time" hide />
            <YAxis hide />
            <Tooltip 
              contentStyle={{ background: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '10px' }}
              itemStyle={{ color: '#0EA5E9' }}
            />
            <Area type="monotone" dataKey="value" stroke="#0EA5E9" fillOpacity={1} fill="url(#colorTraffic)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-bg-sidebar/50 rounded-3xl p-6 border border-white/5 backdrop-blur-xl h-80">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-alert">System Risk Index</h4>
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full animate-pulse", riskScore > 70 ? "bg-accent-alert" : "bg-accent-safe")} />
            <span className="text-[10px] font-black text-white italic">{riskScore}/100</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height="85%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <XAxis dataKey="time" hide />
            <YAxis hide />
            <Tooltip 
              contentStyle={{ background: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '10px' }}
            />
            <Line type="stepAfter" dataKey="risk" stroke={riskScore > 70 ? "#EF4444" : "#10B981"} strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AttackSimulatorView() {
  const [activeAttack, setActiveAttack] = useState<string | null>(null);
  const [simProgress, setSimProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const startSimulation = async (type: string) => {
    setActiveAttack(type);
    setSimProgress(0);
    setLogs([`[SYSTEM] Initiating ${type} simulation...`, `[AUTH] Security bypassing attempt detected from 103.42.1.9`]);
    
    // Simulate attack features for ML analysis
    const features = {
      failed_attempts: type === 'Dictionary Brute Force' ? 15 : 0,
      ports_scanned: type === 'Flood DDoS Attack' ? 500 : (type === 'Network Scan' ? 100 : 0),
      rapid_requests: type === 'Flood DDoS Attack' ? 1000 : 50,
      geo_change: 1
    };

    try {
      const res = await axios.post('/api/ai/risk-score', features);
      const { risk_score, label, confidence } = res.data;
      setLogs(l => [...l, `[ML ENGINE] Attack identified as ${label} (${Math.round(confidence * 100)}% confidence).`, `[ML ENGINE] Real-time Risk Score escalated to ${risk_score}%.`]);
    } catch (e) {
      console.warn("AI Assessment failed during simulation", e);
    }

    const interval = setInterval(() => {
      setSimProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setLogs(l => [...l, `[IDS] IPS mitigé - Malicious packets dropped.`, `[SYSTEM] Simulation complete.`]);
          return 100;
        }
        return prev + 5;
      });
      setLogs(l => [...l, `[NET] Unusual traffic pattern on port ${Math.floor(Math.random() * 1024)}`]);
    }, 500);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-bg-sidebar/50 rounded-[2.5rem] p-10 border border-white/5 backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-white/5" />
            <div className="flex items-center gap-4 mb-8">
              <Skull className="text-accent-alert" size={32} />
              <div>
                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">War Room Simulation</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500">Cyber Offensive Analysis Module</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { id: 'ddos', label: 'Flood DDoS Attack', icon: <Activity size={20} />, color: 'bg-accent-alert' },
                { id: 'brute', label: 'Dictionary Brute Force', icon: <Lock size={20} />, color: 'bg-accent-info' },
                { id: 'sql', label: 'SQL Injection Sequence', icon: <Terminal size={20} />, color: 'bg-accent-safe' },
                { id: 'ransom', label: 'Encrypted Payload Deployment', icon: <Skull size={20} />, color: 'bg-neutral-800' }
              ].map(sim => (
                <button 
                  key={sim.id}
                  onClick={() => startSimulation(sim.label)}
                  disabled={activeAttack !== null && simProgress < 100}
                  className="flex items-center gap-4 p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-white/20 transition-all text-left group"
                >
                  <div className={cn("p-4 rounded-2xl group-hover:scale-110 transition-transform", sim.color + "/20 text-white")}>
                    {sim.icon}
                  </div>
                  <span className="text-xs font-black text-white uppercase tracking-tighter italic">{sim.label}</span>
                </button>
              ))}
            </div>
            
            {activeAttack && (
              <div className="mt-12 space-y-4">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[10px] font-black uppercase text-accent-info tracking-widest">{activeAttack} In Progress</span>
                  <span className="text-xl font-black text-white italic">{simProgress}%</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${simProgress}%` }}
                    className="h-full bg-accent-info shadow-[0_0_20px_#0EA5E9]"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="bg-black/60 rounded-[2.5rem] p-8 border border-white/5 font-mono text-[10px]">
             <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
                <span className="text-neutral-500 uppercase font-bold tracking-widest">Real-time Telemetry Logs</span>
                <div className="flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent-alert animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-accent-info" />
                </div>
             </div>
             <div className="space-y-1 h-64 overflow-y-auto custom-scrollbar">
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-4">
                    <span className="text-neutral-700 shrink-0">[{new Date().toLocaleTimeString()}]</span>
                    <span className={cn(
                      log.includes('[IDS]') ? "text-accent-safe" : 
                      log.includes('[ERR]') || log.includes('detected') ? "text-accent-alert" : "text-accent-info"
                    )}>{log}</span>
                  </div>
                ))}
                {activeAttack && simProgress < 100 && (
                  <div className="flex gap-2 items-center text-accent-info">
                    <Loader2 size={12} className="animate-spin" />
                    <span>Processing packets...</span>
                  </div>
                )}
             </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-bg-sidebar/50 rounded-3xl p-8 border border-white/5 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-accent-alert/10 flex items-center justify-center mb-6 border border-accent-alert/20">
              <ShieldAlert size={40} className="text-accent-alert" />
            </div>
            <h4 className="text-sm font-black text-white uppercase italic mb-2">SOC Threat Level</h4>
            <div className="text-5xl font-black text-accent-alert italic mb-6">HIGH</div>
            <p className="text-[10px] text-neutral-500 uppercase leading-relaxed tracking-widest">
              L'infrastructure Nexus est actuellement sous protocole de surveillance renforcée. Toute activité suspecte est transmise au module d'IA pour analyse immédiate.
            </p>
          </div>

          <div className="bg-bg-sidebar/50 rounded-3xl p-8 border border-white/5">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-info mb-6">Expert Remediation</h4>
            <div className="p-4 bg-accent-info/5 border border-accent-info/20 rounded-2xl">
              <p className="text-[11px] text-accent-info italic leading-relaxed">
                "Activez le filtrage Geo-IP immédiat pour les zones non-reconnues. Redirigez le trafic suspect vers le honeypot 'Nexus-Trap-01'."
              </p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">— AI Security Expert</span>
                <button className="text-[8px] font-black text-accent-info underline uppercase tracking-widest">Appliquer Fix</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecurityScannerView() {
  const [scanning, setScanning] = useState(false);
  const [target, setTarget] = useState("192.168.1.0/24");
  const [results, setResults] = useState<any[]>([]);

  const runScan = () => {
    setScanning(true);
    setResults([]);
    let found = 0;
    const interval = setInterval(() => {
      const ports = [22, 80, 443, 3306, 5432, 8080];
      const randomPort = ports[Math.floor(Math.random() * ports.length)];
      setResults(prev => [
        { port: randomPort, service: randomPort === 22 ? 'SSH' : randomPort === 80 ? 'HTTP' : 'Custom', status: 'Open', risk: Math.random() > 0.8 ? 'High' : 'Low' },
        ...prev
      ]);
      found++;
      if (found >= 10) {
        clearInterval(interval);
        setScanning(false);
      }
    }, 400);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar p-4">
      <div className="bg-bg-sidebar/50 rounded-[2.5rem] p-10 border border-white/5 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row items-center gap-8 mb-12">
          <div className="w-24 h-24 rounded-3xl bg-accent-safe/10 border border-accent-safe/20 flex items-center justify-center shrink-0">
             <Radar size={48} className="text-accent-safe animate-pulse" />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-2">Infrastructure Scanner</h3>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500">Advanced Inventory & Port Discovery Suite</p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <input 
              type="text" 
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-xs font-mono text-white focus:ring-1 focus:ring-accent-info/50 outline-none w-full md:w-64"
            />
            <Button 
              onClick={runScan}
              disabled={scanning}
              className="px-8 bg-accent-safe text-white rounded-2xl shadow-lg shadow-accent-safe/20 flex items-center gap-2"
            >
              {scanning ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
              <span className="font-black uppercase text-[10px] tracking-widest">{scanning ? "Scanning..." : "Scan"}</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {results.map((res, i) => (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                key={i}
                className="bg-white/5 border border-white/5 rounded-3xl p-6 hover:bg-white/10 transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                   <div className="px-3 py-1 bg-black/40 border border-white/5 rounded-xl text-[10px] font-mono text-accent-safe">PORT {res.port}</div>
                   <div className={cn(
                     "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                     res.risk === 'High' ? "bg-accent-alert/20 text-accent-alert" : "bg-accent-info/20 text-accent-info"
                   )}>{res.risk} Risk</div>
                </div>
                <div className="text-xl font-black text-white uppercase tracking-tighter mb-1">{res.service}</div>
                <div className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Protocol: TCP/IP Sequence</div>
                <div className="mt-6 flex items-center justify-between">
                   <div className="flex items-center gap-2 text-accent-safe text-[8px] font-black uppercase tracking-widest">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent-safe" />
                      Status: Open
                   </div>
                   <button className="p-2 bg-white/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                      <ShieldQuestion size={14} className="text-neutral-400" />
                   </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {results.length === 0 && !scanning && (
            <div className="col-span-full py-20 text-center opacity-30">
               <Crosshair size={48} className="mx-auto mb-4" />
               <p className="text-sm uppercase font-black tracking-widest italic tracking-[0.3em]">Aucun scan initié</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SocialFeedView() {
  const [posts, setPosts] = useState<any[]>([]);
  const [newPost, setNewPost] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showAiHelp, setShowAiHelp] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    const path = 'posts';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    return () => unsubscribe();
  }, []);

  const createPost = async () => {
    if (!newPost.trim() || isPosting) return;
    if (!auth.currentUser) {
      console.error("Post creation failed: No authenticated user.");
      return;
    }
    
    setIsPosting(true);
    const path = 'posts';
    try {
      await addDoc(collection(db, path), {
        content: newPost,
        userId: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || 'Elite Operator',
        authorPhoto: auth.currentUser.photoURL || '',
        likesCount: 0,
        commentsCount: 0,
        createdAt: Date.now()
      });
      setNewPost("");
      setShowAiHelp(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setIsPosting(false);
    }
  };

  const likePost = async (postId: string, currentLikes: number) => {
    const path = `posts/${postId}`;
    try {
      await updateDoc(doc(db, 'posts', postId), {
        likesCount: (currentLikes || 0) + 1
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const getAiPostSuggestion = async () => {
    setAiSuggestions(["Analyse en cours..."]);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Génère 3 idées de posts courts et engageants pour un réseau social technique et futuriste (Nexus). Thèmes : IA, Cybersécurité, Futur."
      });
      const suggestions = response.text?.split('\n').filter(s => s.trim().length > 5).slice(0, 3) || [];
      setAiSuggestions(suggestions);
    } catch (e) {
      setAiSuggestions(["L'IA est temporairement indisponible pour les suggestions."]);
    }
  };

  return (
    <div className="flex gap-8 max-w-6xl mx-auto h-[calc(100vh-140px)]">
      {/* Central Feed */}
      <div className="flex-1 overflow-y-auto space-y-6 px-4 custom-scrollbar">
        {/* Post Creator */}
        <div className="bg-bg-sidebar/50 rounded-3xl p-6 border border-white/5 backdrop-blur-xl shadow-2xl">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-2xl bg-accent-info/10 border border-accent-info/20 flex items-center justify-center shrink-0">
              <User size={24} className="text-accent-info" />
            </div>
            <div className="flex-1 space-y-4">
              <textarea 
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="Quoi de neuf dans la Nexus Matrix ?"
                className="w-full bg-black/20 border border-white/5 rounded-2xl p-4 text-sm focus:ring-1 focus:ring-accent-info/30 min-h-[100px] resize-none transition-all"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-white/5 rounded-xl text-neutral-500 hover:text-accent-info transition-all">
                    <ImageIcon size={18} />
                  </button>
                  <button className="p-2 hover:bg-white/5 rounded-xl text-neutral-500 hover:text-accent-info transition-all">
                    <Hash size={18} />
                  </button>
                  <button 
                    onClick={() => {
                      setShowAiHelp(!showAiHelp);
                      if (!showAiHelp) getAiPostSuggestion();
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                      showAiHelp ? "bg-accent-info/20 border-accent-info text-accent-info" : "bg-white/5 border-white/5 text-neutral-400 hover:text-white"
                    )}
                  >
                    <Sparkles size={12} />
                    AI Assistant
                  </button>
                </div>
                <Button 
                  onClick={createPost}
                  disabled={!newPost.trim() || isPosting}
                  className="bg-accent-info text-white px-8 py-2 rounded-2xl shadow-lg shadow-accent-info/20 active:scale-95 transition-all"
                >
                  {isPosting ? <Loader2 size={18} className="animate-spin" /> : "Publier"}
                </Button>
              </div>

              {showAiHelp && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-accent-info/5 rounded-2xl border border-accent-info/20 p-4"
                >
                  <div className="text-[9px] font-black uppercase tracking-[0.2em] text-accent-info mb-3">Suggestions de l'IA</div>
                  <div className="space-y-2">
                    {aiSuggestions.map((s, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setNewPost(s)}
                        className="w-full text-left p-3 rounded-xl bg-black/40 border border-white/5 text-xs text-text-secondary hover:text-white hover:border-accent-info/30 transition-all"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Posts Feed */}
        <AnimatePresence>
          {posts.map((post) => (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={post.id}
              className="bg-bg-sidebar/30 rounded-3xl p-6 border border-white/5 backdrop-blur-xl relative group hover:bg-bg-sidebar/50 transition-all"
            >
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-white/5 overflow-hidden flex items-center justify-center shrink-0">
                  {post.authorPhoto ? <img src={post.authorPhoto} className="w-full h-full object-cover" /> : <User size={20} className="text-neutral-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="text-sm font-black uppercase tracking-tighter text-white italic mr-2">{post.authorName}</span>
                      <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">• {formatDate(post.createdAt)}</span>
                    </div>
                    <button className="p-2 text-neutral-600 hover:text-white transition-colors">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed mb-6 whitespace-pre-wrap">
                    {post.content}
                  </p>
                  
                  <div className="flex items-center gap-6 pt-4 border-t border-white/5">
                    <button 
                      onClick={() => likePost(post.id, post.likesCount)}
                      className="flex items-center gap-2 text-neutral-500 hover:text-accent-alert transition-all group/btn"
                    >
                      <div className="p-2 rounded-xl group-hover/btn:bg-accent-alert/10 transition-all">
                        <Heart size={18} className={post.likesCount > 0 ? "fill-accent-alert text-accent-alert" : ""} />
                      </div>
                      <span className="text-xs font-black">{post.likesCount || 0}</span>
                    </button>
                    <button className="flex items-center gap-2 text-neutral-500 hover:text-accent-info transition-all group/btn">
                      <div className="p-2 rounded-xl group-hover/btn:bg-accent-info/10 transition-all">
                        <MessageSquare size={18} />
                      </div>
                      <span className="text-xs font-black">{post.commentsCount || 0}</span>
                    </button>
                    <button className="flex items-center gap-2 text-neutral-500 hover:text-accent-safe transition-all group/btn">
                      <div className="p-2 rounded-xl group-hover/btn:bg-accent-safe/10 transition-all">
                        <Share2 size={18} />
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {posts.length === 0 && (
          <div className="py-20 text-center opacity-30">
            <Users size={48} className="mx-auto mb-4" />
            <p className="text-sm uppercase font-black tracking-widest tracking-[0.3em]">Aucune activité détectée</p>
          </div>
        )}
      </div>

      {/* Right Sidebar: Trends/Who to follow */}
      <div className="hidden lg:flex flex-col w-72 space-y-6">
        <div className="bg-bg-sidebar/50 rounded-3xl p-6 border border-white/5">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-info mb-4">Nexus Trends</h4>
          <div className="space-y-4">
            {['#NexusAI', '#Cybersécurité', '#Web3Matrix', '#EliteInference'].map((tag, i) => (
              <div key={i} className="group cursor-pointer">
                <div className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest mb-0.5">Tendance</div>
                <div className="text-xs font-black text-white group-hover:text-accent-info transition-colors">{tag}</div>
                <div className="text-[8px] text-neutral-600 mt-1 uppercase">12.4K posts</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-bg-sidebar/50 rounded-3xl p-6 border border-white/5">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-safe mb-4">Who to connect</h4>
          <div className="space-y-4">
            {[1, 2, 3].map((u) => (
              <div key={u} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
                  <User size={14} className="text-neutral-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-black text-white truncate uppercase tracking-tighter">Operator_{u}x92</div>
                  <div className="text-[8px] text-neutral-500 uppercase">Analyst Senior</div>
                </div>
                <button className="p-1.5 hover:bg-accent-safe/10 text-accent-safe rounded-lg transition-colors border border-transparent hover:border-accent-safe/20">
                  <UserPlus size={14} />
                </button>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 text-[9px] font-black uppercase tracking-widest text-accent-info hover:underline">Voir plus</button>
        </div>
      </div>
    </div>
  );
}

function NexusAIStudio() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [language, setLanguage] = useState('English');
  const [tone, setTone] = useState('Professional');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load Sessions
  useEffect(() => {
    if (!auth.currentUser) return;
    const path = 'chat_sessions';
    const q = query(
      collection(db, path),
      where('userId', '==', auth.currentUser.uid),
      orderBy('updatedAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSessions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    return () => unsubscribe();
  }, []);

  // Load Messages
  useEffect(() => {
    if (!auth.currentUser || !activeSession) {
      setMessages([]);
      return;
    }
    const path = `chat_sessions/${activeSession}/messages`;
    const q = query(
      collection(db, path),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    return () => unsubscribe();
  }, [activeSession]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const createSession = async () => {
    if (!auth.currentUser) return;
    const path = 'chat_sessions';
    try {
      const docRef = await addDoc(collection(db, path), {
        title: 'New Conversation',
        userId: auth.currentUser.uid,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      setActiveSession(docRef.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!auth.currentUser) return;
    const path = `chat_sessions/${id}`;
    if (confirm('Supprimer cette conversation ?')) {
      try {
        await deleteDoc(doc(db, 'chat_sessions', id));
        if (activeSession === id) setActiveSession(null);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }
  };

  const sendMessage = async () => {
    if ((!input.trim() && files.length === 0) || loading) return;
    if (!activeSession) {
      await createSession();
      // the new session won't be active immediately in this tick, 
      // but firestore addDoc is fast. For simplicity, we assume we have a session.
    }

    const sessionId = activeSession;
    if (!sessionId && sessions.length > 0) return; // Wait for session creation logic if needed

    setLoading(true);
    const userPrompt = input;
    setInput("");
    
    try {
      // 1. Save user message
      const msgPath = `chat_sessions/${sessionId}/messages`;
      await addDoc(collection(db, msgPath), {
        role: 'user',
        content: userPrompt,
        createdAt: Date.now()
      }).catch(err => handleFirestoreError(err, OperationType.WRITE, msgPath));

      // 2. Process Files for Gemini if any
      const fileData = await Promise.all(files.map(async (f) => {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(f);
        });
        return {
          inlineData: {
            data: base64.split(',')[1],
            mimeType: f.type
          }
        };
      }));

      // 3. Gemini Call
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            ...fileData.map(f => f.inlineData ? { inlineData: f.inlineData } : f),
            { text: userPrompt }
          ]
        },
        config: {
          systemInstruction: `You are the Nexus Elite AI Assistant. 
          Language: Respond in ${language}.
          Tone: ${tone}.
          Goal: Provide structured, accurate, and high-density technical analysis. 
          Context: You can also assist with social networking tasks: writing posts, suggesting replies to messages, and optimizing user bios for the Nexus platform.
          Format: Use clear Markdown, bullet points, and code blocks where applicable.`
        }
      });

      // 4. Save AI Response
      await addDoc(collection(db, msgPath), {
        role: 'assistant',
        content: response.text || "Désolé, je n'ai pas pu générer de réponse.",
        createdAt: Date.now()
      }).catch(err => handleFirestoreError(err, OperationType.WRITE, msgPath));

      // 5. Update Session metadata
      const sessionPath = `chat_sessions/${sessionId}`;
      await updateDoc(doc(db, 'chat_sessions', sessionId!), {
        updatedAt: Date.now(),
        lastMessage: userPrompt.substring(0, 50),
        title: sessions.find(s => s.id === sessionId)?.title === 'New Conversation' ? userPrompt.substring(0, 30) : sessions.find(s => s.id === sessionId)?.title
      }).catch(err => handleFirestoreError(err, OperationType.WRITE, sessionPath));

      setFiles([]);
    } catch (error) {
      console.error("AI Studio Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-120px)] bg-black/20 rounded-3xl overflow-hidden border border-white/5 backdrop-blur-xl relative">
      {/* Sidebar: History */}
      <div className={cn(
        "lg:w-80 border-r border-white/5 flex flex-col bg-bg-sidebar/50 transition-all",
        "h-48 lg:h-auto"
      )}>
        <div className="p-6 border-b border-white/5">
          <Button onClick={createSession} className="w-full justify-start gap-2 bg-accent-info/10 text-accent-info border border-accent-info/20 hover:bg-accent-info/20">
            <PlusCircle size={18} />
            Nouvelle Session
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {sessions.map(s => (
            <div 
              key={s.id}
              onClick={() => setActiveSession(s.id)}
              className={cn(
                "group relative p-4 rounded-2xl cursor-pointer transition-all border",
                activeSession === s.id 
                  ? "bg-accent-info/10 border-accent-info/30 text-white" 
                  : "bg-white/5 border-transparent text-text-secondary hover:bg-white/10"
              )}
            >
              <div className="flex items-center gap-3">
                <MessageSquare size={16} className={activeSession === s.id ? "text-accent-info" : "text-neutral-500"} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate tracking-tight uppercase">{s.title || 'Conversation sans titre'}</div>
                  <div className="text-[9px] opacity-50 mt-1">{formatDate(s.updatedAt)}</div>
                </div>
                <button 
                  onClick={(e) => deleteSession(s.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-accent-alert transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-30 text-center p-8">
              <Sparkles size={32} className="mb-4" />
              <p className="text-[10px] uppercase font-black">Aucun historique</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {!activeSession ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="w-24 h-24 bg-accent-info/10 rounded-full flex items-center justify-center mb-8 border border-accent-info/20">
              <Bot size={48} className="text-accent-info" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-4 italic">Nexus AI Studio</h2>
            <p className="max-w-md text-sm text-text-secondary leading-relaxed">
              Votre assistant analytique de nouvelle génération. Analysez des documents, générez du code ou discutez de stratégies de sécurité en temps réel.
            </p>
            <Button onClick={createSession} className="mt-8 px-8 py-4 bg-white text-black hover:bg-neutral-200">
              Démarrer maintenant
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-black/20">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-accent-safe animate-pulse" />
                <h3 className="text-sm font-black uppercase tracking-widest text-white italic">
                  {sessions.find(s => s.id === activeSession)?.title || 'Nexus Analyst Engine'}
                </h3>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => {
                    const text = messages.map(m => `[${m.role.toUpperCase()}] ${m.content}`).join('\n\n---\n\n');
                    const blob = new Blob([text], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `nexus_transcript_${activeSession}.txt`;
                    a.click();
                  }}
                  className="p-2 hover:bg-white/5 rounded-full text-neutral-500 hover:text-white transition-all"
                  title="Exporter la conversation"
                >
                  <Download size={16} />
                </button>
                <div className="flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
                  <Languages size={12} className="text-accent-info" />
                  <select 
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="bg-transparent border-none focus:ring-0 text-[10px] font-bold uppercase tracking-widest text-text-secondary p-0 cursor-pointer"
                  >
                    <option value="English">English</option>
                    <option value="French">Français</option>
                    <option value="Arabic">العربية</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
                  <Settings size={12} className="text-neutral-500" />
                  <select 
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="bg-transparent border-none focus:ring-0 text-[10px] font-bold uppercase tracking-widest text-text-secondary p-0 cursor-pointer"
                  >
                    <option value="Professional">Pro</option>
                    <option value="Creative">Creative</option>
                    <option value="Concise">Concise</option>
                  </select>
                </div>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              {messages.map((m, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={m.id || i}
                  className={cn(
                    "flex gap-6 max-w-4xl mx-auto",
                    m.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center border shrink-0 shadow-lg",
                    m.role === 'user' ? "bg-accent-info border-accent-info/30" : "bg-bg-sidebar border-white/10"
                  )}>
                    {m.role === 'user' ? <User size={20} className="text-white" /> : <Bot size={20} className="text-accent-info" />}
                  </div>
                  <div className={cn(
                    "flex-1 p-6 rounded-3xl text-sm leading-relaxed border relative",
                    m.role === 'user' 
                      ? "bg-accent-info/5 border-accent-info/20 text-white" 
                      : "bg-white/5 border-white/5 text-text-primary"
                  )}>
                    <div className="absolute top-2 right-4 text-[8px] font-black uppercase tracking-[0.2em] opacity-30">
                      {m.role === 'user' ? 'Operator' : 'Nexus Core'}
                    </div>
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  </div>
                </motion.div>
              ))}
              {loading && (
                <div className="flex gap-6 max-w-4xl mx-auto items-center animate-pulse">
                  <div className="w-10 h-10 rounded-2xl bg-bg-sidebar border border-white/10 flex items-center justify-center shrink-0">
                    <Loader2 size={16} className="text-accent-info animate-spin" />
                  </div>
                  <div className="flex-1 h-20 bg-white/5 rounded-3xl border border-white/5 flex items-center px-6">
                    <div className="text-[10px] font-black uppercase tracking-widest text-accent-info">Computing security trajectory...</div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Overlay */}
            <div className="p-6 bg-black/40 border-t border-white/5">
              <div className="max-w-4xl mx-auto relative">
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {files.map((f, i) => (
                      <div key={i} className="bg-accent-info/10 border border-accent-info/30 px-3 py-1 rounded-full text-[10px] text-accent-info flex items-center gap-2">
                        <FileText size={12} />
                        {f.name}
                        <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}>
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-3 bg-neutral-900/50 border border-white/10 rounded-3xl p-4 focus-within:border-accent-info/50 focus-within:bg-black/60 transition-all shadow-2xl">
                  <div className="flex shrink-0 gap-1">
                    <label className="p-3 hover:bg-white/5 rounded-2xl text-neutral-500 hover:text-white transition-all cursor-pointer">
                      <Paperclip size={20} />
                      <input 
                        type="file" 
                        multiple 
                        className="hidden" 
                        onChange={(e) => setFiles(prev => [...prev, ...Array.from(e.target.files || [])])}
                      />
                    </label>
                  </div>
                  <textarea 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                    placeholder="Posez une question technique ou joignez un fichier..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm resize-none py-2 max-h-40 min-h-[40px] custom-scrollbar"
                    rows={1}
                  />
                  <button 
                    onClick={sendMessage}
                    disabled={(!input.trim() && files.length === 0) || loading}
                    className="p-3 bg-accent-info text-white rounded-2xl hover:bg-accent-info/80 disabled:opacity-30 disabled:grayscale transition-all active:scale-95 shadow-lg shadow-accent-info/20"
                  >
                    <Send size={20} />
                  </button>
                </div>
                <div className="mt-3 flex justify-center gap-6 text-[9px] uppercase font-bold tracking-widest text-neutral-600">
                  <div className="flex items-center gap-1.5"><Zap size={10} /> Ultra Fast Inference</div>
                  <div className="flex items-center gap-1.5"><Lock size={10} /> End-to-End Encrypted</div>
                  <div className="flex items-center gap-1.5"><ShieldCheck size={10} /> SOC-2 Compliant</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AIIntelligenceView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [calibrating, setCalibrating] = useState(false);
  const [insightId, setInsightId] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [anomalyInsight, setAnomalyInsight] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const res = await axios.get('/api/admin/risk-analysis');
      setData(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRecalibrate = async () => {
    setCalibrating(true);
    try {
      await axios.post('/api/admin/ai/re-calibrate');
      await fetchData();
    } finally {
      setCalibrating(false);
    }
  };

  const getSmartInsight = async (anomaly: any) => {
    setInsightId(anomaly.id);
    setInsightLoading(true);
    setAnomalyInsight(null);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze this anomaly and provide a 2-sentence expert summary and 3 bullet points for remediation. Anomaly: ${JSON.stringify(anomaly)}`,
        config: {
          systemInstruction: "You are a senior SOC analyst. Provide high-density technical analysis."
        }
      });
      setAnomalyInsight(response.text);
    } catch (error) {
      setAnomalyInsight("Critical error parsing behavioral drift. Manual verification recommended.");
    } finally {
      setInsightLoading(false);
    }
  };

  if (loading) return (
     <div className="h-full flex flex-col items-center justify-center space-y-4">
        <BrainCircuit size={48} className="text-accent-info animate-pulse" />
        <div className="text-xs uppercase tracking-[0.3em] font-black animate-pulse">Initializing Secure Protocol</div>
     </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ... existing stats ... */}
        <Card title="Avg Risk Score" className="text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-accent-info/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="text-4xl font-extrabold text-accent-info relative z-10">{data?.stats?.averageRisk || 0}%</div>
          <div className="text-[10px] text-text-secondary uppercase mt-2 relative z-10">Predicted System Threat</div>
        </Card>
        <Card title="Anomalies (24h)" className="text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-accent-warn/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="text-4xl font-extrabold text-accent-warn relative z-10">{data?.stats?.anomalies24h || 0}</div>
          <div className="text-[10px] text-text-secondary uppercase mt-2 relative z-10">UEBA Deviations</div>
        </Card>
        <Card title="Attacks Blocked" className="text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-accent-safe/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="text-4xl font-extrabold text-accent-safe relative z-10">{data?.stats?.attacksBlocked || 0}</div>
          <div className="text-[10px] text-text-secondary uppercase mt-2 relative z-10">ML-Based Mitigations</div>
        </Card>
        <Card title="Model Operations" className="text-center p-4">
          <div className="flex flex-col gap-2">
            <Button onClick={() => axios.post('/api/admin/scans/start', { type: 'ADVERSARIAL' })} className="w-full bg-accent-alert/20 border border-accent-alert text-accent-alert hover:bg-accent-alert/30">
              Red Team Attack
            </Button>
            <Button 
               onClick={handleRecalibrate} 
               disabled={calibrating}
               className="w-full bg-accent-info/20 border border-accent-info text-accent-info hover:bg-accent-info/30"
            >
              {calibrating ? <RefreshCcw size={14} className="animate-spin mr-2" /> : <RefreshCcw size={14} className="mr-2" />}
              {calibrating ? 'Recalibrating...' : 'Re-calibrate Models'}
            </Button>
          </div>
          <div className="text-[10px] text-text-secondary uppercase mt-2">Manual AI Fine-Tuning</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card title="UEBA Anomaly Detection Feed" icon={<Activity className="text-accent-warn" size={18} />}>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
               {data?.anomalies?.map((anomaly: any) => (
                  <div key={anomaly.id} className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all group">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          anomaly.type === 'ATTACK' ? 'bg-accent-alert' : 'bg-accent-warn'
                        )} />
                        <span className="font-bold text-sm">{anomaly.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-text-secondary">{formatDate(anomaly.timestamp)}</span>
                    </div>
                    <p className="text-xs text-text-secondary mb-3">{anomaly.description}</p>
                    
                    {insightId === anomaly.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mb-4 overflow-hidden">
                        <div className="p-3 bg-accent-info/10 border border-accent-info/30 rounded-lg">
                           <div className="flex items-center gap-2 text-[10px] font-extrabold text-accent-info uppercase mb-2">
                             <Wand2 size={12} />
                             AI SMART INSIGHT
                           </div>
                           {insightLoading ? (
                             <div className="flex items-center gap-2 text-[10px] animate-pulse">
                               <Loader2 size={10} className="animate-spin" />
                               Analyzing attack vectors...
                             </div>
                           ) : (
                             <div className="text-[10px] leading-relaxed whitespace-pre-wrap">{anomalyInsight}</div>
                           )}
                        </div>
                      </motion.div>
                    )}

                    <div className="flex justify-between items-center">
                       <div className="flex items-center gap-3">
                          <div className="text-[10px] font-bold px-2 py-0.5 rounded bg-accent-info/10 text-accent-info border border-accent-info/20">
                            Risk: {anomaly.riskScore}%
                          </div>
                          <button 
                            onClick={() => getSmartInsight(anomaly)}
                            className="text-[10px] text-accent-info hover:underline flex items-center gap-1 font-bold"
                          >
                            <Sparkles size={10} />
                            Get Smart Insight
                          </button>
                       </div>
                       <div className="flex gap-2">
                         <Button size="sm" variant="outline" className="h-8 py-0 px-3 text-[10px]" onClick={() => axios.post('/api/admin/ai/mitigate', { id: anomaly.id })}>
                           Mitigate
                         </Button>
                       </div>
                    </div>
                  </div>
               ))}
            </div>
          </Card>

          <Card title="Active Behavioral Replay" icon={<Eye className="text-accent-info" size={18} />}>
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="lg:w-2/3 relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-black group shadow-2xl">
                 <video 
                   className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                   controls
                   autoPlay
                   muted
                   loop
                   playsInline
                 >
                   <source src="https://storage.googleapis.com/temp-public-assets/mtls-demo.mp4" type="video/mp4" />
                   Your browser does not support the video tag.
                 </video>
                 <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-md text-[8px] font-mono text-accent-warn rounded border border-white/10 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-accent-warn rounded-full animate-pulse" />
                    ANOMALY_CAPTURE: TRACE_ID_9821
                 </div>
              </div>
              <div className="lg:w-1/3 space-y-4">
                 <div className="p-4 bg-accent-info/5 border border-accent-info/20 rounded-xl h-full">
                    <h5 className="text-[11px] font-bold text-accent-info uppercase mb-2">AI Behavioral Drift Report</h5>
                    <p className="text-[10px] text-text-secondary leading-relaxed mb-4">
                       ML analysis identified anomalous typing cadence and mouse movement patterns preceding the MFA challenge. 
                       This replay correlates the physical interaction with the detected session hijack attempt.
                    </p>
                    <div className="space-y-2">
                       <div className="flex justify-between text-[8px] uppercase tracking-widest font-black">
                          <span>Bot Likelihood</span>
                          <span>92%</span>
                       </div>
                       <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                          <div className="bg-accent-alert h-full" style={{ width: '92%' }} />
                       </div>
                    </div>
                    <div className="mt-4 p-2 bg-accent-alert/10 border border-accent-alert/30 rounded text-[9px] text-accent-alert uppercase font-black text-center animate-pulse">
                       HIGH CONFIDENCE HIJACK ATTEMPT
                    </div>
                 </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <NexusAssistant contextData={data} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card title="Systemic Risk Trend (ML Forecasting)" icon={<TrendingUp size={18} className="text-accent-info" />}>
           <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.trends || []}>
                <defs>
                  <linearGradient id="colorRiskAI" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Area type="monotone" dataKey="score" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorRiskAI)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Daily Anomalies (UEBA)" icon={<BarChart3 size={18} className="text-accent-warn" />}>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { day: 'Mon', count: 12 },
                { day: 'Tue', count: 8 },
                { day: 'Wed', count: 25 },
                { day: 'Thu', count: 18 },
                { day: 'Fri', count: 14 },
                { day: 'Sat', count: 4 },
                { day: 'Sun', count: 6 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                />
                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </motion.div>
  );
}

function CertsTabView() {
  const [certs, setCerts] = useState<any[]>([]);
  const [selectedCert, setSelectedCert] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [stepIndex, setStepIndex] = useState(-1);

  const fetchCerts = async () => {
    try {
      const res = await axios.get('/api/admin/certs');
      setCerts(res.data);
      if (res.data.length > 0) {
        setSelectedCert(res.data[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCerts();
  }, []);

  const runTest = async (certId: string) => {
    setTesting(true);
    setTestResult(null);
    setStepIndex(-1);
    try {
      const res = await axios.post('/api/admin/certs/test', { certId });
      // Simulate visual handshake logging step-by-step
      for (let i = 0; i < res.data.steps.length; i++) {
        setStepIndex(i);
        await new Promise(resolve => setTimeout(resolve, 600));
      }
      setTestResult(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <div className="h-48 flex items-center justify-center"><Loader2 className="animate-spin text-accent-info" /></div>;
  }

  return (
    <div className="space-y-8">
      <Card title="mTLS Client Certificates (Machine Trust)">
        <p className="text-xs text-text-secondary mb-6 leading-relaxed">
          The mutual TLS (mTLS) protocol verifies that client devices present valid cryptographic hardware-backed certificates signed by the trusted Root Certificate Authority (<span className="text-accent-info font-mono">ZeroTrust-CA</span>).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Certificate Selection Panel */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase text-text-dim tracking-widest">Enrolled Devices & Certs</h4>
            <div className="space-y-3">
              {certs.map(cert => (
                <div 
                  key={cert.id} 
                  onClick={() => {
                    if (!testing) {
                      setSelectedCert(cert);
                      setTestResult(null);
                      setStepIndex(-1);
                    }
                  }}
                  className={cn(
                    "p-4 rounded-xl border transition-all cursor-pointer flex justify-between items-center",
                    selectedCert?.id === cert.id 
                      ? "bg-accent-info/10 border-accent-info text-white shadow-md"
                      : "bg-black/10 border-white/5 hover:border-white/10 text-text-secondary"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2.5 rounded-lg border",
                      cert.valid 
                        ? (selectedCert?.id === cert.id ? "bg-accent-info/20 border-accent-info/40 text-accent-info" : "bg-accent-safe/10 border-accent-safe/20 text-accent-safe")
                        : "bg-accent-alert/10 border-accent-alert/20 text-accent-alert"
                    )}>
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white">{cert.cn}</div>
                      <div className="text-[10px] text-text-secondary leading-none mt-1">{cert.role}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      "text-[8px] font-black uppercase px-2 py-0.5 rounded border tracking-wider",
                      cert.valid 
                        ? "bg-accent-safe/10 text-accent-safe border-accent-safe/20" 
                        : "bg-accent-alert/10 text-accent-alert border-accent-alert/20"
                    )}>
                      {cert.valid ? "VALID" : "REVOKED"}
                    </span>
                    <div className="text-[8px] font-mono text-text-muted mt-1.5">{cert.machineId}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Certificate Details Panel */}
          {selectedCert && (
            <div className="nx-card p-6 bg-white/[0.01] border-white/5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                  <div className="p-2.5 bg-white/5 rounded-xl text-text-vibrant">
                    <Fingerprint size={20} />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-white uppercase tracking-wider">Certificate Identity</h5>
                    <p className="text-[10px] text-text-secondary tracking-widest uppercase font-mono mt-0.5">{selectedCert.machineId}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-text-secondary uppercase">Common Name (CN)</span>
                    <span className="font-mono text-white">{selectedCert.cn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary uppercase">Issuer</span>
                    <span className="font-mono text-accent-info">{selectedCert.issuer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary uppercase">Serial Number</span>
                    <span className="font-mono text-text-secondary">{selectedCert.serial}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary uppercase">Algorithm</span>
                    <span className="font-mono text-text-secondary">RSA 2048-bit (SHA-256)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary uppercase">SHA1 Fingerprint</span>
                    <span className="font-mono text-text-muted truncate max-w-[150px]">{selectedCert.fingerprint}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => runTest(selectedCert.id)}
                  disabled={testing}
                  className="w-full py-3 bg-accent-info text-white font-bold rounded-lg uppercase tracking-widest text-xs hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-3 border border-accent-info/30 hover:shadow-lg hover:shadow-accent-info/10 cursor-pointer"
                >
                  {testing ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} />}
                  Run Mutual TLS Handshake Test
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Handshake Simulation Shell */}
      {(testing || stepIndex >= 0) && (
        <Card title="mTLS Cryptographic Handshake Simulator" icon={<Terminal size={18} className="text-accent-info" />}>
          <div className="bg-black/90 rounded-xl p-6 font-mono text-[11px] leading-relaxed border border-white/5 space-y-2 relative overflow-hidden min-h-[220px]">
            <div className="absolute top-2 right-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent-info animate-pulse" />
              <span className="text-[8px] text-accent-info uppercase font-bold tracking-widest">Handshake Live Debugger</span>
            </div>
            
            <div className="space-y-2 text-text-muted max-h-[300px] overflow-y-auto">
              {selectedCert && stepIndex >= 0 && Array.from({ length: stepIndex + 1 }).map((_, idx) => {
                const step = selectedCert.valid 
                  ? [
                      `[CLIENT] Client Hello (TLSv1.3, Cipher: TLS_AES_256_GCM_SHA384) - Initiating connection to gateway`,
                      `[PROXY] Server Hello (TLSv1.3, Handshake ongoing) - Selected Cipher, replying with ECDHE params`,
                      `[PROXY] Server Certificate sent (CN: localhost, Issuer: ZeroTrust-CA, Status: Verified)`,
                      `[PROXY] Certificate Request sent (Enforcing Mutual TLS verification)`,
                      `[CLIENT] Client Certificate presented: CN=${selectedCert.cn}, Serial=${selectedCert.serial}, Issuer=${selectedCert.issuer}`,
                      `[PROXY] Cryptographic signature check: signature verified over ephemeral keys`,
                      `[PROXY] Certificate Chain matching check: client signed by root CA "ZeroTrust-CA" (VALID)`,
                      `[PROXY] Checking revocation list (CRL) / OCSP stapling: Active cert: NOT REVOKED`,
                      `[PROXY] Handshake completed successfully. Mutual TLS session ESTABLISHED (Tunnel secured via AES-GCM).`,
                      `[GATEWAY] Machine Authorized: Mapping connection to ZeroTrust identity "${selectedCert.machineId}".`
                    ][idx]
                  : [
                      `[CLIENT] Client Hello (TLSv1.3, Cipher: TLS_AES_256_GCM_SHA384) - Initiating connection to gateway`,
                      `[PROXY] Server Hello (TLSv1.3, Handshake ongoing) - Selected Cipher, replying with ECDHE params`,
                      `[PROXY] Server Certificate sent (CN: localhost, Issuer: ZeroTrust-CA, Status: Verified)`,
                      `[PROXY] Certificate Request sent (Enforcing Mutual TLS verification)`,
                      `[CLIENT] Client Certificate presented: CN=${selectedCert.cn}, Serial=${selectedCert.serial}, Issuer=${selectedCert.issuer}`,
                      `[PROXY] Cryptographic signature check: failed or warning`,
                      `[PROXY] Certificate Chain matching check: SIGNATURE INVALID (Not authenticated by trusted CA)`,
                      `[PROXY] Revocation status: FAILED_INTEGRITY`,
                      `[GATEWAY] Handshake ABORTED: Alert level: FATAL, Description: BAD_RECORD_MAC / CERTIFICATE_UNKNOWN`,
                      `[SECURITY] Threat Detection: Unauthorized access attempt blocked at gateway.`
                    ][idx];

                if (!step) return null;
                const isClient = step.startsWith('[CLIENT]');
                const isProxy = step.startsWith('[PROXY]');
                const isGateway = step.startsWith('[GATEWAY]');
                const isError = step.includes('failed') || step.includes('FAILED') || step.includes('ABORTED') || step.includes('INVALID') || step.includes('Threat');
                const isSuccess = step.includes('successfully') || step.includes('ESTABLISHED') || step.includes('Authorized') || step.includes('VALID');

                return (
                  <div 
                    key={idx} 
                    className={cn(
                      "border-l-2 pl-3 py-0.5",
                      isError ? "border-accent-alert text-accent-alert" :
                      isSuccess ? "border-accent-safe text-accent-safe" :
                      isClient ? "border-accent-info text-text-vibrant" :
                      isProxy ? "border-[#a855f7] text-[#c084fc]" : "border-text-muted"
                    )}
                  >
                    {step}
                  </div>
                );
              })}
            </div>

            {testResult && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className={cn(
                  "mt-6 p-4 rounded-lg flex items-center gap-4 border",
                  testResult.success 
                    ? "bg-accent-safe/10 border-accent-safe/30 text-accent-safe" 
                    : "bg-accent-alert/10 border-accent-alert/30 text-accent-alert"
                )}
              >
                <div className="p-2.5 bg-white/5 rounded-lg">
                  {testResult.success ? <CheckCircle2 size={24} /> : <ShieldAlert size={24} />}
                </div>
                <div>
                  <h6 className="font-black text-xs uppercase tracking-wider">{testResult.success ? "RÉSULTAT: ACCÈS AUTORISÉ" : "RÉSULTAT: ACCÈS REFUSÉ"}</h6>
                  <p className="text-[10px] text-text-secondary leading-snug mt-1">{testResult.summary}</p>
                </div>
              </motion.div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function IAMView() {
  const { user } = React.useContext(UserContext);
  const [activeTab, setActiveTab] = useState<'users' | 'sessions' | 'certs'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [isSystemActive, setIsSystemActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [challenging, setChallenging] = useState<Record<string, 'analyzing' | 'dispatched' | null>>({});

  const fetch = async () => {
    try {
      const [uRes, sRes, sysRes] = await Promise.all([
        axios.get('/api/admin/users'),
        axios.get('/api/admin/sessions'),
        axios.get('/api/admin/system/status')
      ]);
      setUsers(uRes.data);
      setSessions(sRes.data);
      setIsSystemActive(sysRes.data.active);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleSystemStatus = async () => {
    const action = isSystemActive ? "DEACTIVATE" : "ACTIVATE";
    if (!window.confirm(`Are you sure you want to ${action} the entire Nexus infrastructure? This will affect all non-admin users.`)) return;
    try {
      const res = await axios.post('/api/admin/system/toggle');
      setIsSystemActive(res.data.active);
    } catch (e) {
      console.error(e);
    }
  };

  const triggerChallenge = async (userEmail: string) => {
    setChallenging(prev => ({ ...prev, [userEmail]: 'analyzing' }));
    try {
      await axios.post('/api/admin/mfa/challenge', { email: userEmail });
      setTimeout(() => {
        setChallenging(prev => ({ ...prev, [userEmail]: 'dispatched' }));
      }, 2000);
      
      setTimeout(() => {
        setChallenging(prev => ({ ...prev, [userEmail]: null }));
      }, 15000);
    } catch (e) {
      setChallenging(prev => ({ ...prev, [userEmail]: null }));
    }
  };

  const terminateSession = async (sessionId: string) => {
    if (!window.confirm("Terminate this session instantly? Zero Trust policy will revoke all active tokens for this ID.")) return;
    try {
      await axios.post('/api/admin/sessions/terminate', { sessionId });
      fetch();
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetch();
    const inv = setInterval(fetch, 5000);
    return () => clearInterval(inv);
  }, []);

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-accent-info" /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex flex-col gap-6 bg-bg-sidebar/50 p-6 rounded-2xl border border-border-subtle">
        <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold flex items-center gap-3">
                <Fingerprint className="text-accent-info" /> Identity & Trust Management
              </h2>
              <p className="text-text-secondary text-sm">Unified Zero Trust IAM (Keycloak + SSO + Passkeys)</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 px-4 bg-white/5 border border-white/5 rounded-xl">
                 <Globe size={14} className="text-text-muted" />
                 <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase text-text-muted tracking-tighter leading-none">Access Mode</span>
                    <span className="text-[10px] font-bold text-nexus-blue uppercase">Identity Active</span>
                 </div>
              </div>
              <Button variant="primary" onClick={fetch} className="flex items-center gap-2">
                <RefreshCcw size={18} /> Resync Realm
              </Button>
            </div>
        </div>
        
        <div className="flex gap-2">
          {[
            { id: 'users', label: 'Identities / Users', icon: <Users size={14} /> },
            { id: 'sessions', label: 'Active Sessions', icon: <Activity size={14} /> },
            { id: 'certs', label: 'mTLS Certificates', icon: <ShieldCheck size={14} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-[10px] uppercase font-black tracking-widest rounded-lg transition-all",
                activeTab === tab.id ? "bg-accent-info text-white shadow-lg shadow-accent-info/20" : "bg-white/5 text-text-secondary hover:bg-white/10"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           {activeTab === 'users' && (
             <Card title="Provisioned Identities (OIDC Realm)">
                <div className="overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] uppercase text-text-secondary border-b border-border-subtle font-bold tracking-widest">
                         <th className="pb-4">Identity</th>
                         <th className="pb-4">Role</th>
                         <th className="pb-4">Status</th>
                         <th className="pb-4">MFA State</th>
                         <th className="pb-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {users.map(u => {
                        const challengeStatus = challenging[u.email];
                        return (
                        <tr key={u.id} className="border-b border-white/5 last:border-0 group">
                          <td className="py-4">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-accent-info/20 flex items-center justify-center text-accent-info font-bold text-xs uppercase">
                                  {u.email[0]}
                                </div>
                                <div>
                                  <div className="font-bold">{u.email}</div>
                                  <div className="text-[10px] text-text-secondary uppercase">{u.id}</div>
                                </div>
                             </div>
                          </td>
                          <td className="py-4">
                             <span className={cn(
                               "text-[9px] font-bold px-2 py-0.5 rounded border uppercase",
                               u.role === 'ADMIN' ? 'bg-accent-alert/10 text-accent-alert border-accent-alert/30' : 'bg-accent-info/10 text-accent-info border-accent-info/30'
                             )}>
                               {u.role}
                             </span>
                          </td>
                          <td className="py-4">
                             <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-accent-safe" />
                                <span className="text-xs">Synchronized</span>
                             </div>
                          </td>
                          <td className="py-4">
                             <div className={cn(
                               "flex items-center gap-2 text-xs",
                               u.mfaEnabled ? 'text-accent-safe font-bold' : 'text-text-secondary opacity-60'
                             )}>
                               {u.mfaEnabled ? <Shield size={14} /> : <ShieldAlert size={14} />}
                               {u.mfaEnabled ? 'ENFORCED' : 'DISABLED'}
                             </div>
                          </td>
                          <td className="py-4 text-right">
                             <div className="flex justify-end items-center gap-2">
                                <AnimatePresence mode="wait">
                                  {challengeStatus === 'analyzing' && (
                                    <motion.div 
                                      initial={{ opacity: 0, scale: 0.8 }} 
                                      animate={{ opacity: 1, scale: 1 }}
                                      exit={{ opacity: 0, scale: 0.8 }}
                                      className="flex items-center gap-2 bg-accent-info/10 px-3 py-1.5 rounded-lg border border-accent-info/20"
                                    >
                                      <Loader2 size={10} className="animate-spin text-accent-info" />
                                      <span className="text-[9px] font-black uppercase text-accent-info tracking-tighter">AI Assessing Risk...</span>
                                    </motion.div>
                                  )}
                                  {challengeStatus === 'dispatched' && (
                                    <motion.div 
                                      initial={{ opacity: 0, scale: 0.8 }} 
                                      animate={{ opacity: 1, scale: 1 }}
                                      exit={{ opacity: 0, scale: 0.8 }}
                                      className="flex items-center gap-2 bg-accent-safe/10 px-3 py-1.5 rounded-lg border border-accent-safe/20"
                                    >
                                      <Smartphone size={10} className="text-accent-safe animate-bounce" />
                                      <span className="text-[9px] font-black uppercase text-accent-safe tracking-tighter">Face ID Sent</span>
                                    </motion.div>
                                  )}
                                  {!challengeStatus && (
                                    <Button 
                                      onClick={() => triggerChallenge(u.email)}
                                      variant="secondary"
                                      disabled={user?.role === 'USER'}
                                      className="p-2 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-2 border-white/10 disabled:opacity-20"
                                      title="Challenge Identity via Biometrics"
                                    >
                                      <ScanFace size={14} />
                                      <span className="text-[9px] font-bold">CHALLENGE</span>
                                    </Button>
                                  )}
                                </AnimatePresence>
                             </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
             </Card>
           )}
 
           {activeTab === 'sessions' && (
             <Card title="Active Live Sessions (Zero Trust Context)">
                <div className="space-y-4">
                   {sessions.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-4 bg-black/10 rounded-xl border border-border-subtle group hover:border-accent-info/30 transition-all">
                         <div className="flex items-center gap-4">
                            <div className="p-3 bg-accent-safe/10 text-accent-safe rounded-lg">
                               <Activity size={20} />
                            </div>
                            <div>
                               <div className="font-mono text-xs font-bold text-accent-info">{s.id}</div>
                               <div className="text-[10px] text-text-secondary flex gap-2">
                                  <span>IP: {s.ip}</span>
                                  <span>•</span>
                                  <span>FP: {s.deviceFp}</span>
                               </div>
                            </div>
                         </div>
                         <div className="text-right flex items-center gap-6">
                            <div className="text-[10px] text-text-secondary uppercase">
                               Active: {formatDate(s.lastSeen)}
                            </div>
                            <Button 
                               variant="ghost" 
                               onClick={() => terminateSession(s.id)} 
                               className="p-2 text-accent-alert hover:bg-accent-alert/10 opacity-0 group-hover:opacity-100 transition-all"
                               title="Login de authentification"
                            >
                               <Ban size={16} />
                            </Button>
                         </div>
                      </div>
                   ))}
                   {sessions.length === 0 && <p className="text-center text-text-secondary text-sm py-4">No active Zero Trust sessions.</p>}
                </div>
             </Card>
           )}

           {activeTab === 'certs' && (
             <CertsTabView />
           )}
        </div>

        <div className="space-y-8">
           <Card title="Global Infrastructure State">
              <div className="space-y-6">
                 <div className="flex items-center justify-between p-4 bg-black/10 rounded-xl border border-border-subtle">
                    <div className="flex items-center gap-3">
                       <div className={cn("p-2 rounded-lg", isSystemActive ? 'bg-accent-safe/10 text-accent-safe' : 'bg-accent-alert/10 text-accent-alert')}>
                          <Power size={20} />
                       </div>
                       <div>
                          <div className="font-bold text-sm tracking-tight">{isSystemActive ? "Infrastructure ACTIVE" : "Infrastructure INACTIVE"}</div>
                          <div className="text-[10px] text-text-secondary uppercase">Unified Shield Status</div>
                       </div>
                    </div>
                    <ToggleButton 
                       active={isSystemActive} 
                       onClick={toggleSystemStatus} 
                       label={isSystemActive ? "Online" : "Lockdown"} 
                    />
                 </div>
                 <p className="text-[10px] text-text-secondary leading-relaxed">
                    When deactivated, the infrastructure enters <span className="text-accent-alert font-bold uppercase">Emergency Lockdown</span>. 
                    Only identities with <span className="text-white font-mono">ADMIN</span> or <span className="text-white font-mono">SOC</span> clearance 
                    will maintain access. All standard traffic is blocked at the gateway.
                 </p>
              </div>
           </Card>

           <Card title="Adaptive Auth Metrics">
              <div className="space-y-6">
                 <div className="flex justify-between items-center">
                    <div>
                      <div className="text-2xl font-bold">94%</div>
                      <div className="text-[10px] text-text-secondary uppercase tracking-widest">Successful MFA Rate</div>
                    </div>
                    <div className="text-accent-safe"><CheckCircle2 size={32} /></div>
                 </div>
                 <div className="space-y-2">
                    <div className="flex justify-between text-[10px] uppercase font-bold text-text-secondary">
                       <span>Passkey Adoption</span>
                       <span>22%</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full bg-accent-info w-[22%]" />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <div className="flex justify-between text-[10px] uppercase font-bold text-text-secondary">
                       <span>Trusted IPs Profile</span>
                       <span>85%</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full bg-accent-safe w-[85%]" />
                    </div>
                 </div>
              </div>
           </Card>

           <Card title="Modern Auth Capability">
              <div className="space-y-4">
                 {[
                   { icon: <Send />, label: 'Passwordless Magic Link', status: 'Active' },
                   { icon: <Shield />, label: 'Adaptive Risk Challenge', status: 'Enforced' },
                   { icon: <Cpu />, label: 'Session Hijacking Shield', status: 'Active' },
                 ].map((cap, i) => (
                   <div key={i} className="flex items-center justify-between p-3 bg-bg-sidebar rounded-xl border border-border-subtle">
                      <div className="flex items-center gap-3">
                         <div className="text-accent-info">{cap.icon}</div>
                         <span className="text-xs font-bold">{cap.label}</span>
                      </div>
                      <span className="text-[9px] font-bold text-accent-safe uppercase">{cap.status}</span>
                   </div>
                 ))}
              </div>
           </Card>

           <Card title="Global IAM Log Stream">
              <div className="max-h-[300px] overflow-y-auto">
                 <SecurityLogList limit={15} />
              </div>
           </Card>
        </div>
      </div>
    </motion.div>
  );
}

function SecurityProfileView() {
  const { user, setUser } = React.useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [mfaSetup, setMfaSetup] = useState<{ qrDataUrl: string, secret: string } | null>(null);
  const [otpCode, setOtpCode] = useState('');

  const initiateMfa = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/auth/mfa/setup');
      setMfaSetup(data);
    } catch (e: any) {
      setMsg({ type: 'error', text: 'Failed to initiate MFA setup.' });
    } finally {
      setLoading(false);
    }
  };

  const unregisterBiometric = async () => {
    setLoading(true);
    setMsg(null);
    try {
      await axios.post('/api/auth/webauthn/unregister');
      setMsg({ type: 'success', text: 'Dispositif biométrique dissocié avec succès.' });
      const { data } = await axios.get('/api/auth/me');
      setUser(data.user);
    } catch (e: any) {
      console.error(e);
      setMsg({ type: 'error', text: 'Échec de la dissociation.' });
    } finally {
      setLoading(false);
    }
  };

  const confirmMfa = async () => {
    setLoading(true);
    try {
      await axios.post('/api/auth/mfa/confirm', { otp: otpCode });
      setMsg({ type: 'success', text: 'MFA successfully activated for your account.' });
      setMfaSetup(null);
    } catch (e: any) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Invalid code.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-black tracking-tighter uppercase flex items-center gap-4">
          <Fingerprint className="text-accent-info" size={32} />
          Security Profile
        </h2>
        <p className="text-text-secondary">Manage your identity verification and multi-factor authentication (TOTP) settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card title="Multi-Factor (TOTP)">
          <div className="space-y-6">
            {!mfaSetup ? (
              <div className="space-y-4">
                 <div className="flex items-center justify-between p-3 bg-bg-sidebar rounded-lg border border-border-subtle">
                   <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-accent-info/10 flex items-center justify-center text-accent-info">
                       <Key size={16} />
                     </div>
                     <div>
                       <div className="text-xs font-bold">Authenticator App</div>
                       <div className="text-[10px] text-text-secondary">Google / Authy / Microsoft</div>
                     </div>
                   </div>
                   <Button 
                     onClick={initiateMfa} 
                     disabled={loading || user.mfaEnabled}
                     className="text-[10px] py-1 px-3 h-auto uppercase font-black"
                   >
                     {user.mfaEnabled ? 'Active' : 'Setup'}
                   </Button>
                 </div>
                 <p className="text-[10px] text-text-secondary leading-normal">
                   Standard TOTP (RFC 6238) adds a secondary security layer beyond your primary credentials.
                 </p>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4 text-center">
                 <div className="p-4 bg-white rounded-xl inline-block mx-auto border-4 border-accent-info shadow-xl">
                   <img src={mfaSetup.qrDataUrl} alt="OTP QR Code" className="w-32 h-32" referrerPolicy="no-referrer" />
                 </div>
                 <div className="space-y-2">
                    <p className="text-[10px] text-text-secondary uppercase font-bold">Scan this code with your Authenticator App</p>
                    <div className="bg-bg-sidebar p-2 rounded border border-white/5 font-mono text-[10px] select-all">
                      {mfaSetup.secret}
                    </div>
                 </div>
                 <div className="flex gap-2">
                   <input 
                     type="text" 
                     placeholder="Enter Code"
                     className="bg-bg-main border border-border-subtle rounded px-3 py-2 text-sm w-full outline-hidden focus:border-accent-info"
                     value={otpCode}
                     onChange={(e) => setOtpCode(e.target.value)}
                   />
                   <Button onClick={confirmMfa} disabled={loading || otpCode.length < 6} className="text-xs">Verify</Button>
                 </div>
                 <button onClick={() => setMfaSetup(null)} className="text-[9px] text-text-secondary uppercase font-bold hover:text-white underline">Cancel Setup</button>
              </motion.div>
            )}
          </div>
        </Card>

        <Card title="Security Standards Matrix">
          <div className="space-y-4">
             {[
               { label: 'TLS 1.3 Encryption', status: 'Enforced', color: 'text-accent-safe' },
               { label: 'MFA Enforcement', status: 'Active', color: 'text-accent-safe' },
               { label: 'Session Hardening', status: 'JWT + Rotating', color: 'text-accent-info' },
               { label: 'Access Auditing', status: 'Continuous', color: 'text-accent-info' },
             ].map((item, i) => (
               <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                  <span className="text-xs font-bold text-text-secondary uppercase tracking-tight">{item.label}</span>
                  <span className={cn("text-[9px] font-black uppercase tracking-widest", item.color)}>{item.status}</span>
               </div>
             ))}
          </div>
          <div className="mt-8 pt-6 border-t border-white/5">
             <div className="text-[10px] text-text-secondary leading-normal italic text-center">
               "Nexus Passkeys use the WebAuthn standard to anchor identity in the hardware layer, 
               making credential theft mathematically impossible."
             </div>
          </div>
        </Card>
      </div>
    </motion.div>
  );
}

function Sidebar({ currentView, setView, onLogout }: any) {
  const { user } = React.useContext(UserContext);
  const items = [
    { id: 'overview', icon: <LayoutDashboard />, label: 'Tableau de bord' },
    { id: 'architecture', icon: <Globe />, label: 'Architecture' },
    { id: 'soc', icon: <LayoutDashboard />, label: 'SOC Command' },
    { id: 'wazuh', icon: <Activity />, label: 'Wazuh SIEM', roles: ['ADMIN', 'SOC'] },
    { id: 'vmlab', icon: <Monitor />, label: 'Nexus Lab', roles: ['ADMIN', 'SOC'] },
    { id: 'network', icon: <Network />, label: 'Infrastructure', roles: ['ADMIN', 'SOC'] },
    { id: 'kali', icon: <Skull />, label: 'Kali Forge', roles: ['ADMIN', 'SOC'] },
    { id: 'ai-engine', icon: <BrainCircuit />, label: 'AI Intelligence', roles: ['ADMIN', 'SOC', 'USER'] },
    { id: 'iam', icon: <Fingerprint />, label: 'Zero Trust Auth', roles: ['ADMIN', 'SOC', 'USER'] },
    { id: 'vault', icon: <Lock />, label: 'Security Vault', roles: ['ADMIN'] },
    { id: 'media', icon: <Video />, label: 'Médiathèque & Liens' },
  ];

  const visibleItems = items.filter(item => !item.roles || (user && item.roles.includes(user.role)));

  return (
    <aside className="w-80 bg-bg-base border-r border-border-dim flex flex-col h-full relative z-50">
      <div className="p-10 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-nexus-blue/10 border border-nexus-blue/20 rounded-2xl flex items-center justify-center">
            <Shield className="w-7 h-7 text-nexus-blue" />
          </div>
          <div>
            <div className="text-xl font-black tracking-tighter text-text-vibrant leading-none">NEXUS<span className="text-nexus-blue">ZT</span></div>
            <div className="text-[10px] text-text-muted font-bold uppercase tracking-[0.2em] mt-1">Enterprise</div>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
        {visibleItems.map(item => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={cn(
              "nav-item w-full",
              currentView === item.id && "active"
            )}
          >
            <div className={cn(
              "p-1.5 rounded-lg transition-all",
              currentView === item.id ? "bg-nexus-blue text-white shadow-[0_0_15px_rgba(14,165,233,0.4)]" : "text-text-muted"
            )}>
              {React.cloneElement(item.icon as any, { size: 18 })}
            </div>
            <span className="font-semibold tracking-tight">{item.label}</span>
            {currentView === item.id && (
               <motion.div layoutId="activeNav" className="ml-auto w-1.5 h-1.5 rounded-full bg-nexus-blue shadow-[0_0_10px_rgba(14,165,233,0.8)]" />
            )}
          </button>
        ))}
      </nav>

      <div className="p-6 mt-auto">
        <div className="mb-6 mx-2 p-4 nx-card bg-white/[0.03] border-white/5">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-nexus-blue/20 flex items-center justify-center text-nexus-blue font-bold border border-nexus-blue/20 relative">
                {user?.email?.charAt(0).toUpperCase()}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-nexus-safe rounded-full border-2 border-bg-base flex items-center justify-center">
                   <ShieldCheck size={8} className="text-white" />
                </div>
             </div>
             <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 overflow-hidden">
                   <div className="text-xs font-bold text-text-vibrant truncate uppercase">{user?.email?.split('@')[0]}</div>
                   <div className="w-1 h-1 rounded-full bg-nexus-safe animate-pulse shrink-0" title="Identity Active" />
                </div>
                <div className="text-[10px] text-text-muted font-medium truncate opacity-60">ID: {user?.id?.slice(0, 8)}...</div>
             </div>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: "85%" }}
               className="h-full bg-nexus-blue"
             />
          </div>
          <div className="mt-2 flex justify-between text-[8px] font-bold text-text-muted uppercase tracking-widest">
             <span>Trust Score</span>
             <span className="text-nexus-safe">85% Secured</span>
          </div>
        </div>

        <button 
          onClick={onLogout}
          className="nx-btn-ghost w-full justify-start text-nexus-alert hover:bg-nexus-alert/10 hover:text-nexus-alert"
        >
          <LogOut size={18} />
          <span className="font-bold text-xs uppercase tracking-widest">Terminer Session</span>
        </button>
      </div>
    </aside>
  );
}


function SecurityLogList({ limit, filters }: { limit?: number; filters?: any }) {
  const [logs, setLogs] = useState<SecurityLog[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const res = await axios.get('/api/admin/logs');
      setLogs(res.data);
    };
    fetch();
    const interval = setInterval(fetch, 3000);
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Identity and Severity extraction for filtering legacy or unstructured logs
      const logSeverity = log.severity || (['DENY', 'ATTACK', 'AUTH_FAIL', 'ACCESS_REVOKED'].includes(log.type) ? 'HIGH' : ['WARN', 'AI_MFA', 'FAIL'].includes(log.type) ? 'MEDIUM' : 'LOW');
      const logUserMatch = log.msg.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      const logUser = log.user || (logUserMatch ? logUserMatch[1] : 'SYSTEM');
      
      if (filters?.search && !log.msg.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters?.user && !logUser.toLowerCase().includes(filters.user.toLowerCase())) return false;
      if (filters?.type && filters.type !== 'ALL' && log.type !== filters.type) return false;
      if (filters?.severity && filters.severity !== 'ALL' && logSeverity !== filters.severity) return false;
      
      if (filters?.dateStart || filters?.dateEnd) {
        const logDate = new Date(log.timestamp);
        if (filters.dateStart && logDate < new Date(filters.dateStart)) return false;
        if (filters.dateEnd) {
          const endDate = new Date(filters.dateEnd);
          endDate.setHours(23, 59, 59, 999);
          if (logDate > endDate) return false;
        }
      }
      
      return true;
    });
  }, [logs, filters]);

  const displayLogs = limit ? filteredLogs.slice(0, limit) : filteredLogs;

  return (
    <div className="space-y-1">
      {displayLogs.length === 0 ? (
        <div className="py-8 text-center text-text-secondary opacity-50 italic">
          No logs found matching criteria.
        </div>
      ) : (
        displayLogs.map((log) => (
          <div key={log.id} className="flex gap-4 py-1 border-b border-white/5 last:border-0 hover:bg-white/5 px-2 rounded group items-center transition-colors">
            <span className="text-text-secondary shrink-0 font-mono text-[10px]">[{formatDate(log.timestamp)}]</span>
            <span className={cn(
              "font-bold shrink-0 w-24 text-[10px] tracking-tight",
              log.type && (log.type.includes('FAIL') || log.type.includes('DENY') || log.type === 'ATTACK') ? 'text-accent-alert' : 'text-accent-safe'
            )}>
              {(log.type || 'INFO').padEnd(10)}
            </span>
            <div className="flex-1 min-w-0">
               <span className="text-text-primary truncate block">{log.msg}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
               <span className={cn(
                 "text-[8px] font-bold px-1 rounded border uppercase",
                 (['DENY', 'ATTACK', 'AUTH_FAIL', 'ACCESS_REVOKED'].includes(log.type) ? 'border-accent-alert text-accent-alert' : 
                  ['WARN', 'AI_MFA', 'FAIL'].includes(log.type) ? 'border-accent-warn text-accent-warn' : 
                  'border-security-muted/30 text-security-muted')
               )}>
                 {['DENY', 'ATTACK', 'AUTH_FAIL', 'ACCESS_REVOKED'].includes(log.type) ? 'HIGH' : ['WARN', 'AI_MFA', 'FAIL'].includes(log.type) ? 'MEDIUM' : 'LOW'}
               </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
