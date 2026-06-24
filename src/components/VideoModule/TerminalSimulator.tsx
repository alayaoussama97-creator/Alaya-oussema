import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Terminal as TermIcon, 
  ShieldCheck, 
  ShieldAlert, 
  Cpu, 
  Send, 
  HelpCircle, 
  Sparkles,
  RefreshCw,
  Clock,
  TerminalSquare,
  Activity,
  Layers,
  Unlock,
  Lock,
  Server,
  Network,
  ArrowRight,
  Globe,
  Flame,
  FileText,
  Fingerprint,
  Key
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface TerminalSimulatorProps {
  onClose?: () => void;
}

interface Step {
  title: string;
  command: string;
  output: string[];
  duration: number; // seconds
}

export const TerminalSimulator: React.FC<TerminalSimulatorProps> = ({ onClose }) => {
  // Modes: 'demo' (automatic scenario steps) or 'interactive' (full console input)
  const [mode, setMode] = useState<'demo' | 'interactive'>('interactive');
  
  // Visual Support representation states ("affichage en image")
  const [viewMode, setViewMode] = useState<'console' | 'diagram'>('diagram');
  const [simulationState, setSimulationState] = useState<'idle' | 'attack' | 'curl_direct' | 'curl_mtls'>('idle');
  const [simLog, setSimLog] = useState<string>("Prêt pour la simulation réseau...");

  useEffect(() => {
    if (simulationState === 'idle') return;
    const t = setTimeout(() => {
      setSimulationState('idle');
    }, 7000);
    return () => clearTimeout(t);
  }, [simulationState]);
  
  // Guided demo scenario states
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false); // Default false so they can discover interactive mode!
  const [typedCommand, setTypedCommand] = useState('');
  const [demoHistory, setDemoHistory] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  // Interactive console states
  const [userInput, setUserInput] = useState('');
  const [interactiveHistory, setInteractiveHistory] = useState<{ type: 'input' | 'output'; text: string }[]>([
    { type: 'output', text: '============================================================' },
    { type: 'output', text: '   NEXUS LABS : CONSOLE D\'ACCÈS AU LABORATOIRE ZERO TRUST   ' },
    { type: 'output', text: '============================================================' },
    { type: 'output', text: 'Machine Virtuelle : zero-trust@ubuntu-enclave-3092.internal' },
    { type: 'output', text: 'Technologie d\'isolation : Docker mTLS Container Core' },
    { type: 'output', text: 'Entrez "help" pour lister les outils et commandes disponibles.' },
    { type: 'output', text: 'Cliquez sur l\'un des raccourcis ci-dessous pour l\'essayer.' },
    { type: 'output', text: '' },
  ]);
  const [commandHistoryList, setCommandHistoryList] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const steps: Step[] = [
    {
      title: "1. PRÉPARER LE SERVEUR",
      command: "sudo apt update && sudo apt upgrade -y && sudo apt install -y curl openssl htop ufw",
      output: [
        "Hit:1 http://archive.ubuntu.com/ubuntu jammy InRelease",
        "Get:2 http://archive.ubuntu.com/ubuntu jammy-updates InRelease [119 kB]",
        "Get:3 http://archive.ubuntu.com/ubuntu jammy-security InRelease [110 kB]",
        "Reading package lists... Done",
        "Building dependency tree... Done",
        "Reading state information... Done",
        "Calculating upgrade... Done",
        "The following NEW packages will be installed:",
        "  curl openssl htop ufw",
        "0 upgraded, 4 newly installed, 0 to remove.",
        "Setting up openssl (3.0.2-0ubuntu1.15)...",
        "Setting up curl (7.81.0-1ubuntu1.16)...",
        "Setting up htop (3.0.5-7ubuntu1)...",
        "Setting up ufw (0.36.1-4build1)...",
        "[SUCCÈS] Serveur Ubuntu mis à jour et dépendances réseau installées."
      ],
      duration: 5
    },
    {
      title: "2. INSTALLER DOCKER",
      command: "curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh && sudo usermod -aG docker $USER",
      output: [
        "Downloading Docker installer script...",
        "# Executing docker install script, committing to system apt keyring",
        "Get:1 https://download.docker.com/linux/ubuntu jammy InRelease [48.9 kB]",
        "Selecting previously unselected package docker-ce-cli.",
        "Selecting previously unselected package docker-ce.",
        "Selecting previously unselected package docker-compose-plugin.",
        "Preparing to unpack .../docker-ce_26.1.4_amd64.deb ...",
        "Unpacking docker-ce (26.1.4-1~ubuntu.22.04~jammy) ...",
        "Setting up docker-ce-cli (26.1.4-1~ubuntu.22.04~jammy) ...",
        "Setting up docker-ce (26.1.4-1~ubuntu.22.04~jammy) ...",
        "Adding user zero-trust to group docker",
        "[OK] Docker Engine v26.1.4 & Compose v2.26.1 installés avec succès."
      ],
      duration: 5
    },
    {
      title: "3. DÉPLOYER VAULTWARDEN",
      command: "mkdir -p zt-vault && cd zt-vault && cat <<EOF > docker-compose.yml",
      output: [
        "[SERVEUR] Création du dossier d'isolation /home/zero-trust/zt-vault",
        "[CONFIG] Écriture de l'architecture d'isolation multi-conteneurs...",
        "  - Service 'vaultwarden' (Chiffrement Bitwarden local isolé)",
        "  - Service 'nginx-gateway' (Proxy inverse avec SSL obligatoire)",
        "zero-trust@virtual-vm:~/zt-vault$ sudo docker compose up -d",
        "Creating network 'zt-vault_default' with driver 'bridge'",
        "Pulling vaultwarden/server (latest)... ✔ Done",
        "Pulling nginx:1.29.8-alpine-isolated... ✔ Done",
        "Creating vaultwarden-server ... Started",
        "Creating nginx-gateway        ... Started",
        "[OK] Vaultwarden isolé derrière Nginx démarré avec succès."
      ],
      duration: 5
    },
    {
      title: "4. METTRE EN PLACE MTLS",
      command: "openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ca.key -out ca.crt",
      output: [
        "Generating a RSA private key... +++++",
        "writing new private key to 'ca.key'",
        "-----",
        "You are about to enter information to generate your Certificate Authority:",
        "Country Name (2 letter code) [FR]: FR",
        "Common Name (eg, server FQDN) []: Nexus Root CA",
        "zero-trust@virtual-vm:~/zt-vault$ openssl genrsa -out client.key 2048",
        "zero-trust@virtual-vm:~/zt-vault$ openssl req -new -key client.key -out client.csr",
        "zero-trust@virtual-vm:~/zt-vault$ openssl x509 -req -days 365 -in client.csr -CA ca.crt -CAkey ca.key -set_serial 01 -out client.crt",
        "Signature ok",
        "subject=CN=Client_User, emailAddress=admin@nexus-lab.internal",
        "Getting CA Private Key",
        "[SUCCÈS] Autorité de certification racine et certificats mTLS d'accès générés."
      ],
      duration: 6
    },
    {
      title: "5. AJOUTER KEYCLOAK (2FA)",
      command: "cat <<EOF >> docker-compose.yml && docker compose up -d keycloak",
      output: [
        "[COCON DE SÉCURITÉ] Ajout du module d'Identité et Double Facteur (MFA)",
        "Appel à l'image Keycloak (Identity Provider)",
        "Pulling keycloak/keycloak (latest)... ✔ Done",
        "Creating keycloak-mfa-idp ... Started",
        "[VERIFIÉ] Canal Keycloak initialisé sur le port interne 8080.",
        "[MFA] Module Authenticator TOTP & Bypass Zero Trust Nginx configurés."
      ],
      duration: 5
    },
    {
      title: "6. CONFIGURER FAIL2BAN",
      command: "sudo apt install -y fail2ban && cat <<EOF | sudo tee /etc/fail2ban/jail.local",
      output: [
        "Reading package lists... Done",
        "Building dependency tree... Done",
        "The following NEW packages will be installed: fail2ban",
        "Setting up fail2ban (0.11.2-6)...",
        "[CONFIG] Écriture de la prison /etc/fail2ban/jail.local...",
        "  - Monitoring: /var/log/nginx/access.log",
        "  - MaxRetry: 3 tentatives suspectes avant blocage",
        "  - BanTime: 3600 secondes d'isolement IP",
        "zero-trust@virtual-vm:~$ sudo systemctl restart fail2ban",
        "zero-trust@virtual-vm:~$ sudo fail2ban-client status nginx-mtls",
        "Status for the jail: nginx-mtls",
        "|- Filter",
        "|  |- Currently failed: 0",
        "|  `- Total failed: 0",
        "`- Actions",
        "   |- Currently banned: 0",
        "   `- Total banned: 0",
        "[FAIL2BAN] Protection anti-brute-force mTLS opérationnelle."
      ],
      duration: 6
    },
    {
      title: "7. ACTIVER IPTABLES",
      command: "sudo iptables -A INPUT -p tcp --dport 22 -s 192.168.152.0/24 -j ACCEPT",
      output: [
        "[FIREWALL] Autorisation d'accès d'administration SSH de confiance uniquement...",
        "zero-trust@virtual-vm:~$ sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT",
        "zero-trust@virtual-vm:~$ sudo iptables -A INPUT -p tcp --dport 8080 -j DROP",
        "zero-trust@virtual-vm:~$ sudo iptables -P INPUT DROP",
        "[CONFIG] Sauvegarde des règles réseau : iptables-save > /etc/iptables/rules.v4",
        "zero-trust@virtual-vm:~$ sudo iptables -L -v -n",
        "Chain INPUT (policy DROP 12 packets, 984 bytes)",
        " pkts bytes target     prot opt in     out     source               destination",
        "  484 35000 ACCEPT     tcp  --  *      *       192.168.152.0/24     0.0.0.0/0            tcp dpt:22",
        " 1205 92400 ACCEPT     tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp dpt:443",
        "   24  1248 DROP       tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp dpt:8080",
        "[SÉCURISÉ] Pare-feu de périmètre IPTables verrouillé."
      ],
      duration: 6
    },
    {
      title: "8. AUDIT ET PÉNÉTRATION KALI",
      command: "kali@kali-security:~$ nmap -p 443,8080 192.168.152.131",
      output: [
        "Starting Nmap 7.94 ( https://nmap.org ) at 2026-06-12 12:20 CEST",
        "Nmap scan report for zero-trust-server (192.168.152.131)",
        "PORT     STATE    SERVICE",
        "443/tcp  open     https",
        "8080/tcp filtered http-proxy (Filtré par Pare-feu IPTables)",
        "",
        "kali@kali-security:~$ hydra -l admin -P rockyou.txt ssh://192.168.152.131",
        "Hydra v9.5 (c) van Hauser/THC - Play only for security audits!",
        "[DATA] attacking ssh://192.168.152.131:22/",
        "[22][ssh] attack failed (IPTables block trigger)",
        "[INFO] Fail2Ban a détecté les requêtes suspectes et a banni l'IP de Kali !",
        "kali@kali-security:~$ curl -k https://192.168.152.131",
        "HTTP/1.1 400 Bad Request: mTLS clients only (Accès refusé)",
        "kali@kali-security:~$ curl --cert client.crt --key client.key -k https://192.168.152.131",
        "HTTP/1.1 200 OK - Secure Portal Authenticated! [✔ ACCÈS AUTORISÉ]"
      ],
      duration: 8
    }
  ];

  // Quick interactive commands shortcuts
  const INTERACTIVE_SHORTCUTS = [
    { label: "Aide / Menu", cmd: "help" },
    { label: "Scanner Ports (Nmap)", cmd: "nmap -p 443,8080 192.168.152.131" },
    { label: "Test HTTPS direct", cmd: "curl -k https://192.168.152.131" },
    { label: "Test avec Certificat mTLS", cmd: "curl --cert client.crt --key client.key -k https://192.168.152.131" },
    { label: "Lister Fichiers du Lab", cmd: "ls" },
    { label: "État Docker Compose", cmd: "docker ps" },
    { label: "Configuration Jail local", cmd: "cat jail.local" },
    { label: "Pare-feu iptables list", cmd: "iptables -L -n -v" },
    { label: "Status Fail2Ban", cmd: "fail2ban-client status nginx" },
  ];

  // Dynamic automatic demo logic
  useEffect(() => {
    if (mode !== 'demo' || !isPlaying) return;

    let localProgress = 0;
    const interval = setInterval(() => {
      localProgress += 1;
      setProgress((localProgress / (steps[activeStep].duration * 10)) * 100);

      if (localProgress >= steps[activeStep].duration * 10) {
        clearInterval(interval);
        setTimeout(() => {
          if (activeStep < steps.length - 1) {
            setActiveStep(prev => prev + 1);
            setProgress(0);
          } else {
            setActiveStep(0);
            setProgress(0);
          }
        }, 1500);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [activeStep, isPlaying, mode]);

  useEffect(() => {
    if (mode !== 'demo') return;

    const cmd = steps[activeStep].command;
    let index = 0;
    setTypedCommand('');
    setDemoHistory([]);

    let outputTimer: NodeJS.Timeout | null = null;

    const typingTimer = setInterval(() => {
      if (index < cmd.length) {
        setTypedCommand(prev => prev + cmd.charAt(index));
        index++;
      } else {
        clearInterval(typingTimer);
        let lineIndex = 0;
        const outputLines = steps[activeStep].output;
        
        outputTimer = setInterval(() => {
          if (lineIndex < outputLines.length) {
            setDemoHistory(prev => {
              const newLine = outputLines[lineIndex];
              return newLine ? [...prev, newLine] : prev;
            });
            lineIndex++;
          } else {
            if (outputTimer) clearInterval(outputTimer);
          }
        }, 100);
      }
    }, 35);

    return () => {
      clearInterval(typingTimer);
      if (outputTimer) clearInterval(outputTimer);
    };
  }, [activeStep, mode]);

  // Visual simulation flow runner ("affichage en image / diagramme interactif")
  const runVisualSimulation = (type: 'attack' | 'curl_direct' | 'curl_mtls') => {
    setSimulationState(type);
    
    let cmd = '';
    let responseLines: string[] = [];
    
    if (type === 'attack') {
      setSimLog("LANCEMENT: Séquence offensive de scan & brute-force SSH depuis Kali...");
      cmd = "hydra -l admin -P rockyou.txt ssh://192.168.152.131";
      responseLines = [
        "Hydra v9.5 (c) van Hauser/THC - Play only for security audits!",
        "[DATA] attacking ssh://192.168.152.131:22/",
        "12:45:02 [ERROR] SSH connection dropped (Fail2Ban jail triggered on repeated attempts)",
        "[INFO] Le daemon Fail2Ban a bloqué l'adresse IP 192.168.152.122 !",
        "[PARE-FEU] Commutateur IPTables mis en quarantaine pour l'IP hostile."
      ];
      
      setTimeout(() => {
        setSimLog("DÉTECTION INCIDENT: Quarantaine active. IP de Kali bloquée dans iptables-save.");
      }, 3000);
      
    } else if (type === 'curl_direct') {
      setSimLog("LANCEMENT: Tentative de curl direct HTTP/HTTPS sans certificat de sécurité...");
      cmd = "curl -k https://192.168.152.131";
      responseLines = [
        "*   Trying 192.168.152.131:443...",
        "*   Connected to 192.168.152.131 (192.168.152.131) port 443",
        "*   ALPN: offers h2, http/1.1",
        "Nginx Gateway: Client TLS Certificate: none provided (REQUIS)",
        "< HTTP/1.1 400 Bad Request - mTLS clients only (Accès refusé)",
        "<html><head><title>400 Bad Request</title></head></html>"
      ];
      
      setTimeout(() => {
        setSimLog("REJET PASSERELLE: Connexion arrêtée par la gateway (Échec d'authentification mTLS).");
      }, 3000);
      
    } else if (type === 'curl_mtls') {
      setSimLog("LANCEMENT: Requête sécurisée mTLS chiffrée avec certificat de confiance...");
      cmd = "curl --cert client.crt --key client.key -k https://192.168.152.131";
      responseLines = [
        "*   Trying 192.168.152.131:443...",
        "*   Connected to 192.168.152.131 (192.168.152.131) port 443",
        "*   Sending Client Certificate client.crt...",
        "*   SSL Handshake successful: authenticated by Nexus Root CA",
        "< HTTP/1.1 200 OK - Secure Portal Authenticated! [✔ ACCÈS VÉRIFIÉ]",
        "[✔ SUCCÈS] Bienvenue sur les consoles Vaultwarden & Keycloak d'administration !"
      ];
      
      setTimeout(() => {
        setSimLog("TUNNEL SÉCURISÉ: Communication mTLS bilatérale chiffrée active.");
      }, 3000);
    }
    
    // Auto-populate into interactive history
    setInteractiveHistory(prev => [
      ...prev,
      { type: 'input', text: cmd },
      ...responseLines.map(line => ({ type: 'output' as const, text: line })),
      { type: 'output', text: '' }
    ]);
  };

  // Command execution logic for Interactive Mode
  const executeInteractiveCommand = (cmdText: string) => {
    const trimmed = cmdText.trim();
    if (!trimmed) return;

    // Save history
    setInteractiveHistory(prev => [...prev, { type: 'input', text: trimmed }]);
    setCommandHistoryList(prev => [...prev, trimmed]);
    setHistoryIndex(-1);

    const checkMatch = (value: string, pattern: string) => value.toLowerCase().replace(/\s+/g, '').includes(pattern.replace(/\s+/g, ''));

    let outputs: string[] = [];
    const normalizedInput = trimmed.toLowerCase();

    if (normalizedInput === 'help') {
      outputs = [
        "====== CHEVALET DE SÉCURITÉ ZERO TRUST - COMMANDES SUPPORTÉES ======",
        "  ls                              - Lister les certificats, services et configurations du lab.",
        "  cat <fichier>                   - Lire le contenu d'un fichier (ex: cat docker-compose.yml, cat ca.crt).",
        "  docker ps                       - Vérifier l'état et l'accès des conteneurs isolés.",
        "  fail2ban-client status nginx    - Consulter l'état de la prison anti brute-force IP.",
        "  iptables -L -n -v               - Visualiser les règles actives du pare-feu kernel.",
        "  nmap -p 443,8080 192.168.152.131 - Lancer un scan réseau offensif depuis la machine Kali.",
        "  curl -k https://192.168.152.131 - Établir une connexion HTTPS sans certificat TLS client (Refusé/400).",
        "  curl --cert client.crt --key client.key -k https://192.168.152.131",
        "                                  - Authentifier la requête grâce à la paire de clé mTLS (Autorisé/200).",
        "  systemctl status fail2ban       - Analyser l'état du démon de prévention des intrusions.",
        "  ping -c 3 192.168.152.131       - Envoyer des requêtes ICMP d'évaluation de latence.",
        "  whoami                          - Révéler le pseudonyme de l'ingénieur de session.",
        "  clear                           - Réinitialiser l'affichage de notre terminal.",
        "  demo                            - Rebasculer en mode Démo Automatique scénarisé.",
        "===================================================================="
      ];
    } else if (normalizedInput === 'ls') {
      outputs = [
        "total 32K",
        "-rw-r--r-- 1 zero-trust docker  824 Jun 14 12:00 docker-compose.yml",
        "-rw------- 1 zero-trust docker 1.6K Jun 14 12:05 ca.key",
        "-rw-r--r-- 1 zero-trust docker 1.1K Jun 14 12:05 ca.crt",
        "-rw------- 1 zero-trust docker 1.6K Jun 14 12:06 client.key",
        "-rw-r--r-- 1 zero-trust docker 1.1K Jun 14 12:06 client.crt",
        "-rw-r--r-- 1 zero-trust docker  980 Jun 14 12:06 client.csr",
        "-rw-r--r-- 1 zero-trust root    420 Jun 14 12:10 jail.local"
      ];
    } else if (normalizedInput.startsWith('cat ')) {
      const file = normalizedInput.substring(4).trim();
      if (file === 'docker-compose.yml') {
        outputs = [
          "version: '3.8'",
          "",
          "services:",
          "  vaultwarden:",
          "    image: vaultwarden/server:latest",
          "    container_name: vaultwarden-server",
          "    restart: always",
          "    environment:",
          "      - WEBSOCKET_ENABLED=true",
          "      - SIGNUPS_ALLOWED=false",
          "    volumes:",
          "      - ./vw-data:/data",
          "    networks:",
          "      - zt-private",
          "",
          "  nginx-gateway:",
          "    image: nginx:1.29.8-alpine-isolated",
          "    container_name: nginx-gateway",
          "    ports:",
          "      - \"443:443\"",
          "    volumes:",
          "      - ./nginx.conf:/etc/nginx/nginx.conf:ro",
          "      - ./ca.crt:/etc/nginx/certs/ca.crt:ro",
          "      - ./client.crt:/etc/nginx/certs/client.crt:ro",
          "      - ./client.key:/etc/nginx/certs/client.key:ro",
          "    networks:",
          "      - zt-private",
          "",
          "networks:",
          "  zt-private:",
          "    driver: bridge"
        ];
      } else if (file === 'ca.crt' || file === 'client.crt') {
        outputs = [
          "-----BEGIN CERTIFICATE-----",
          "MIIEQzCCAasCBgGHx1V6bzANBgkqhkiG9w0BAQsFADBLMQswCQYDVQQGEwJGUjES",
          "MBAGA1UECBMJSWRlLUZlcmUxFzAVBgNVBAoTDk5leHVzIExhYiBaVE5BMRUwEwYD",
          "VQQDEwxOZXh1cyBSb290IENBMB4XDTI2MDYxNDIwMDUzM1oXDTM2MDYxMDIwMDUz",
          "M1owSzELMAkGA1UEBhMCRlIxEjAQBgNVBAgTCUlkZS1GZXJlMRcwFQYDVQQKEw5O",
          "ZXh1cyBMYWIgWlROQTEVMBMGA1UEAxMMTmV4dXMgUm9vdCBDQTCCASIwDQYJKoZI",
          "hvcNAQEBBQADggEPADCCAQoCggEBAKzQ/bZz6e7d9b0wYvjGg89+G5uVbXg6A+S+",
          "gECA/N8pL7Zc5VeeK/XN3b7bIe8S5G8e/rN8eWv7z9nZeS5gZ+eQy5gZ+eQy5fGz",
          "g1m+8c6b7v6zN8mB+6yFzL/n2v2y8g==",
          "-----END CERTIFICATE-----",
          `[NEXUS CERT PARSER] Validated Cryptographic Pair: ${file === 'ca.crt' ? 'Root Certificate Authority (CA)' : 'Authenticated User Client Certificate'}`
        ];
      } else if (file === 'client.key' || file === 'ca.key') {
        outputs = [
          "-----BEGIN PRIVATE KEY-----",
          "MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCs0P22c+nu3fW9",
          "MGb4xoPPfhublW14Ogb+ksgECA/N8pL7Zc5VeeK/XN3b7bIe8S5G8e/rN8eWv7z9",
          "nZeS5gZ+eQy5gZ+eQy5fGzg1m+8c6b7v6zN8mB+6yFzL/n2v2y8g==...",
          "-----END PRIVATE KEY-----",
          "⚠ SECURITY WARNING: NEVER SHARE PRISTINE CRYPTOGRAPHIC KEYS METADATA"
        ];
      } else if (file === 'jail.local') {
        outputs = [
          "[nginx-mtls]",
          "enabled   = true",
          "port      = https,http-proxy",
          "filter    = nginx-mtls-auth",
          "logpath   = /var/log/nginx/access.log",
          "maxretry  = 3",
          "bantime   = 3600 (1 Hour IP Isolation)",
          "findtime  = 600"
        ];
      } else {
        outputs = [`cat: ${file}: Aucun fichier de ce type hanté dans l'enclave virtuelle.`];
      }
    } else if (normalizedInput === 'docker ps' || checkMatch(normalizedInput, 'dockerps')) {
      outputs = [
        "CONTAINER ID   IMAGE                               COMMAND                  CREATED         STATUS         PORTS                  NAMES",
        "b3c8f8d9a201   nginx:1.29.8-alpine-isolated        \"/docker-entrypoint.…\"   2 hours ago     Up 2 hours     0.0.0.0:443->443/tcp   nginx-gateway",
        "a9c8f8b8a342   vaultwarden/server:latest           \"/usr/bin/dumb-init …\"   2 hours ago     Up 2 hours     80/tcp, 3012/tcp       vaultwarden-server",
        "c2c9e7a7e112   keycloak/keycloak:latest            \"/opt/keycloak/bin/k…\"   1 hour ago      Up 1 hour      8080/tcp               keycloak-mfa-idp"
      ];
    } else if (normalizedInput.includes('fail2ban-client status') || normalizedInput.includes('fail2ban status')) {
      outputs = [
        "Status for the jail: nginx-mtls",
        "|- Filter",
        "|  |- Currently failed: 0",
        "|  `- Total failed: 12",
        "`- Actions",
        "   |- Currently banned: 1",
        "   |  `- Banned IP list: 192.168.152.122 (Kali-Security Linux Emulator)",
        "   `- Total banned: 1",
        "[FAIL2BAN] Status: ACTIVE. L'encombrement suspect de Kali Linux est actuellement endigué."
      ];
    } else if (normalizedInput.includes('iptables -L') || normalizedInput.includes('iptables')) {
      outputs = [
        "Chain INPUT (policy DROP 12 packets, 984 bytes)",
        " pkts bytes target     prot opt in     out     source               destination",
        "  484 35000 ACCEPT     tcp  --  *      *       192.168.152.0/24     0.0.0.0/0            tcp dpt:22 (Authorized Admin SSH Range)",
        " 1205 92400 ACCEPT     tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp dpt:443 (Gateway mTLS HTTPS)",
        "  405 25600 DROP       tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp dpt:8080 (Keycloak IDP Admin Panel - Internal Only)",
        "[OK] Pare-feu de périmètre IPTables verrouillé avec politique de sécurité Zero Trust."
      ];
    } else if (normalizedInput.includes('nmap')) {
      outputs = [
        "Starting Nmap 7.94 ( https://nmap.org ) at 2026-06-14 12:20 CEST",
        "Nmap scan report for zero-trust-server (192.168.152.131)",
        "Host is up (0.00042s latency).",
        "",
        "PORT     STATE    SERVICE",
        "443/tcp  open     https        (Nginx mTLS security gateway)",
        "8080/tcp filtered http-proxy   (Filtré / Rejeté par Pare-feu IPTables)",
        "",
        "Nmap done: 1 IP address (1 host up) scanned in 1.45 seconds.",
        "[INFO] Analyse structurelle de Kali achevée. Seul le port mTLS HTTPS est exposé."
      ];
    } else if (normalizedInput === 'curl -k https://192.168.152.131') {
      outputs = [
        "*   Trying 192.168.152.131:443...",
        "*   Connected to 192.168.152.131 (192.168.152.131) port 443",
        "*   ALPN: offers h2, http/1.1",
        "*   TLSv1.3 connection using TLS_AES_256_GCM_SHA384",
        "*   Server certificate: CN=Nexus Gateway",
        "*   Nginx requests Client TLS Certificate: none provided",
        "< HTTP/1.1 400 Bad Request",
        "< Server: nginx/1.29.8",
        "< Content-Type: text/html",
        "< Connection: close",
        "<",
        "<html>",
        "<head><title>400 No Required SSL Certificate Was Submitted</title></head>",
        "<body>",
        "<center><h1>400 Bad Request - mTLS clients only</h1></center>",
        "<center>L'accès à cette enclave sécurisée requiert un certificat mutuel valide.</center>",
        "</body>",
        "</html>"
      ];
    } else if (checkMatch(normalizedInput, 'client.crt') && normalizedInput.includes('curl')) {
      outputs = [
        "*   Trying 192.168.152.131:443...",
        "*   Connected to 192.168.152.131 (192.168.152.131) port 443",
        "*   TLSv1.3 connection using TLS_AES_256_GCM_SHA384",
        "*   Sending Client Certificate client.crt...",
        "*   SSL Certificate handshake successful (mTLS Authenticated)",
        "> GET / HTTP/1.1",
        "> Host: 192.168.152.131",
        "> User-Agent: curl/7.81.0",
        ">",
        "< HTTP/1.1 200 OK",
        "< Server: nginx/1.29.8 (Zero Trust Gateway Portal)",
        "< Content-Type: text/plain; charset=utf-8",
        "<",
        "[✔ SÉCURISÉ] Bienvenue sur le portail d'administration de l'enclave Nexus-Lab !",
        "Identité validée de la carte à puce : CN=Client_User, emailAddress=admin@nexus-lab.internal",
        "Autorité émettrice certifiée : CN=Nexus Root CA",
        "Statut de session : CHANNELS_STRESSED_ENCRYPTED_OK"
      ];
    } else if (normalizedInput.startsWith('ping')) {
      outputs = [
        "PING 192.168.152.131 (192.168.152.131) 56(84) bytes of data.",
        "64 bytes from 192.168.152.131: icmp_seq=1 ttl=64 time=0.035 ms",
        "64 bytes from 192.168.152.131: icmp_seq=2 ttl=64 time=0.028 ms",
        "64 bytes from 192.168.152.131: icmp_seq=3 ttl=64 time=0.031 ms",
        "",
        "--- 192.168.152.131 ping statistics ---",
        "3 packets transmitted, 3 received, 0% packet loss, time 2045ms",
        "rtt min/avg/max/mdev = 0.028/0.031/0.035/0.003 ms"
      ];
    } else if (normalizedInput === 'systemctl status fail2ban') {
      outputs = [
        "● fail2ban.service - LSB: Protective Intrusion Daemon",
        "     Loaded: loaded (/etc/init.d/fail2ban; active)",
        "     Active: active (running) since Sun 2026-06-14 10:15:32 CEST; 2h ago",
        "     Memory: 18.2M",
        "     CGroup: /system.slice/fail2ban.service",
        "             └─504 /usr/bin/python3 /usr/bin/fail2ban-server -xf start"
      ];
    } else if (normalizedInput === 'whoami') {
      outputs = ["zero-trust"];
    } else if (normalizedInput === 'clear') {
      setInteractiveHistory([]);
      setUserInput('');
      return;
    } else if (normalizedInput === 'demo') {
      setMode('demo');
      setIsPlaying(true);
      setActiveStep(0);
      return;
    } else {
      outputs = [
        `bash: commande introuvable: "${trimmed}"`,
        "Entrez \"help\" pour obtenir la liste des commandes réelles et simulées."
      ];
    }

    // Append output
    setInteractiveHistory(prev => [
      ...prev,
      ...outputs.map(outLine => ({ type: 'output' as const, text: outLine })),
      { type: 'output' as const, text: '' } // blank spacer
    ]);
    setUserInput('');

    // Native post scroll
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 40);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeInteractiveCommand(userInput);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistoryList.length > 0) {
        const nextIdx = historyIndex === -1 ? commandHistoryList.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(nextIdx);
        setUserInput(commandHistoryList[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const nextIdx = historyIndex + 1;
        if (nextIdx >= commandHistoryList.length) {
          setHistoryIndex(-1);
          setUserInput('');
        } else {
          setHistoryIndex(nextIdx);
          setUserInput(commandHistoryList[nextIdx]);
        }
      }
    }
  };

  // Keep terminal scrolled down on transitions
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [interactiveHistory, demoHistory, mode, typedCommand]);

  const toggleMode = (newMode: 'demo' | 'interactive') => {
    setMode(newMode);
    setProgress(0);
    if (newMode === 'interactive') {
      setIsPlaying(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setIsPlaying(true);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#090b0e] text-sm font-mono border border-white/10 rounded-3xl overflow-hidden relative shadow-2xl">
      {/* Dynamic Header Tab bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 bg-[#0e1117] border-b border-white/5 gap-3">
        <div className="flex items-center gap-2">
          {/* Virtual OS Dots */}
          <div className="flex gap-1.5 mr-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 block" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 block" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 block" />
          </div>
          <span className="text-[11px] text-white/50 tracking-wide font-bold flex items-center gap-1.5">
            <TermIcon size={13} className="text-nexus-blue animate-pulse" />
            <span>zero-trust@lab-virtuel: ~</span>
          </span>
        </div>

        {/* Toggle between interactive simulation or automatic tutorials */}
        <div className="flex items-center gap-1 bg-[#151a24] border border-white/10 p-0.5 rounded-xl shrink-0 self-start sm:self-auto">
          <button 
            onClick={() => toggleMode('interactive')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
              mode === 'interactive' 
                ? "bg-nexus-blue text-white shadow-[0_0_12px_rgba(14,165,233,0.35)]" 
                : "text-white/40 hover:text-white"
            }`}
          >
            <TerminalSquare size={12} /> Interactif en Direct
          </button>
          <button 
            onClick={() => toggleMode('demo')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
              mode === 'demo' 
                ? "bg-nexus-blue text-white shadow-[0_0_12px_rgba(14,165,233,0.35)]" 
                : "text-white/40 hover:text-white"
            }`}
          >
            <Activity size={12} /> Scénario Automatique
          </button>
        </div>

        {onClose && (
          <button 
            onClick={onClose} 
            className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg text-[10px] font-bold uppercase transition-all shrink-0 self-end sm:self-auto"
          >
            Fermer Terminal
          </button>
        )}
      </div>

      {/* Main Terminal Viewport Split */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 bg-[#05070a]">
        
        {/* Left Side Navigation Panel */}
        {mode === 'demo' ? (
          // Demo Step selection for Automated Scenario
          <div className="lg:w-64 border-b lg:border-b-0 lg:border-r border-white/5 bg-[#0b0e14] p-3 flex flex-row lg:flex-col gap-1.5 overflow-x-auto lg:overflow-y-auto scrollbar-none">
            <div className="hidden lg:block pb-2 px-1 border-b border-white/5 mb-1">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Guide Étape par Étape</span>
            </div>
            {steps.map((s, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setActiveStep(idx);
                  setProgress(0);
                }}
                className={`text-left px-3 py-2.5 rounded-xl text-xs transition-all flex flex-col gap-1 whitespace-nowrap min-w-[140px] lg:min-w-0 ${
                  activeStep === idx 
                    ? "bg-nexus-blue/20 border border-nexus-blue/30 text-white font-bold shadow-[0_0_12px_rgba(14,165,233,0.08)]" 
                    : "hover:bg-white/5 border border-transparent text-white/40 hover:text-white"
                }`}
              >
                <span className="truncate">{s.title}</span>
                <span className="text-[9px] font-mono font-normal opacity-50 block truncate">
                  {s.command.slice(0, 26)}{s.command.length > 26 ? '...' : ''}
                </span>
              </button>
            ))}
          </div>
        ) : (
          // Quick actions panel for Interactive Mode
          <div className="lg:w-64 border-b lg:border-b-0 lg:border-r border-white/5 bg-[#0b0e14] p-3 flex flex-row lg:flex-col gap-1.5 overflow-x-auto lg:overflow-y-auto scrollbar-none">
            <div className="hidden lg:block pb-2 px-1 border-b border-white/5 mb-1">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Raccourcis de Test</span>
            </div>
            {INTERACTIVE_SHORTCUTS.map((shortcut, idx) => (
              <button
                key={idx}
                onClick={() => executeInteractiveCommand(shortcut.cmd)}
                className="text-left px-3 py-2 bg-neutral-900 hover:bg-nexus-blue/10 border border-white/5 hover:border-nexus-blue/20 text-white/70 hover:text-white rounded-xl text-xs transition-all flex items-center gap-2 shrink-0 lg:shrink whitespace-nowrap min-w-[140px] lg:min-w-0"
              >
                <Sparkles size={11} className="text-nexus-blue shrink-0" />
                <span className="truncate">{shortcut.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Console Screen and command lines */}
        <div className="flex-1 flex flex-col min-h-0 relative">
          
          {/* Sub Tab switcher for text console vs interactive image diagram ("affichage en image") */}
          <div className="flex bg-[#0d1016] border-b border-white/5 py-2.5 px-4 justify-between items-center z-10 shrink-0">
            <div className="flex gap-2.5">
              <button
                onClick={() => setViewMode('console')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
                  viewMode === 'console'
                    ? "bg-[#161c28] text-[#00ffcc] border border-[#00ffcc]/20 shadow-[0_0_10px_rgba(0,255,204,0.1)]"
                    : "text-white/40 hover:text-white"
                )}
              >
                <TermIcon size={12} /> Console texte
              </button>
              <button
                onClick={() => setViewMode('diagram')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
                  viewMode === 'diagram'
                    ? "bg-[#161c28] text-[#00ffcc] border border-[#00ffcc]/20 shadow-[0_0_10px_rgba(0,255,204,0.1)]"
                    : "text-white/40 hover:text-white"
                )}
              >
                <Layers size={12} /> Schéma Réseau (Image)
              </button>
            </div>
            <div className="text-[9px] font-mono tracking-widest text-[#0ea5e9]/70 font-bold uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0ea5e9] animate-pulse" />
              <span>SUPERVISION ARCHITECTURE</span>
            </div>
          </div>

          {viewMode === 'diagram' ? (
            /* =========================================================
               VISUAL TERMINAL DIAGRAM / ARCHITECTURE OVERVIEW ("affichage en image")
               ========================================================= */
            <div className="flex-1 p-5 overflow-y-auto space-y-5 select-none bg-[#030508] custom-scrollbar">
              {/* Diagram header / explanation */}
              <div className="bg-[#0c0f14]/90 p-4 border border-white/5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <Layers size={13} className="text-nexus-blue animate-pulse" />
                    Cartes &amp; Flux d'Architecture Zero Trust
                  </h4>
                  <p className="text-[10px] text-white/40 max-w-xl mt-1 leading-normal">
                    Exécutez de vraies simulations de paquets à l'aide des boutons ci-contre pour visualiser l'action immédiate des barrières mTLS et du Firewall.
                  </p>
                </div>
                
                {/* Simulation triggers directly on the board */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => runVisualSimulation('attack')}
                    disabled={simulationState !== 'idle'}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border shrink-0 flex items-center gap-1.5",
                      simulationState === 'attack'
                        ? "bg-red-950/20 text-red-400 border-red-500/30 animate-pulse"
                        : "bg-red-900/10 hover:bg-red-900/20 text-red-500 border-red-900/20 active:scale-95 disabled:opacity-30 cursor-pointer"
                    )}
                  >
                    <Flame size={12} /> Attaque brute-force SSH
                  </button>
                  <button
                    onClick={() => runVisualSimulation('curl_direct')}
                    disabled={simulationState !== 'idle'}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border shrink-0 flex items-center gap-1.5",
                      simulationState === 'curl_direct'
                        ? "bg-yellow-950/20 text-yellow-400 border-yellow-500/30 animate-pulse"
                        : "bg-yellow-900/10 hover:bg-yellow-900/20 text-yellow-500 border-yellow-900/20 active:scale-95 disabled:opacity-30 cursor-pointer"
                    )}
                  >
                    <Lock size={12} /> HTTPS sans Certificat
                  </button>
                  <button
                    onClick={() => runVisualSimulation('curl_mtls')}
                    disabled={simulationState !== 'idle'}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border shrink-0 flex items-center gap-1.5",
                      simulationState === 'curl_mtls'
                        ? "bg-emerald-950/20 text-emerald-400 border-emerald-500/30 animate-pulse"
                        : "bg-emerald-900/10 hover:bg-emerald-900/20 text-emerald-400 border-emerald-900/20 active:scale-95 disabled:opacity-30 cursor-pointer"
                    )}
                  >
                    <Unlock size={12} /> Accès mutuel mTLS
                  </button>
                </div>
              </div>

              {/* Live Status indicator */}
              <div className="bg-[#070b11] border border-white/5 rounded-2xl p-3 flex flex-wrap items-center justify-between text-[11px] font-mono gap-2">
                <div className="flex items-center gap-2">
                  <Activity size={13} className="text-[#00ffcc] animate-pulse shrink-0" />
                  <span className="text-white/40 uppercase text-[9px] font-bold tracking-wider">État Réseau :</span>
                  <span className={cn(
                    "font-bold uppercase tracking-wide",
                    simulationState === 'attack' && "text-red-400",
                    simulationState === 'curl_direct' && "text-yellow-400",
                    simulationState === 'curl_mtls' && "text-emerald-400",
                    simulationState === 'idle' && "text-[#00ffcc]"
                  )}>
                    {simLog}
                  </span>
                </div>
                <div className="text-[9px] text-white/30 font-bold uppercase tracking-widest">
                  ROUTAGE: docker zt-private
                </div>
              </div>

              {/* Architecture Grid representation */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative min-h-[300px] select-none">
                
                {/* SVG Visual Lines overlays connecting nodes */}
                <div className="absolute inset-x-0 top-[120px] bottom-0 pointer-events-none z-0 hidden md:block select-none opacity-40">
                  <svg className="w-full h-24" viewBox="0 0 800 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Path 1: Top External to Middle */}
                    <path d="M 150 20 H 380" stroke="rgba(255,255,255,0.08)" strokeWidth="2" strokeDasharray="6 6" />
                    {/* Path 2: Bottom Trusted to Middle */}
                    <path d="M 150 80 H 380" stroke="rgba(255,255,255,0.08)" strokeWidth="2" strokeDasharray="6 6" />
                    {/* Path 3: Middle to Right Enclaves */}
                    <path d="M 420 50 H 650" stroke="rgba(255,255,255,0.08)" strokeWidth="2" strokeDasharray="6 6" />

                    {/* Animated laser streams based on active simulation */}
                    {simulationState === 'attack' && (
                      <path d="M 150 20 H 380" stroke="#f87171" strokeWidth="3" strokeDasharray="6 6" strokeDashoffset="0">
                        <animate attributeName="stroke-dashoffset" values="40;0" dur="1s" repeatCount="indefinite" />
                      </path>
                    )}
                    {simulationState === 'curl_direct' && (
                      <path d="M 150 80 H 380" stroke="#fbbf24" strokeWidth="3" strokeDasharray="6 6" strokeDashoffset="0">
                        <animate attributeName="stroke-dashoffset" values="40;0" dur="1.2s" repeatCount="indefinite" />
                      </path>
                    )}
                    {simulationState === 'curl_mtls' && (
                      <>
                        <path d="M 150 80 H 380" stroke="#10b981" strokeWidth="3" strokeDasharray="6 6" strokeDashoffset="0">
                          <animate attributeName="stroke-dashoffset" values="40;0" dur="0.8s" repeatCount="indefinite" />
                        </path>
                        <path d="M 420 50 H 650" stroke="#10b981" strokeWidth="3" strokeDasharray="6 6" strokeDashoffset="0">
                          <animate attributeName="stroke-dashoffset" values="40;0" dur="0.8s" repeatCount="indefinite" />
                        </path>
                      </>
                    )}
                  </svg>
                </div>

                {/* Col 1: CLIENT EXTERNE / ATTAQUANT */}
                <div className="flex flex-col gap-4 justify-center z-10">
                  <div className="px-1">
                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block">Zone Extérieure (Internet)</span>
                  </div>

                  {/* Node A1: Attaquant Kali Linux */}
                  <div className={cn(
                    "bg-[#090b0f] border rounded-2xl p-4 transition-all duration-300 relative",
                    simulationState === 'attack' 
                      ? "border-red-500 bg-red-950/5 shadow-[0_0_20px_rgba(239,68,68,0.15)] ring-1 ring-red-500/20" 
                      : "border-white/5"
                  )}>
                    <div className="absolute top-3 right-3 text-[8px] font-mono tracking-widest uppercase py-0.5 px-2 rounded-md font-black bg-red-950/40 text-red-400 border border-red-900/30">
                      {simulationState === 'attack' ? "ACTIVE_ATTACK" : "KALI_VM"}
                    </div>

                    <div className="flex gap-3 items-start">
                      <div className="w-10 h-10 rounded-xl bg-red-950/10 border border-red-900/20 flex items-center justify-center shrink-0">
                        <ShieldAlert size={18} className={cn("text-red-400", simulationState === 'attack' && "animate-bounce")} />
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-extrabold text-xs text-white uppercase tracking-wider">
                          Kali Linux Host
                        </h5>
                        <p className="text-[9px] text-white/40 font-mono mt-0.5">IP: 192.168.152.122</p>
                        <p className="text-[10px] text-white/30 font-mono mt-1 leading-relaxed">
                          Émulateur offensif infiltré (Nmap TCP scanner &amp; Hydra brute-forcer).
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Node A2: Client de confiance certifié mTLS */}
                  <div className={cn(
                    "bg-[#090b0f] border rounded-2xl p-4 transition-all duration-300 relative",
                    simulationState === 'curl_mtls'
                      ? "border-emerald-500 bg-emerald-950/5 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/20"
                      : "border-white/5"
                  )}>
                    <div className={cn(
                      "absolute top-3 right-3 text-[8px] font-mono tracking-widest uppercase py-0.5 px-2 rounded-md font-black border",
                      simulationState === 'curl_mtls'
                        ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/30"
                        : "bg-white/5 text-white/40 border-white/5"
                    )}>
                      {simulationState === 'curl_mtls' ? "TLS_SECURE" : "UNSECURED"}
                    </div>

                    <div className="flex gap-3 items-start">
                      <div className="w-10 h-10 rounded-xl bg-emerald-950/10 border border-emerald-900/20 flex items-center justify-center shrink-0">
                        <Fingerprint size={18} className={cn(
                          "text-emerald-400",
                          simulationState === 'curl_mtls' && "animate-pulse"
                        )} />
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-extrabold text-xs text-white uppercase tracking-wider">
                          Admin Client
                        </h5>
                        <p className="text-[9px] text-white/40 font-mono mt-0.5">IP: 192.168.152.1</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          <span className="text-[9.5px] font-mono font-bold bg-[#111] border border-white/10 text-white/60 px-1 py-0.5 rounded flex items-center gap-1">
                            <Key size={9} className="text-emerald-400" /> client.crt
                          </span>
                          <span className="text-[9.5px] font-mono font-bold bg-[#111] border border-white/10 text-white/60 px-1 py-0.5 rounded flex items-center gap-1">
                            <Key size={9} className="text-emerald-400" /> client.key
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Col 2: MIDDLE SECURITY GATEWAY & FIREWALLS */}
                <div className="flex flex-col gap-4 justify-center z-10">
                  <div className="px-1">
                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block">Barrière d'Accès (Passerelle Edge)</span>
                  </div>

                  {/* Node B1: Firewall Sentinel Layer */}
                  <div className={cn(
                    "bg-[#090b0f] border rounded-2xl p-4 transition-all duration-300 relative",
                    simulationState === 'attack' 
                      ? "border-red-500 bg-red-950/5 shadow-[0_0_15px_rgba(239,68,68,0.15)]" 
                      : "border-white/5"
                  )}>
                    <div className="flex gap-3 items-center">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                        simulationState === 'attack'
                          ? "bg-red-950/40 border-red-500/40 text-red-400 animate-pulse"
                          : "bg-[#111] border-white/5 text-white/40"
                      )}>
                        <Flame size={18} />
                      </div>
                      <div>
                        <h5 className="font-extrabold text-xs text-white uppercase tracking-wider">
                          Firewall Sentinel
                        </h5>
                        <p className="text-[9px] text-white/40 font-mono mt-0.5">Fail2Ban + IPTables</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          <span className={cn(
                            "text-[9px] font-mono font-black px-1.5 rounded border py-0.5",
                            simulationState === 'attack'
                              ? "bg-red-950 text-red-400 border-red-500/30"
                              : "bg-[#111] text-white/40 border-white/10"
                          )}>
                            Fail2Ban : {simulationState === 'attack' ? "IP BAN_ON" : "LISTEN"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Node B2: Nginx mTLS Gateway */}
                  <div className={cn(
                    "bg-[#090b0f] border rounded-2xl p-4 transition-all duration-300 relative",
                    simulationState === 'curl_mtls'
                      ? "border-emerald-500 bg-emerald-950/5 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                      : simulationState === 'curl_direct'
                      ? "border-yellow-500 bg-yellow-950/5 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                      : "border-white/5"
                  )}>
                    <div className="absolute top-3 right-3 flex gap-1">
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        simulationState === 'curl_mtls' ? "bg-emerald-400 animate-ping" : "bg-emerald-500/30"
                      )} />
                      <span className="w-2 h-2 rounded-full bg-[#0ea5e9]/70" />
                    </div>

                    <div className="flex gap-3 items-start">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                        simulationState === 'curl_mtls'
                          ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-400"
                          : simulationState === 'curl_direct'
                          ? "bg-yellow-950/30 border-yellow-500/40 text-yellow-500"
                          : "bg-blue-950/10 border-blue-900/20 text-blue-400"
                      )}>
                        {simulationState === 'curl_mtls' ? <Unlock size={18} /> : <Lock size={18} />}
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-extrabold text-xs text-white uppercase tracking-wider">
                          Nginx Secure Gateway
                        </h5>
                        <p className="text-[9px] text-white/40 font-mono mt-0.5">Port d'entrée : 443 HTTPS</p>
                        <p className="text-[10px] text-white/30 font-mono mt-1.5 leading-relaxed">
                          {simulationState === 'curl_direct' 
                            ? "REJET : Pas de certificat TLS client. Certificat requis."
                            : simulationState === 'curl_mtls'
                            ? "AUTORISÉ : Certificat signé par Nexus Root CA"
                            : "Vérifie bilatéralement les connexions d'administration."
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Col 3: PRIVATE INTRALAN ENCLAVE */}
                <div className="flex flex-col gap-4 justify-center z-10">
                  <div className="px-1">
                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block">Enclave Docker Interne (zt-private)</span>
                  </div>

                  {/* Node C1: Vaultwarden Server */}
                  <div className={cn(
                    "bg-[#090b0f] border rounded-2xl p-4 transition-all duration-300 relative",
                    simulationState === 'curl_mtls'
                      ? "border-emerald-500 bg-emerald-950/5 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                      : "border-white/5"
                  )}>
                    <div className="flex gap-3 items-start">
                      <div className="w-10 h-10 rounded-xl bg-blue-950/10 border border-blue-900/20 flex items-center justify-center shrink-0">
                        <Server size={18} className="text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-extrabold text-xs text-white uppercase tracking-wider">
                          Vaultwarden Container
                        </h5>
                        <p className="text-[9px] text-white/40 font-mono mt-0.5">Port d'écoute: 80 (Interne)</p>
                        <p className="text-[10px] text-white/30 font-mono mt-1.5 leading-relaxed">
                          Stockage et gestionnaire de secrets sécurisé local. Accès via passerelle de confiance.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Node C2: Keycloak Identity / MFA */}
                  <div className={cn(
                    "bg-[#090b0f] border rounded-2xl p-4 transition-all duration-300 relative",
                    simulationState === 'curl_mtls'
                      ? "border-emerald-500 bg-emerald-950/5 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                      : "border-white/5"
                  )}>
                    <div className="flex gap-3 items-start">
                      <div className="w-10 h-10 rounded-xl bg-purple-950/10 border border-purple-900/20 flex items-center justify-center shrink-0">
                        <Cpu size={18} className="text-purple-400" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-extrabold text-xs text-white uppercase tracking-wider">
                          Keycloak SSO &amp; MFA
                        </h5>
                        <p className="text-[9px] text-white/40 font-mono mt-0.5">Port d'écoute: 8080 (Filtré)</p>
                        <p className="text-[10px] text-white/30 font-mono mt-1.5 leading-relaxed">
                          Gestionnaire d'identité et de double authentification MFA TOTP. Port bridé extérieurement par IPTables.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Deep visual architecture description */}
              <div className="bg-[#0b0d12] border border-white/5 p-4 rounded-2xl flex items-start gap-3 select-text">
                <HelpCircle size={15} className="text-nexus-blue shrink-0 mt-0.5" />
                <div className="text-[10.5px] text-white/50 leading-relaxed">
                  <strong>Pédagogie de la sécurité mutuelle (mTLS) :</strong> 
                  <p className="mt-1">
                    Dans une architecture Zero Trust standard, on ne présume plus qu'un client qui se connecte depuis l'intérieur du réseau est fiable. Chaque élément requiert une vérification stricte à double sens. 
                    Ici, lorsque vous lancez l'accès en mTLS, la passerelle réciproque <span className="text-white">Nginx</span> compare cryptographiquement la signature du certificat client fourni (<span className="text-white">client.crt</span>) à sa propre liste CA racine de confiance. Sans certificat, ou si l'IP tente un piratage (ex. Hydra), les filtres kernel <span className="text-white">Fail2Ban</span> et <span className="text-white">IPTables</span> verrouillent immédiatement la route !
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* =========================================================
               STANDARD CONSOLE LINES DISPLAY SCREEN
               ========================================================= */
            <div 
              ref={scrollRef} 
              className="flex-1 p-5 overflow-y-auto space-y-2 select-text scrollbar-thin scrollbar-thumb-white/10"
              onClick={() => {
                if (mode === 'interactive') {
                  inputRef.current?.focus();
                }
              }}
            >
              {mode === 'demo' ? (
                // Automatic Scenarios layout
                <div className="space-y-2 animate-fade-in">
                  <div className="flex items-center text-green-400 font-bold gap-1 text-xs">
                    <span>zero-trust@lab-virtuel:~$</span>
                    <span className="text-white font-mono">{typedCommand}</span>
                    <motion.span 
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
                      className="inline-block w-1.5 h-3.5 bg-white ml-0.5"
                    />
                  </div>

                  <div className="space-y-1 text-white/80 leading-relaxed text-xs font-mono pt-3 border-t border-white/5">
                    {demoHistory.map((line, idx) => {
                      const isError = line.toLowerCase().includes("denied") || line.toLowerCase().includes("bad request");
                      const isSuccess = line.toLowerCase().includes("autorisé") || line.toLowerCase().includes("successfully") || line.includes("✔") || line.toLowerCase().includes("succès");
                      
                      let colorClass = "text-white/60";
                      if (isError) colorClass = "text-red-400 font-bold bg-red-950/20 px-1.5 py-0.5 rounded";
                      else if (isSuccess) colorClass = "text-green-400 font-bold bg-green-950/20 px-1.5 py-0.5 rounded";
                      else if (line.startsWith("[INFO]") || line.startsWith("*")) colorClass = "text-nexus-blue/80";

                      return (
                        <div key={idx} className={`${colorClass} whitespace-pre-wrap font-mono`}>
                          {line}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                // Interactive Real Terminal Layout
                <div className="space-y-1 text-xs font-mono select-text transition-all">
                  {interactiveHistory.map((item, idx) => {
                    if (item.type === 'input') {
                      return (
                        <div key={idx} className="flex items-center text-green-400 font-bold pt-1.5 gap-1.5">
                          <span>zero-trust@lab-virtuel:~$</span>
                          <span className="text-white font-mono">{item.text}</span>
                        </div>
                      );
                    }

                    // Customize output log color dynamically
                    const line = item.text;
                    const isError = line.toLowerCase().includes("bad request") || line.toLowerCase().includes("erreur") || line.toLowerCase().includes("refus") || line.toLowerCase().includes("banni") || line.includes("DROP");
                    const isSuccess = line.toLowerCase().includes("autoris") || line.toLowerCase().includes("successfully") || line.includes("✔") || line.toLowerCase().includes("succès") || line.includes("ACCEPT");
                    
                    let colorClass = "text-white/60";
                    if (isError) colorClass = "text-red-400/90 font-bold bg-red-950/15 px-1.5 py-0.5 rounded inline-block whitespace-pre-wrap";
                    else if (isSuccess) colorClass = "text-green-400 font-bold bg-green-950/15 px-1.5 py-0.5 rounded inline-block whitespace-pre-wrap";
                    else if (line.startsWith("==")) colorClass = "text-[#00ffcc] font-black";
                    else if (line.startsWith("cat: ") || line.startsWith("bash: ")) colorClass = "text-yellow-400 font-bold";

                    return (
                      <div key={idx} className={`${colorClass} whitespace-pre-wrap leading-relaxed font-mono`}>
                        {line}
                      </div>
                    );
                  })}

                  {/* Prompt command line */}
                  <div className="flex items-center text-green-400 font-bold pt-2 gap-1.5">
                    <span className="shrink-0 select-none">zero-trust@lab-virtuel:~$</span>
                    <div className="flex-1 relative flex items-center">
                      <input 
                        ref={inputRef}
                        type="text"
                        className="w-full bg-transparent text-white outline-none font-mono font-normal caret-transparent select-text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        maxLength={120}
                        autoFocus
                        placeholder="Tapez help..."
                      />
                      {/* Blink caret */}
                      <motion.div 
                        className="absolute bg-white/90 h-3.5 w-1.5 pointer-events-none"
                        style={{
                          left: `${userInput.length * 7.2}px`,
                        }}
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick interactive search prompt helpful tips overlay */}
          {mode === 'interactive' && viewMode === 'console' && userInput.length === 0 && (
            <div className="absolute right-6 bottom-16 pointer-events-none hidden lg:block bg-black/40 border border-white/5 p-3 rounded-2xl max-w-sm backdrop-blur-md">
              <div className="flex gap-2 items-center text-white/40 text-[10px] font-black uppercase tracking-wider mb-1">
                <HelpCircle size={10} /> astuce interactive
              </div>
              <p className="text-[10px] text-white/50 leading-relaxed">
                Appuyez sur <span className="font-bold text-nexus-blue">Entrée</span> pour lancer l'exécution ou utilisez les flèches <span className="text-white">↑ ↓</span> pour naviguer dans l'historique de vos commandes saisies.
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Footer Controls segment */}
      <div className="px-5 py-4 bg-[#0c0f14] border-t border-white/5 flex flex-col md:flex-row items-center justify-between text-xs text-white/40 gap-4">
        
        {/* Play/pause for automatic scenario */}
        <div className="flex items-center gap-3">
          {mode === 'demo' ? (
            <>
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2.5 bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white rounded-xl flex items-center justify-center"
                title={isPlaying ? "Mettre en pause la démo" : "Lancer le scénario de démo"}
              >
                {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
              </button>
              <button 
                onClick={() => {
                  setProgress(0);
                  const step = activeStep;
                  setActiveStep(step);
                }}
                className="p-2.5 bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white rounded-xl flex items-center justify-center"
                title="Relancer cette étape"
              >
                <RotateCcw size={14} />
              </button>
              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-[10px] text-nexus-blue font-black tracking-widest">DÉMO TUTO</span>
                <span className="opacity-20">|</span>
                <span className="text-[10px]">Étape {activeStep + 1}/{steps.length}</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-green-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#00ffcc]">
                Lab Virtuel Actif
              </span>
              <span className="opacity-20">•</span>
              <span className="text-[10px] text-white/50">
                Mode libre compatible mTLS
              </span>
            </div>
          )}
        </div>

        {/* Mini progress line for scenario */}
        {mode === 'demo' ? (
          <div className="flex-1 max-w-xs mx-4 h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-nexus-blue transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        ) : (
          <div className="flex-1 max-w-sm hidden md:flex items-center gap-3 justify-end text-[10px] font-mono text-white/30">
            <Clock size={12} />
            <span>LAST HANDSHAKE: SUCCESS (UTC-06:00)</span>
          </div>
        )}

        {/* Step Prev/Next list navigation buttons */}
        <div className="flex gap-2 self-stretch sm:self-auto justify-end">
          {mode === 'demo' ? (
            <>
              <button 
                disabled={activeStep === 0}
                onClick={() => {
                  setActiveStep(prev => prev - 1);
                  setProgress(0);
                }}
                className="px-3 py-2 text-[10px] font-bold bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-xl transition-all"
              >
                PRÉCÉDENT
              </button>
              <button 
                disabled={activeStep === steps.length - 1}
                onClick={() => {
                  setActiveStep(prev => prev + 1);
                  setProgress(0);
                }}
                className="px-3 py-2 text-[10px] font-bold bg-nexus-blue hover:bg-nexus-blue/80 disabled:opacity-30 rounded-xl text-white transition-all shadow-[0_0_12px_rgba(14,165,233,0.25)]"
              >
                SUIVANT
              </button>
            </>
          ) : (
            <button 
              onClick={() => {
                setInteractiveHistory([
                  { type: 'output', text: '============================================================' },
                  { type: 'output', text: '   NEXUS LABS : CONSOLE RE-INITIALISÉE                      ' },
                  { type: 'output', text: '============================================================' },
                ]);
                setUserInput('');
              }}
              className="px-3 py-2 text-[10px] font-bold bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all flex items-center gap-1.5"
            >
              <RefreshCw size={11} /> RÉINITIALISER L'ÉCRAN
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
