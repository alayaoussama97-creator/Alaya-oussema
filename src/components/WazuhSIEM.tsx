import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { 
  ShieldAlert, 
  Activity, 
  Server, 
  Cpu, 
  Globe, 
  Search, 
  Filter, 
  RefreshCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Terminal, 
  Play, 
  X, 
  ShieldCheck, 
  Database, 
  ArrowRight, 
  FileText, 
  PlusCircle, 
  Loader2, 
  Copy, 
  Lock, 
  Flame, 
  Bug, 
  Sparkles, 
  Zap, 
  Check 
} from 'lucide-react';

// Types for Wazuh SIEM & XDR
interface Agent {
  id: string;
  name: string;
  ip: string;
  os: string;
  status: 'active' | 'disconnected' | 'never_connected';
  version: string;
  vulnerabilities: number;
  fimStatus: 'clean' | 'altered' | 'scanning';
  lastKeepAlive: string;
}

interface SecurityEvent {
  id: string;
  timestamp: string;
  level: number;
  agentId: string;
  agentName: string;
  ruleId: string;
  group: 'authentication' | 'syslog' | 'web' | 'fim' | 'active-response' | 'policy';
  description: string;
  attackerIp?: string;
  tactics?: string[];
}

interface FimItem {
  path: string;
  fileType: string;
  size: string;
  modified: string;
  chksum: string;
  status: 'stable' | 'modified' | 'scanning';
}

interface Vulnerability {
  id: string;
  cve: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  pkg: string;
  currentVersion: string;
  fixedVersion: string;
  title: string;
  agentId: string;
}

interface ActiveResponseBlock {
  ip: string;
  reason: string;
  agentId: string;
  timestamp: string;
  status: 'active' | 'expired';
}

