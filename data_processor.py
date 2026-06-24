import time
import random
import requests
import json

# Simulation d'un processeur de données qui ingère les logs et les envoie à l'IA
def process_logs(log_entry):
    """
    Transforme un log brut en caractéristiques pour l'IA
    """
    # Feature Engineering simplifié
    features = {
        "user_id": log_entry.get("user", "anonymous"),
        "hour": time.localtime().tm_hour,
        "geo_risk": 0.8 if log_entry.get("ip_country") != "FR" else 0.1,
        "frequency": log_entry.get("req_count", 1) / 60,
        "device_trust": 0.9 if log_entry.get("cert_valid") else 0.2,
        "failed_logins": log_entry.get("failed_attempts", 0),
        "ports_scanned": log_entry.get("scanned_ports", 0),
        "mtls_fail": 1 if not log_entry.get("cert_valid") else 0
    }
    return features

def main():
    print("Nexus Data Processor started (Pipeline simulation)...")
    AI_ENGINE_URL = "http://localhost:8000/analyze"
    
    while True:
        # Simulation d'arrivée de logs
        log_type = random.choice(["WEB", "AUTH", "AUTH", "NETWORK"])
        
        if log_type == "AUTH":
            log = {"user": "admin", "failed_attempts": random.randint(0, 7), "cert_valid": True}
        elif log_type == "NETWORK":
            log = {"user": "sys_auto", "scanned_ports": random.choice([0, 0, 150]), "ip_country": "UNKNOWN"}
        else:
            log = {"user": "user_01", "req_count": random.randint(10, 100), "ip_country": "FR", "cert_valid": True}
            
        features = process_logs(log)
        
        try:
            # Envoi au moteur d'IA
            # response = requests.post(AI_ENGINE_URL, json=features)
            # data = response.json()
            # print(f"[{log_type}] Risk Score identified: {data['risk_score']} - Action: {data['recommended_action']}")
            print(f"[{log_type}] Log processed for {features['user_id']} (Risk simulation active)")
        except Exception as e:
            print(f"AI Engine unreachable (expected if docker not up): {e}")
            
        time.sleep(5)

if __name__ == "__main__":
    main()