export default function WazuhSIEM() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'agents' | 'fim' | 'vulns' | 'rules' | 'active-response'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<number | 'all'>('all');

  // Multi-step Interactive Simulations state
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([
    { id: '000', name: 'wazuh-manager', ip: '10.150.4.5', os: 'Ubuntu 24.04 LTS', status: 'active', version: '4.8.2', vulnerabilities: 0, fimStatus: 'clean', lastKeepAlive: 'Now' },
    { id: '001', name: 'vm_kali', ip: '192.168.12.50', os: 'Kali Linux Rolling', status: 'active', version: '4.8.2', vulnerabilities: 14, fimStatus: 'clean', lastKeepAlive: '4s ago' },
    { id: '002', name: 'vm_ubuntu_target', ip: '10.150.12.10', os: 'Ubuntu 22.04 LTS', status: 'active', version: '4.8.1', vulnerabilities: 5, fimStatus: 'clean', lastKeepAlive: '12s ago' },
    { id: '003', name: 'win_ad_srv', ip: '10.150.12.20', os: 'Windows Server 2022', status: 'disconnected', version: '4.7.5', vulnerabilities: 8, fimStatus: 'clean', lastKeepAlive: '1d ago' },
    { id: '004', name: 'nexus_gateway_core', ip: '10.150.1.1', os: 'Alpine Linux ZT', status: 'never_connected', version: 'None', vulnerabilities: 0, fimStatus: 'clean', lastKeepAlive: 'Never' }
  ]);

  const [fimItems, setFimItems] = useState<FimItem[]>([
    { path: '/etc/passwd', fileType: 'File', size: '2.4 KB', modified: '2026-06-14 12:45', chksum: 'da39a3ee5e6b4b0d3255bfef95601890afd80709', status: 'stable' },
    { path: '/etc/shadow', fileType: 'File', size: '1.8 KB', modified: '2026-06-14 12:45', chksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e46', status: 'stable' },
    { path: '/etc/ssh/sshd_config', fileType: 'File', size: '4.1 KB', modified: '2026-06-12 09:12', chksum: '86f7e437faa5a7fce15d1ddcb9eaeaea377667b8', status: 'stable' },
    { path: '/bin/login', fileType: 'Binary', size: '64.2 KB', modified: '2026-01-10 11:00', chksum: '910ec3f8430a6dfa357eb432320abac93b9cd414', status: 'stable' },
    { path: '/usr/sbin/sshd', fileType: 'Binary', size: '820 KB', modified: '2026-01-10 11:00', chksum: '7308d5dc743a1a9e9de02cfb69ef498a4421b4a4', status: 'stable' }
  ]);

  const [activeBlocks, setActiveBlocks] = useState<ActiveResponseBlock[]>([
    { ip: '185.220.101.42', reason: 'FIM alert Level 12: Unauthorized file binary mutation', agentId: '001', timestamp: '2026-06-16 11:20:05', status: 'active' },
    { ip: '198.51.100.99', reason: 'Brute-force: 15 SSH authentication failures within 30s', agentId: '002', timestamp: '2026-06-16 12:05:40', status: 'active' }
  ]);

  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([
    { id: 'evt_1', timestamp: '2026-06-16 13:05:12', level: 3, agentId: '002', agentName: 'vm_ubuntu_target', ruleId: '5715', group: 'authentication', description: 'SSHD logged successful login for root via publickey', attackerIp: '10.150.12.50' },
    { id: 'evt_2', timestamp: '2026-06-16 12:58:30', level: 9, agentId: '001', agentName: 'vm_kali', ruleId: '21024', group: 'web', description: 'Apache SQL injection trial attempt - Error based SQL characters detected', attackerIp: '185.22.40.105', tactics: ['Initial Access', 'Exploitation'] },
    { id: 'evt_3', timestamp: '2026-06-16 12:05:40', level: 11, agentId: '002', agentName: 'vm_ubuntu_target', ruleId: '5716', group: 'authentication', description: 'SSHD Brute Force attack - multiple failed SSH attempts triggered dynamic block rule', attackerIp: '198.51.100.99', tactics: ['Credential Access'] },
    { id: 'evt_4', timestamp: '2026-06-16 11:45:00', level: 5, agentId: '000', agentName: 'wazuh-manager', ruleId: '501', group: 'syslog', description: 'System log rotating initiated cleanly' },
    { id: 'evt_5', timestamp: '2026-06-16 11:20:05', level: 12, agentId: '001', agentName: 'vm_kali', ruleId: '550', group: 'fim', description: 'FIM Integrity altered: SHA256 checksum changed on monitored system binary: /bin/login', tactics: ['Persistence', 'Defense Evasion'] },
    { id: 'evt_6', timestamp: '2026-06-16 10:15:33', level: 7, agentId: '002', agentName: 'vm_ubuntu_target', ruleId: '1002', group: 'policy', description: 'Policy check: Insecure Telnet daemon ports closed successfully (CIS Benchmark v3.2)' }
  ]);

  const [vulns, setVulns] = useState<Vulnerability[]>([
    { id: 'v_1', cve: 'CVE-2024-38077', severity: 'Critical', pkg: 'ms-ad-domain-service', currentVersion: '10.0.20348', fixedVersion: 'KB5040437 Patch', title: 'Windows AD Remote Code Execution Vulnerability (RCE)', agentId: '003' },
    { id: 'v_2', cve: 'CVE-2021-3156', severity: 'High', pkg: 'sudo', currentVersion: '1.8.31p1-1ubuntu1', fixedVersion: '1.8.31p1-1ubuntu1.2', title: 'Baron Samedit: Sudo local privilege escalation Heap Overflow', agentId: '002' },
    { id: 'v_3', cve: 'CVE-2021-44228', severity: 'Critical', pkg: 'log4j-core', currentVersion: '2.14.0', fixedVersion: '2.15.0', title: 'Log4Shell Apache Log4j JNDI remote code execution', agentId: '001' },
    { id: 'v_4', cve: 'CVE-2024-3094', severity: 'Critical', pkg: 'liblzma5', currentVersion: '5.6.0', fixedVersion: '5.6.1-patch', title: 'XZ Utils Backdoor upstream compromise injecting remote SSH Auth bypass', agentId: '002' },
    { id: 'v_5', cve: 'CVE-2023-4911', severity: 'High', pkg: 'libc6', currentVersion: '2.35-0ubuntu3.1', fixedVersion: '2.35-0ubuntu3.4', title: 'Looney Tunables: GNU C Library dynamic loader buffer overflow', agentId: '002' }
  ]);

  // Deployment agent guide configuration
  const [deployOs, setDeployOs] = useState<'ubuntu' | 'alpine' | 'windows'>('ubuntu');
  const [deployManagerIp, setDeployManagerIp] = useState('10.150.4.5');
  const [copiedDeploy, setCopiedDeploy] = useState(false);
  const [deployingAgentId, setDeployingAgentId] = useState<string | null>(null);

  // XML custom rules state
  const [promptRule, setPromptRule] = useState('');
  const [generatedRule, setGeneratedRule] = useState('');
  const [generatingRule, setGeneratingRule] = useState(false);

  // Explaining with AI state
  const [explainingEvent, setExplainingEvent] = useState<SecurityEvent | null>(null);
  const [aiExplanation, setAiExplanation] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Active remediation guide state
  const [remediatingVuln, setRemediatingVuln] = useState<Vulnerability | null>(null);
  const [vulnGuide, setVulnGuide] = useState('');
  const [vulnLoading, setVulnLoading] = useState(false);

  // Simulation Status feedbacks
  const [simFeedbacks, setSimFeedbacks] = useState<string[]>([]);
  const [attackerActive, setAttackerActive] = useState(false);

  // Add event to top of queue
  const logSimFeedback = (msg: string) => {
    setSimFeedbacks(prev => [ `[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 7) ]);
  };

  // Deployment simulator script
  const deployScripts = {
    ubuntu: `wget -qO - https://packages.wazuh.com/key/GPG-KEY-WAZUH | gpg --dearmor -o /usr/share/keyrings/wazuh.gpg\necho "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" | tee -a /etc/apt/sources.list.d/wazuh.list\nsudo apt-get update && sudo WAZUH_MANAGER='${deployManagerIp}' apt-get install wazuh-agent\nsudo systemctl daemon-reload && sudo systemctl enable wazuh-agent && sudo systemctl start wazuh-agent`,
    alpine: `wget -O /etc/apk/keys/wazuh.rsa.pub https://packages.wazuh.com/key/GPG-KEY-WAZUH.pub\necho "https://packages.wazuh.com/4.x/alpine/v3.18/main" >> /etc/apk/repositories\napk update && WAZUH_MANAGER='${deployManagerIp}' apk add wazuh-agent\nrc-update add wazuh-agent default && rc-service wazuh-agent start`,
    windows: `Invoke-WebRequest -Uri https://packages.wazuh.com/4.x/windows/wazuh-agent-4.8.2-1.msi -OutFile wazuh-agent.msi\nmsiexec.exe /i wazuh-agent.msi /qn WAZUH_MANAGER='${deployManagerIp}' WAZUH_REGISTRATION_SERVER='${deployManagerIp}'\nNET START Wazuh`
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDeploy(true);
    setTimeout(() => setCopiedDeploy(false), 2000);
  };

  // Simulating Wazuh agent install
  const handleSimulateInstall = (agentId: string) => {
    setDeployingAgentId(agentId);
    setLoading(true);
    logSimFeedback(`Starting agent deployment procedure... Establishing SSH stream securely.`);
    
    setTimeout(() => {
      setAgents(prev => prev.map(a => {
        if (a.id === agentId) {
          return { ...a, status: 'active', version: '4.8.2', lastKeepAlive: 'Now' };
        }
        return a;
      }));

      // Add a security event to Wazuh log
      const target = agents.find(a => a.id === agentId);
      const targetName = target ? target.name : 'Unknown Host';
      const newEvt: SecurityEvent = {
        id: `evt_sim_${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        level: 3,
        agentId: agentId,
        agentName: targetName,
        ruleId: '502',
        group: 'policy',
        description: `Wazuh agent successfully deployed and connected. Self-monitoring handshake complete (version 4.8.2).`
      };

      setSecurityEvents(prev => [newEvt, ...prev]);
      setDeployingAgentId(null);
      setLoading(false);
      logSimFeedback(`Handshake SUCCESS: agent connected with Manager at ${deployManagerIp} (node: ${targetName}).`);
    }, 2500);
  };

  // Simulating FIM Intrusion / Modified file trigger
  const handleSimulateFimMod = (filePath: string) => {
    // Modify status
    setFimItems(prev => prev.map(f => {
      if (f.path === filePath) {
        return { ...f, status: 'scanning' };
      }
      return f;
    }));
    logSimFeedback(`FIM Triggered on active node: File alteration initiated on ${filePath}.`);

    setTimeout(() => {
      setFimItems(prev => prev.map(f => {
        if (f.path === filePath) {
          return { 
            ...f, 
            status: 'modified', 
            modified: new Date().toISOString().replace('T', ' ').substring(0, 16),
            chksum: 'bf30fba9bc99cbea99a5e4d0e6ba39cf9e54a1a3e5'
          };
        }
        return f;
      }));

      // Generate a severe level 12 alarm in Wazuh SIEM
      const newEvt: SecurityEvent = {
        id: `evt_fim_${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        level: 12,
        agentId: '002',
        agentName: 'vm_ubuntu_target',
        ruleId: '550',
        group: 'fim',
        description: `CRITICAL ALERT - File Integrity Compromised: Monitored file '${filePath}' changed attributes and SHA256 checksum. Intrinsic mutation detected.`,
        tactics: ['Defense Evasion', 'Persistence']
      };

      setSecurityEvents(prev => [newEvt, ...prev]);
      logSimFeedback(`Wazuh FIM Alert! SHA256 mismatch detected on ${filePath}. Alert Level 12 dispatched.`);
    }, 1500);
  };

  // Simulating an Attacker Brute Force leading to Active Response Block
  const handleBruteForceSimulation = () => {
    if (attackerActive) return;
    setAttackerActive(true);
    logSimFeedback(`Launching automated brute-force simulation (50 auth requests/sec) targeting vm_ubuntu_target.`);

    // 1. Initial login failure logs
    setTimeout(() => {
      const failEvt: SecurityEvent = {
        id: `evt_bf_1`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        level: 5,
        agentId: '002',
        agentName: 'vm_ubuntu_target',
        ruleId: '5715',
        group: 'authentication',
        description: `SSHD connection attempt failed for invalid user administrative_tester`,
        attackerIp: '185.112.5.40'
      };
      setSecurityEvents(prev => [failEvt, ...prev]);
      logSimFeedback(`Failed authenticate attempts streaming... Wazuh decoder matching rule 5715.`);
    }, 800);

    // 2. Heavy brute force threshold crossed & alert level escalates
    setTimeout(() => {
      const assaultEvt: SecurityEvent = {
        id: `evt_bf_2`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        level: 11,
        agentId: '002',
        agentName: 'vm_ubuntu_target',
        ruleId: '5716',
        group: 'authentication',
        description: `SSHD Brute-Force threshold exceeded: 25 failures detected within 12s on agent 002.`,
        attackerIp: '185.112.5.40',
        tactics: ['Credential Access']
      };
      setSecurityEvents(prev => [assaultEvt, ...prev]);
      logSimFeedback(`Warning Level 11 crossed! Automated XDR response triggered.`);
    }, 2000);

    // 3. Wazuh triggers Active Response to auto-block IP
    setTimeout(() => {
      const activeRespEvt: SecurityEvent = {
        id: `evt_bf_3`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        level: 13,
        agentId: '002',
        agentName: 'vm_ubuntu_target',
        ruleId: '601',
        group: 'active-response',
        description: `ACTIVE RESPONSE: Blocked attacking IP 185.112.5.40 using firewall-drop custom script for 600 seconds.`,
        attackerIp: '185.112.5.40',
        tactics: ['Mitigation']
      };

      setSecurityEvents(prev => [activeRespEvt, ...prev]);
      
      const newBlock: ActiveResponseBlock = {
        ip: '185.112.5.40',
        reason: 'SSH brute force (rule 5716) detected on vm_ubuntu_target',
        agentId: '002',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        status: 'active'
      };
      setActiveBlocks(prev => [newBlock, ...prev]);
      
      logSimFeedback(`ACTIVE RESPONSE SUCCESSFUL: Attacking host 185.112.5.40 blacklisted on vm_ubuntu_target firewall.`);
      setAttackerActive(false);
    }, 3500);
  };

  // Re-enable a blocked IP address
  const handleRemoveBlock = (blockedIp: string) => {
    setActiveBlocks(prev => prev.filter(b => b.ip !== blockedIp));
    logSimFeedback(`Manual Active Response Flush: Dynamic firewall rules updated to permit IP ${blockedIp}.`);
  };

  // Fetch AI explanation based on security event
  const explainEventWithAI = async (event: SecurityEvent) => {
    setExplainingEvent(event);
    setAiExplanation("Contact de l'analyse IA de Nexus...");
    setAiLoading(true);

    try {
      const response = await axios.post('/api/ai/secure-generate', {
        contents: `Analyze this security event logged by Wazuh SIEM:
- Rule ID: ${event.ruleId}
- Group: ${event.group}
- Level: ${event.level} (Wazuh severity scale)
- Description: ${event.description}
- Attacker IP: ${event.attackerIp || 'Unknown'}
- Target Host: ${event.agentName}
Provide:
1. Short overview of the specific risk/threat (MITRE ATT&CK alignment if possible).
2. Deep dive on how typical Wazuh decoders detect this.
3. Steps to remediate and configure better containment.
Be extremely professional, cyber-dense, and highly helpful.`,
        config: {
          systemInstruction: "You are the Nexus Elite Wazuh Integrator and Threat Analyst. You help SOC teams quickly dissect security alerts, understand XML decoder files, and harden hosts."
        }
      });
      setAiExplanation(response.data.text || "No insights found.");
    } catch (err: any) {
      console.error(err);
      setAiExplanation("Failed to execute secure analytical stream. Verify your key or API availability.");
    } finally {
      setAiLoading(false);
    }
  };

  // Custom XML Rule prompt generator
  const createCustomXmlRule = async () => {
    if (!promptRule.trim()) return;
    setGeneratingRule(true);
    setGeneratedRule('');
    try {
      const response = await axios.post('/api/ai/secure-generate', {
        contents: `Draft a custom Wazuh XML decoders or rule block for the following security request: "${promptRule}".
Include the Wazuh xml wrappers (<group>, <rule id="100XXX" level="X">, <description>, etc.) and explain what parent rules it requires or can override. Make it technically accurate syntax ready for local/etc/rules.xml.`,
        config: {
          systemInstruction: "You represent the Wazuh custom rules helper tool. Strictly return pristine XML block along with a short explanation of dependencies."
        }
      });
      setGeneratedRule(response.data.text || "XML synthesis timed out.");
    } catch (e: any) {
      console.error(e);
      setGeneratedRule("Secure rule synthesis failed. Ensure API access.");
    } finally {
      setGeneratingRule(false);
    }
  };

  // Custom AI vulnerability patch steps
  const remediateVulnWithAI = async (vuln: Vulnerability) => {
    setRemediatingVuln(vuln);
    setVulnGuide("Génération du script de déploiement correct...");
    setVulnLoading(true);
    try {
      const response = await axios.post('/api/ai/secure-generate', {
        contents: `Write a robust step-by-step terminal terminal commands list to patch package '${vuln.pkg}' from vulnerable version '${vuln.currentVersion}' to fixed version '${vuln.fixedVersion}' to address CVE '${vuln.cve}' on target OS matching this CVE: '${vuln.title}' context. Make sure you use actual bash/powershell commands code blocks.`,
        config: {
          systemInstruction: "You are a hard working SRE cyber security security engineer. Provide direct CLI copy-pasteable commands with brief instructions."
        }
      });
      setVulnGuide(response.data.text || "Remediation data unavailable.");
    } catch (e: any) {
      console.error(e);
      setVulnGuide("Error drafting patch strategy. Please proceed manually.");
    } finally {
      setVulnLoading(false);
    }
  };

  // Filtered Events
  const filteredEvents = securityEvents.filter(evt => {
    const matchesSearch = evt.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          evt.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          evt.ruleId.includes(searchTerm);
    const matchesGroup = selectedGroup === 'all' || evt.group === selectedGroup;
    const matchesLevel = selectedLevel === 'all' || evt.level >= Number(selectedLevel);
    return matchesSearch && matchesGroup && matchesLevel;
  });

  return (
    <div id="wazuh-siem-root" className="w-full relative min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-8 mb-8 border-b border-border-dim gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-nexus-blue/10 border border-nexus-blue/20 text-nexus-blue">
              <Activity className="w-6 h-6 animate-pulse" />
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight font-display text-text-vibrant">
              Wazuh Security Intelligence SIEM
            </h1>
          </div>
          <p className="text-sm text-text-dim mt-2 max-w-2xl">
            Monitor state systems, analyze events, assess vulnerabilities, and orchestrate threat response across agents using live file integrity monitoring (FIM).
          </p>
        </div>
        
        {/* Quick Simulator Controller */}
        <div className="flex items-center gap-2 bg-bg-surface border border-border-dim rounded-2xl p-3 shadow-lg">
          <span className="text-xs font-bold text-text-dim px-2 uppercase tracking-tight">XDR Sim:</span>
          
          <button 
            onClick={handleBruteForceSimulation} 
            disabled={attackerActive}
            className="px-4 py-2 bg-nexus-alert/10 hover:bg-nexus-alert/25 text-nexus-alert font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all"
          >
            <Flame className="w-4.5 h-4.5" />
            {attackerActive ? 'Attaque en cours...' : 'Simuler Attaque SSH Force Brute'}
          </button>
        </div>
      </div>

      {/* Main Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="nx-card p-6 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-1">
              Statut Manager
            </span>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-nexus-safe animate-ping" />
              <div className="text-xl font-black text-text-vibrant uppercase">Actif</div>
            </div>
            <p className="text-xs text-text-muted mt-2">IP Manager: 10.150.4.5</p>
          </div>
          <div className="p-4 rounded-xl bg-nexus-safe/10 border border-nexus-safe/20 text-nexus-safe">
            <ShieldCheck className="w-8 h-8" />
          </div>
        </div>

        <div className="nx-card p-6 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-1">
              Agents Wazuh
            </span>
            <div className="text-3xl font-black text-text-vibrant">
              {agents.filter(a => a.status === 'active').length} <span className="text-text-dim text-lg">/ {agents.length}</span>
            </div>
            <p className="text-xs text-nexus-blue mt-2 font-bold cursor-pointer hover:underline" onClick={() => setActiveTab('agents')}>
              Gérer les déploiements →
            </p>
          </div>
          <div className="p-4 rounded-xl bg-nexus-blue/10 border border-nexus-blue/20 text-nexus-blue">
            <Server className="w-8 h-8" />
          </div>
        </div>

        <div className="nx-card p-6 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-1">
              FIM Aléatoires
            </span>
            <div className="text-3xl font-black text-text-vibrant">
              {fimItems.filter(f => f.status === 'modified').length === 0 ? (
                <span className="text-nexus-safe">0 anomalies</span>
              ) : (
                <span className="text-nexus-alert">{fimItems.filter(f => f.status === 'modified').length} modifiés</span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-2">Dossiers critiques sous écoute</p>
          </div>
          <div className="p-4 rounded-xl bg-nexus-warn/10 border border-nexus-warn/20 text-nexus-warn">
            <Database className="w-8 h-8" />
          </div>
        </div>

        <div className="nx-card p-6 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-1">
              Vulnérabilités Actives
            </span>
            <div className="text-3xl font-black text-nexus-alert">
              {vulns.length} CVEs
            </div>
            <p className="text-xs text-text-muted mt-2">Asséchées par catalogue Wazuh</p>
          </div>
          <div className="p-4 rounded-xl bg-nexus-alert/10 border border-nexus-alert/20 text-nexus-alert">
            <Bug className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-border-dim space-x-2 overflow-x-auto select-none no-scrollbar mb-8">
        {[
          { id: 'dashboard', label: 'Sécurité & Évènements', icon: <Activity size={16} /> },
          { id: 'agents', label: 'Déploiement des Agents', icon: <Server size={16} /> },
          { id: 'fim', label: 'File Integrity Monitoring (FIM)', icon: <Lock size={16} /> },
          { id: 'active-response', label: `Active Response IP Blocks (${activeBlocks.length})`, icon: <ShieldAlert size={16} /> },
          { id: 'vulns', label: 'Analyse de Vulnérabilités', icon: <Bug size={16} /> },
          { id: 'rules', label: 'Créateur de Règles Custom', icon: <Sparkles size={16} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm whitespace-nowrap transition-all ${
              activeTab === tab.id 
                ? 'border-nexus-blue text-nexus-blue bg-nexus-blue/5' 
                : 'border-transparent text-text-dim hover:text-text-vibrant'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Interactive Simulation Console Messages */}
      {simFeedbacks.length > 0 && (
        <div className="nx-card bg-bg-elevated border-border-bright p-4 rounded-xl mb-8 flex flex-col font-mono text-[11px] leading-relaxed relative">
          <span className="absolute top-2 right-4 text-[9px] uppercase tracking-widest text-[#0e8ebf] font-bold">flux télémétrie active</span>
          <div className="flex items-center gap-2 mb-2 text-text-vibrant font-extrabold uppercase text-[10px] tracking-wider border-b border-white/5 pb-1">
            <Terminal className="text-nexus-cyan w-3.5 h-3.5" />
            Audit Journal de Simulation Wazuh
          </div>
          {simFeedbacks.map((item, index) => (
            <div key={index} className="text-slate-300">
              <span className="text-nexus-cyan font-semibold mr-1">►</span>{item}
            </div>
          ))}
        </div>
      )}

      {/* Dynamic Content Views */}
      <AnimatePresence mode="wait">
        {activeTab === 'dashboard' && (
          <motion.div 
            key="dashboard-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Filter controls */}
            <div className="nx-card p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-center bg-bg-surface">
              <div className="relative md:col-span-2">
                <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Chercher par description, Host ou ID de règle..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-white/[0.03] hover:bg-white/[0.05] focus:bg-white/[0.08] border border-border-dim rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold tracking-tight transition-all focus:outline-none focus:border-nexus-blue text-text-vibrant"
                />
              </div>

              <div>
                <select
                  value={selectedGroup}
                  onChange={e => setSelectedGroup(e.target.value)}
                  className="w-full bg-white/[0.03] hover:bg-white/[0.05] border border-border-dim rounded-xl px-4 py-2.5 text-sm font-semibold text-text-dim transition-all focus:outline-none focus:border-nexus-blue"
                >
                  <option value="all">Tous les groupes</option>
                  <option value="authentication">Authentification</option>
                  <option value="syslog">Système / daemon</option>
                  <option value="web">Serveur Web (Apache)</option>
                  <option value="fim">Intégrité de fichiers (FIM)</option>
                  <option value="active-response">Réponses Actives</option>
                </select>
              </div>

              <div>
                <select
                  value={selectedLevel === 'all' ? 'all' : selectedLevel.toString()}
                  onChange={e => setSelectedLevel(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="w-full bg-white/[0.03] hover:bg-white/[0.05] border border-border-dim rounded-xl px-4 py-2.5 text-sm font-semibold text-text-dim transition-all focus:outline-none focus:border-nexus-blue"
                >
                  <option value="all">Sévérité (Tous niveaux)</option>
                  <option value="3">Niveau &gt;= 3 (Mineur)</option>
                  <option value="7">Niveau &gt;= 7 (Avertissement)</option>
                  <option value="10">Niveau &gt;= 10 (Sérieux)</option>
                  <option value="12">Niveau &gt;= 12 (Critique)</option>
                </select>
              </div>
            </div>

            {/* Events Logs Table */}
            <div className="nx-card overflow-hidden">
              <div className="p-6 border-b border-border-dim flex justify-between items-center bg-white/[0.01]">
                <h3 className="font-extrabold text-base tracking-tight text-text-vibrant flex items-center gap-2">
                  <Activity className="text-nexus-cyan font-bold w-4.5 h-4.5" />
                  Journal d'Alertes Temps-Réel (SIEM logs)
                </h3>
                <span className="text-xs px-3 py-1 bg-white/5 border border-white/10 font-bold tracking-tight rounded-lg text-text-dim">
                  {filteredEvents.length} alertes trouvées
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border-dim bg-white/[0.02]">
                      <th className="p-4 text-xs font-black uppercase tracking-widest text-[#0e8ebf]">Niveau</th>
                      <th className="p-4 text-xs font-black uppercase tracking-widest text-[#0e8ebf]">Horodatage</th>
                      <th className="p-4 text-xs font-black uppercase tracking-widest text-[#0e8ebf]">Agent d'Origine</th>
                      <th className="p-4 text-xs font-black uppercase tracking-widest text-[#0e8ebf]">Catégorie</th>
                      <th className="p-4 text-xs font-black uppercase tracking-widest text-[#0e8ebf]">Alert Description</th>
                      <th className="p-4 text-xs font-black uppercase tracking-widest text-[#0e8ebf] text-center">Rôle / Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.map(evt => {
                      // Get severity coloring
                      let badgeColor = "bg-white/[0.05] text-[#b4b4b4] border-white/5";
                      if (evt.level >= 12) badgeColor = "bg-nexus-alert/15 text-nexus-alert border-nexus-alert/25";
                      else if (evt.level >= 9) badgeColor = "bg-nexus-warn/15 text-nexus-warn border-nexus-warn/25";
                      else if (evt.level >= 5) badgeColor = "bg-nexus-blue/15 text-nexus-blue border-nexus-blue/25";
                      
                      return (
                        <tr key={evt.id} className="border-b border-white/[0.03] hover:bg-white/[0.01] transition-all">
                          <td className="p-4">
                            <span className={`px-2.5 py-1 text-xs font-bold border rounded-lg ${badgeColor}`}>
                              Niv. {evt.level}
                            </span>
                          </td>
                          <td className="p-4 font-mono text-xs text-text-dim">{evt.timestamp}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Server className="w-3.5 h-3.5 text-text-muted" />
                              <span className="text-sm font-bold text-text-vibrant">{evt.agentName}</span>
                              <span className="text-[10px] text-text-muted">({evt.agentId})</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-white/[0.04] border border-white/10 rounded-md text-text-dim">
                              {evt.group}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-slate-200">
                            <div className="flex flex-col gap-1.5">
                              <span className="font-semibold">{evt.description}</span>
                              {evt.attackerIp && (
                                <span className="text-xs font-mono text-nexus-alert">
                                  Attaquant IP: {evt.attackerIp}
                                </span>
                              )}
                              {evt.tactics && evt.tactics.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {evt.tactics.map((t, idx) => (
                                    <span key={idx} className="text-[9px] font-black uppercase tracking-wider bg-nexus-blue/10 text-nexus-cyan px-2 py-0.5 rounded border border-nexus-cyan/20">
                                      MITRE: {t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => explainEventWithAI(evt)}
                              className="px-3 py-1.5 bg-nexus-blue/10 hover:bg-nexus-blue/25 text-nexus-cyan text-xs font-bold rounded-xl border border-nexus-cyan/20 transition-all flex items-center justify-center gap-1 mx-auto"
                            >
                              <Sparkles size={12} />
                              Analyse IA
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredEvents.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center p-8 text-text-muted font-bold">
                          Aucun journal Wazuh ne correspond à vos filtres actuels.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Deploy Agents Panel */}
        {activeTab === 'agents' && (
          <motion.div 
            key="agents-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Deploy Instructions Generator */}
            <div className="nx-card p-6 lg:col-span-5 flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-lg text-text-vibrant tracking-tight mb-4 flex items-center gap-2">
                  <PlusCircle className="text-nexus-cyan" />
                  Générateur de script d'installation Wazuh Agent
                </h3>
                <p className="text-xs text-text-dim leading-relaxed mb-6">
                  Pour installer, s'authentifier par certificat et connecter un agent d'infrastructure au SOC Wazuh Manager, générez la commande terminal correspondante en fonction de l'OS cible.
                </p>

                {/* Switch OS controls */}
                <div className="flex gap-2 mb-6">
                  {(['ubuntu', 'alpine', 'windows'] as const).map(os => (
                    <button
                      key={os}
                      onClick={() => setDeployOs(os)}
                      className={`flex-1 py-2 font-bold text-xs uppercase tracking-wider rounded-xl border transition-all ${
                        deployOs === os 
                          ? 'border-nexus-blue text-nexus-cyan bg-nexus-blue/10 shadow-[0_0_10px_rgba(14,165,233,0.1)]' 
                          : 'border-white/5 bg-white/[0.02] text-text-muted hover:text-text-vibrant'
                      }`}
                    >
                      {os === 'ubuntu' ? 'Ubuntu / Debian' : os === 'alpine' ? 'Alpine Linux' : 'MS Windows'}
                    </button>
                  ))}
                </div>

                {/* Manager configuration */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-[10px] uppercase font-black tracking-widest text-[#0e8ebf] block mb-2">
                      IP du Serveur Wazuh Manager
                    </label>
                    <input
                      type="text"
                      value={deployManagerIp}
                      onChange={e => setDeployManagerIp(e.target.value)}
                      className="w-full bg-white/[0.03] border border-border-dim rounded-xl px-4 py-2.5 text-xs font-mono text-text-vibrant focus:outline-none focus:border-nexus-blue"
                    />
                  </div>
                </div>

                {/* Code Terminal Output */}
                <div className="relative rounded-2xl bg-black border border-white/5 p-4 font-mono text-xs overflow-x-auto mb-6 max-h-64 scrollbar-thin">
                  <button 
                    onClick={() => copyToClipboard(deployScripts[deployOs])} 
                    className="absolute top-3 right-3 p-2 bg-white/5 hover:bg-white/15 border border-white/10 rounded-lg text-text-dim transition-all"
                    title="Copier le code"
                  >
                    {copiedDeploy ? <Check className="w-4 h-4 text-nexus-safe" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <pre className="text-green-400 whitespace-pre-wrap leading-relaxed pr-10">
                    {deployScripts[deployOs]}
                  </pre>
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl text-xs text-text-dim leading-normal italic">
                💡 L'authentification par l'hôte agent utilise un certificat TLS asymétrique mutuel automatique validé par le Manager au premier check-in.
              </div>
            </div>

            {/* Managed Hosts List */}
            <div className="nx-card p-6 lg:col-span-7 flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-lg text-text-vibrant tracking-tight mb-4 flex items-center gap-2">
                  <Server className="text-nexus-cyan" />
                  Noeuds du Parc & Agents Wazuh Connectés
                </h3>
                <p className="text-xs text-text-dim mb-6">
                  État de communication de tous les hôtes physiques, routeurs et containers de l'architecture.
                </p>

                <div className="space-y-4">
                  {agents.map(agent => {
                    let statusColor = "text-nexus-safe bg-nexus-safe/10 border-nexus-safe/20";
                    let statusText = "En Ligne";
                    if (agent.status === 'disconnected') {
                      statusColor = "text-nexus-warn bg-nexus-warn/10 border-nexus-warn/20";
                      statusText = "Déconnecté";
                    } else if (agent.status === 'never_connected') {
                      statusColor = "text-text-muted bg-white/[0.02] border-white/5";
                      statusText = "Aucun agent";
                    }

                    return (
                      <div key={agent.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-2xl transition-all gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl border ${
                            agent.status === 'active' ? 'bg-nexus-safe/10 border-nexus-safe/25 text-nexus-safe' : 'bg-white/[0.02] border-white/5 text-text-muted'
                          }`}>
                            <Cpu className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-text-vibrant">{agent.name}</span>
                              <span className="text-[10px] font-mono bg-white/5 px-1.5 py-0.5 rounded text-text-dim">ID: {agent.id}</span>
                            </div>
                            <div className="text-xs text-text-dim font-mono mt-1 flex flex-wrap gap-x-3 gap-y-1">
                              <span>IP: {agent.ip}</span>
                              <span>• OS: {agent.os}</span>
                              <span>• Agent: v{agent.version}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest border rounded-lg ${statusColor}`}>
                            {statusText}
                          </span>
                          
                          {agent.status === 'never_connected' && (
                            <button
                              onClick={() => handleSimulateInstall(agent.id)}
                              disabled={loading}
                              className="px-3 py-1.5 bg-nexus-blue/10 hover:bg-nexus-blue/25 text-nexus-cyan text-xs font-bold rounded-xl border border-nexus-cyan/20 transition-all flex items-center gap-1"
                            >
                              {deployingAgentId === agent.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Play size={12} />
                              )}
                              Raccorder
                            </button>
                          )}

                          {agent.status === 'disconnected' && (
                            <button
                              onClick={() => handleSimulateInstall(agent.id)}
                              disabled={loading}
                              className="px-3 py-1.5 bg-nexus-warn/10 hover:bg-nexus-warn/25 text-nexus-warn text-xs font-bold rounded-xl border border-nexus-warn/20 transition-all flex items-center gap-1"
                            >
                              Restart Agent
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* FIM File Integrity Monitoring */}
        {activeTab === 'fim' && (
          <motion.div 
            key="fim-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Left FIM Concept */}
            <div className="nx-card p-6 lg:col-span-4 flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-lg text-text-vibrant tracking-tight mb-4 flex items-center gap-2">
                  <Lock className="text-nexus-cyan" />
                  Wazuh Syscheck Engine
                </h3>
                <p className="text-xs text-[#d1d1d6] leading-relaxed mb-6">
                  Le système de surveillance d'intégrité de fichiers (FIM) de Wazuh analyse périodiquement les clés de registre et les répertoires système spécifiés, à la recherche de modifications de hash cryptographiques, d'UID/GID ou d'autorisations.
                </p>

                <div className="space-y-4">
                  <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                    <span className="text-[9px] font-black uppercase text-[#0e8ebf] tracking-widest block mb-2">Modes d'analyse</span>
                    <ul className="text-xs text-text-dim space-y-2 list-disc list-inside">
                      <li>Real-time monitoring via fanotify (Linux)</li>
                      <li>Whodata collection (who modified the file)</li>
                      <li>Heuristic check on binary trojanization</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-nexus-blue/5 rounded-2xl border border-nexus-blue/10">
                    <span className="text-xs font-bold text-nexus-cyan block mb-1">Pourquoi surveiller /etc/passwd ?</span>
                    <p className="text-[11px] text-[#bac5cd] leading-relaxed">
                      L'ajout frauduleux d'une ligne dans /etc/passwd est l'une des techniques d'évasion d'attaquant les plus courantes pour conserver un accès root persistant.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5">
                <button
                  onClick={() => handleSimulateFimMod('/etc/passwd')}
                  disabled={fimItems.some(f => f.status === 'scanning')}
                  className="w-full py-3 bg-nexus-alert/15 hover:bg-nexus-alert/25 text-nexus-alert border border-nexus-alert/30 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Flame className="w-4 h-4" />
                  Simuler écriture frauduleuse dans /etc/passwd
                </button>
              </div>
            </div>

            {/* Monitored directories table */}
            <div className="nx-card p-6 lg:col-span-8">
              <h3 className="font-extrabold text-lg text-text-vibrant tracking-tight mb-2 flex items-center gap-2">
                <Database className="text-nexus-cyan" />
                Table de Contrôle d'Intégrité en Continu (Syscheck DB)
              </h3>
              <p className="text-xs text-text-dim mb-6">
                Contrôle temps réel des hash (SHA-1 / SHA-256) pour les fichiers configurés sur les agents Wazuh.
              </p>

              <div className="overflow-x-auto rounded-xl border border-white/5">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/[0.01] border-b border-white/5 text-xs text-text-muted font-bold">
                      <th className="p-4">Fichier surveillé</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Dernière Vérification</th>
                      <th className="p-4">Dernier hash cryptographique</th>
                      <th className="p-4">Statut Wazuh</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fimItems.map((fim, i) => {
                      let statusBadge = "bg-nexus-safe/10 text-nexus-safe border-nexus-safe/25";
                      let statusLabel = "Strictement Intègre";
                      if (fim.status === 'scanning') {
                        statusBadge = "bg-nexus-blue/15 text-nexus-cyan border-nexus-cyan/25";
                        statusLabel = "Scan en cours...";
                      } else if (fim.status === 'modified') {
                        statusBadge = "bg-nexus-alert/15 text-nexus-alert border-nexus-alert/25";
                        statusLabel = "Altered/Modified";
                      }

                      return (
                        <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.01] transition-all text-xs">
                          <td className="p-4 font-mono font-bold text-text-vibrant">{fim.path}</td>
                          <td className="p-4">
                            <span className="bg-white/5 px-2 py-0.5 rounded text-[10px] uppercase font-bold text-text-dim border border-white/10">
                              {fim.fileType}
                            </span>
                          </td>
                          <td className="p-4 text-text-dim">{fim.modified}</td>
                          <td className="p-4 font-mono text-[10px] text-text-muted select-all">
                            {fim.chksum.substring(0, 16)}...
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded inline-block text-[10px] font-bold border ${statusBadge}`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleSimulateFimMod(fim.path)}
                              disabled={fim.status === 'scanning'}
                              className="px-2 py-1 bg-white/5 hover:bg-white/10 text-text-dim hover:text-text-vibrant rounded-md font-bold transition-all"
                            >
                              Simuler modification
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Active Response Blocks */}
        {activeTab === 'active-response' && (
          <motion.div 
            key="response-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Concept presentation */}
            <div className="nx-card p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-4">
                <h3 className="font-extrabold text-lg text-text-vibrant flex items-center gap-2">
                  <ShieldAction className="text-nexus-cyan" />
                  Moteur Wazuh Active-Response
                </h3>
                <p className="text-xs text-text-dim leading-relaxed">
                  L'Active Response de Wazuh exécutes des scripts automatisés sur les agents lorsqu'une alerte spécifique de sévérité élevée ou un comportement anormal est déclenché. Les cas d'usage typiques incluent l'isolation réseau, le drop de firewall IP ou l'interdiction de session.
                </p>
                
                <div className="p-4 bg-nexus-blue/5 rounded-2xl border border-nexus-blue/10">
                  <div className="text-xs font-bold text-nexus-cyan mb-1 flex items-center gap-1">
                    <Terminal size={12} />
                    Script firewall-drop
                  </div>
                  <p className="text-[11px] text-[#bac5cd] leading-normal font-mono">
                    iptables -A INPUT -s $INPUT_IP -j DROP
                  </p>
                </div>
              </div>

              {/* Firewalled blocks dynamic list */}
              <div className="lg:col-span-2">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-sm uppercase tracking-wider text-[#0e8ebf]">
                    Host Blacklistés en Temps Réel (Active-Response Database)
                  </h4>
                  <span className="text-xs px-2.5 py-0.5 bg-nexus-alert/10 text-nexus-alert border border-nexus-alert/20 rounded font-bold uppercase">
                    {activeBlocks.length} Blocages Actifs
                  </span>
                </div>

                <div className="space-y-4">
                  {activeBlocks.map((b, idx) => (
                    <div key={idx} className="p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-nexus-alert">{b.ip}</span>
                          <span className="text-[10px] font-bold uppercase tracking-widest bg-nexus-alert/10 text-nexus-alert px-1.5 py-0.5 rounded border border-nexus-alert/20">
                            DROP FIREWALL
                          </span>
                        </div>
                        <p className="text-xs text-text-vibrant font-medium mt-1">
                          Motif: {b.reason}
                        </p>
                        <p className="text-[10px] text-text-dim font-mono mt-1">
                          Bloqué depuis : {b.timestamp} | Agent affecté : Node-00{b.agentId}
                        </p>
                      </div>

                      <button
                        onClick={() => handleRemoveBlock(b.ip)}
                        className="px-3 py-1.5 bg-nexus-safe/10 hover:bg-nexus-safe/25 text-nexus-safe border border-nexus-safe/20 text-xs font-semibold rounded-xl transition-all"
                      >
                        Autoriser l'hôte (Flush Rule)
                      </button>
                    </div>
                  ))}

                  {activeBlocks.length === 0 && (
                    <div className="p-8 text-center text-text-muted border border-dashed border-white/5 rounded-2xl font-bold text-sm">
                      Aucun hote n'est actuellement bloqué par le XDR Actif.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Vulnerability Scanner */}
        {activeTab === 'vulns' && (
          <motion.div 
            key="vulns-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div className="nx-card p-6">
              <h3 className="font-extrabold text-lg text-text-vibrant tracking-tight mb-2 flex items-center gap-2">
                <Bug className="text-nexus-cyan" />
                Security Audit: Wazuh Vulnerability Detector
              </h3>
              <p className="text-xs text-text-dim mb-6">
                Analyse les paquets applicatifs du systeme d'exploitation de l'agent en les corrélant avec les flux nationaux NVD (National Vulnerability Database) CVE.
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Vulns list */}
                <div className="lg:col-span-2 space-y-4">
                  {vulns.map((v, idx) => {
                    let badgeColor = "bg-orange-500/10 text-orange-400 border-orange-500/25";
                    if (v.severity === 'Critical') {
                      badgeColor = "bg-nexus-alert/15 text-nexus-alert border-nexus-alert/25";
                    }

                    return (
                      <div key={v.id} className="p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-xs font-bold text-nexus-cyan font-mono">{v.cve}</span>
                            <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border rounded-md ${badgeColor}`}>
                              {v.severity}
                            </span>
                            <span className="text-xs text-text-dim">Paquet: <strong className="font-mono text-text-vibrant">{v.pkg}</strong></span>
                          </div>
                          
                          <div>
                            <h4 className="font-bold text-sm text-text-vibrant">{v.title}</h4>
                            <p className="text-xs text-text-dim mt-1">
                              Installé: <span className="font-mono text-text-muted">{v.currentVersion}</span> | Patch obligatoire: <span className="font-mono text-nexus-safe font-semibold">{v.fixedVersion}</span>
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => remediateVulnWithAI(v)}
                          className="px-3 py-1.5 bg-nexus-blue/10 hover:bg-nexus-blue/25 text-nexus-cyan border border-nexus-cyan/25 text-xs font-bold rounded-xl transition-all whitespace-nowrap self-end sm:self-center flex items-center gap-1"
                        >
                          <Terminal size={12} />
                          Patch CLI Guide
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Right side patch analyzer */}
                <div className="lg:col-span-1">
                  <div className="nx-card p-6 bg-bg-elevated border-border-bright h-full flex flex-col">
                    <h4 className="text-xs font-black uppercase tracking-widest text-[#0e8ebf] mb-4 flex items-center gap-1.5">
                      <Terminal className="text-nexus-cyan" />
                      Remédiation Assistée par IA
                    </h4>

                    {remediatingVuln ? (
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-4">
                            <span className="text-xs font-bold text-text-vibrant">{remediatingVuln.cve}</span>
                            <button onClick={() => setRemediatingVuln(null)} className="text-text-muted hover:text-text-vibrant">
                              <X size={14} />
                            </button>
                          </div>

                          <div className="text-xs text-text-vibrant font-semibold mb-3">
                            Directives de correction applicatives ({remediatingVuln.pkg}):
                          </div>

                          {vulnLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3 text-text-dim text-xs font-bold">
                              <Loader2 className="animate-spin text-nexus-blue" size={32} />
                              Synthèse de la commande d'upgrade...
                            </div>
                          ) : (
                            <div className="prose prose-invert max-w-none text-xs text-slate-300 font-medium leading-relaxed max-h-[350px] overflow-y-auto custom-scrollbar">
                              <ReactMarkdown>{vulnGuide}</ReactMarkdown>
                            </div>
                          )}
                        </div>

                        {!vulnLoading && (
                          <div className="pt-4 border-t border-white/5 mt-4 text-[10px] text-text-muted">
                            Appliquez cette remédiation sur le terminal SSH de l'agent correspondant pour clore l'incident.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-text-muted font-bold text-xs">
                        <Bug className="w-12 h-12 text-white/5 mb-3" />
                        Cliquez sur "Patch CLI Guide" à côté d'une anomalie pour concevoir les commandes de mitigation adaptées.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Custom Rules Creator */}
        {activeTab === 'rules' && (
          <motion.div 
            key="rules-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Input requirements */}
            <div className="nx-card p-6 lg:col-span-5 flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-lg text-text-vibrant tracking-tight mb-4 flex items-center gap-2">
                  <Sparkles className="text-nexus-cyan" />
                  Concepteur de Règles Wazuh Custom XML
                </h3>
                <p className="text-xs text-text-dim leading-relaxed mb-6">
                  Wazuh lit les fichiers XML dans <code>/var/ossec/etc/rules/</code> pour déclencher les alertes. Vous pouvez ajouter des règles propriétaires indexées par IDs pour vos deacons maison ou vos audits spécifiques.
                </p>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-[10px] uppercase font-black tracking-widest text-[#0e8ebf] block mb-2">
                      Quel comportement voulez-vous décoder ou auditer ?
                    </label>
                    <textarea
                      value={promptRule}
                      onChange={e => setPromptRule(e.target.value)}
                      placeholder="Ex: Détecter quand l'utilisateur change de mot de passe à l'aide de passwd sur Ubuntu. Lancer une alerte de niveau 10."
                      className="w-full h-32 bg-white/[0.03] hover:bg-white/[0.05] focus:bg-white/[0.08] border border-border-dim rounded-xl px-4 py-3 text-xs font-semibold text-text-vibrant transition-all focus:outline-none focus:border-nexus-blue placeholder-text-muted resize-none leading-relaxed"
                    />
                  </div>

                  <button
                    onClick={createCustomXmlRule}
                    disabled={generatingRule || !promptRule.trim()}
                    className="w-full py-3 bg-nexus-blue text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:opacity-90 disabled:opacity-50 disabled:shadow-none"
                  >
                    {generatingRule ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                    Synthétiser la Règle Wazuh (XML)
                  </button>
                </div>
              </div>

              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-xs text-text-dim">
                <span className="font-bold text-text-vibrant block mb-1">Rappel de la convention Wazuh:</span>
                Les IDs utilisateurs personnalisés doivent commencer à partir de <strong>100000</strong> pour éviter des conflits avec les décodeurs officiels du systeme.
              </div>
            </div>

            {/* XML Display */}
            <div className="nx-card p-6 lg:col-span-7 flex flex-col justify-between min-h-[450px]">
              <div>
                <h3 className="font-extrabold text-lg text-text-vibrant tracking-tight mb-4 flex items-center gap-2">
                  <Terminal className="text-nexus-cyan" />
                  Rendu clean du ficher local rules.xml
                </h3>

                {generatingRule ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-4 text-text-dim font-bold text-xs">
                    <Loader2 className="animate-spin text-nexus-blue" size={36} />
                    Génération du modèle XML en cours...
                  </div>
                ) : generatedRule ? (
                  <div className="prose prose-invert max-w-none text-xs text-slate-300 font-semibold leading-relaxed overflow-y-auto max-h-[400px] custom-scrollbar bg-black p-4 rounded-2xl border border-white/5 font-mono select-all">
                    <ReactMarkdown>{generatedRule}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center py-24 text-text-muted font-bold text-xs">
                    <Terminal className="w-16 h-16 text-white/5 mb-2" />
                    Utilisez l'éditeur IA sur la gauche pour générer et formuler le script XML de sécurité requis.
                  </div>
                )}
              </div>

              {generatedRule && !generatingRule && (
                <div className="pt-4 border-t border-white/5 mt-4 flex justify-between items-center">
                  <span className="text-[10px] text-text-muted">Prêt à copier dans etc/rules.xml</span>
                  <button
                    onClick={() => copyToClipboard(generatedRule)}
                    className="px-3 py-1.5 bg-[#0ea5e9]/10 hover:bg-[#0ea5e9]/20 text-[#0ea5e9] text-xs font-bold rounded-lg border border-[#0ea5e9]/20 transition-all"
                  >
                    {copiedDeploy ? 'Copié !' : 'Copier Tout'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Explanation Modal overlay */}
      <AnimatePresence>
        {explainingEvent && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[100] p-6">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-3xl bg-bg-surface border border-border-bright rounded-2xl overflow-hidden shadow-2xl relative"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-nexus-cyan animate-pulse" />
                  <h3 className="font-extrabold text-base text-text-vibrant">
                    Investigation Nexus IA : Alerte Règle {explainingEvent.ruleId}
                  </h3>
                </div>
                <button
                  onClick={() => setExplainingEvent(null)}
                  className="p-1 rounded-lg hover:bg-white/10 text-text-muted hover:text-text-vibrant transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[500px] custom-scrollbar">
                {/* Event summary headers */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-xl mb-6 text-xs">
                  <div>
                    <span className="text-[10px] text-text-muted font-bold block">AGENT</span>
                    <span className="font-bold text-text-vibrant">{explainingEvent.agentName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted font-bold block">SÉVÉRITÉ</span>
                    <span className={`font-bold ${explainingEvent.level >= 10 ? 'text-nexus-alert' : 'text-nexus-warn'}`}>
                      Niv. {explainingEvent.level}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted font-bold block">GROUPE WAZUH</span>
                    <span className="font-bold text-text-vibrant capitalize">{explainingEvent.group}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted font-bold block">ORIGINE IP</span>
                    <span className="font-mono text-text-vibrant">{explainingEvent.attackerIp || 'Locale/Interne'}</span>
                  </div>
                </div>

                {/* AI Text markdown */}
                {aiLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-text-dim text-xs font-bold">
                    <Loader2 className="animate-spin text-nexus-blue" size={36} />
                    Collecte de télémétrie et analyse IA...
                  </div>
                ) : (
                  <div className="prose prose-invert max-w-none text-sm text-slate-300 leading-relaxed custom-markdown">
                    <ReactMarkdown>{aiExplanation}</ReactMarkdown>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-white/5 bg-white/[0.01] flex justify-between items-center text-xs text-text-muted">
                <span>Certifié conforme au modèle de décodage Wazuh XDR.</span>
                <button
                  onClick={() => setExplainingEvent(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-text-vibrant font-semibold rounded-xl transition-all"
                >
                  Fermer l'investigation
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Custom internal sub-component to prevent missing icon definitions
function ShieldAction({ className }: { className?: string }) {
  return (
    <span className={`p-1.5 rounded-lg bg-nexus-cyan/15 border border-nexus-cyan/30 text-nexus-cyan inline-flex items-center justify-center ${className}`}>
      <Lock size={16} />
    </span>
  );
}
