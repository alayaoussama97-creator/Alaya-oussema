from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import numpy as np
from sklearn.ensemble import IsolationForest, RandomForestClassifier
import joblib
import time
from typing import List, Optional

app = FastAPI(title="Nexus AI Security Engine")

# --- Modèles (Initialisation simplifiée pour la démo) ---
# En production, ces modèles seraient chargés via joblib.load('model.pkl')
# Isolation Forest pour UEBA (Anomalies)
if_model = IsolationForest(contamination=0.05, random_state=42)
# Les caractéristiques : [heure_norm, geo_risk, frequency, device_trust_score]
# On simule un entraînement sur un comportement normal (ex: bureau 9h-18h)
normal_data = np.random.normal(loc=[14, 0.1, 1, 0.9], scale=[2, 0.05, 0.5, 0.05], size=(100, 4))
if_model.fit(normal_data)

# Random Forest pour Attaques Connues
# Caractéristiques : [failed_attempts, ports_scanned, mtls_fail, rapid_requests]
rf_model = RandomForestClassifier(n_estimators=100)
# Training data simple (0: Normal, 1: BruteForce, 2: Scan)
X_train = [
    [0, 0, 0, 10], [1, 0, 0, 15], # Normal
    [10, 0, 1, 100], [20, 0, 1, 200], # Brute Force
    [0, 50, 0, 300], [0, 100, 0, 500]  # Network Scan
]
y_train = [0, 0, 1, 1, 2, 2]
rf_model.fit(X_train, y_train)

class SecurityEvent(BaseModel):
    user_id: str
    hour: float # 0-24
    geo_risk: float # 0-1
    frequency: float # requetes/min
    device_trust: float # 0-1
    failed_logins: int
    ports_scanned: int
    mtls_fail: int

@app.post("/analyze")
async def analyze_event(event: SecurityEvent):
    # 1. UEBA Anomalie Detection
    # On normalise l'heure (sin(2*pi*h/24)) pour la circularité ou juste h
    features_ueba = np.array([[event.hour, event.geo_risk, event.frequency, event.device_trust]])
    anomaly_score = if_model.decision_function(features_ueba)[0]
    is_anomaly = if_model.predict(features_ueba)[0] == -1
    
    # Normalisation du score d'anomalie 0->1 (0: normal, 1: très anormal)
    # IsolationForest decision_function est < 0 pour les anomalies
    norm_anomaly = float(np.clip(0.5 - anomaly_score, 0, 1))

    # 2. Attack Classification
    features_attack = np.array([[event.failed_logins, event.ports_scanned, event.mtls_fail, event.frequency]])
    attack_type_id = int(rf_model.predict(features_attack)[0])
    attack_probs = rf_model.predict_proba(features_attack)[0]
    attack_confidence = float(np.max(attack_probs))
    
    attack_types = {0: "NORMAL", 1: "BRUTE_FORCE", 2: "SCAN"}
    attack_label = attack_types.get(attack_type_id, "UNKNOWN")

    # 3. Global Risk Scoring
    # risk_score = (anomaly_score * 0.4) + (failed_logins/10 * 0.3) + (geo_risk * 0.3)
    base_risk = (norm_anomaly * 40) + (event.geo_risk * 30)
    if attack_label != "NORMAL":
        base_risk += (attack_confidence * 30)
    if event.failed_logins > 5:
        base_risk += 20
    
    risk_score = min(100, max(0, base_risk))

    # 4. Automated Response Recommendation
    action = "NONE"
    if risk_score > 80:
        action = "BLOCK_REVOKE"
    elif risk_score > 60:
        action = "FORCE_MFA"
    elif risk_score > 40:
        action = "ALERT_SOC"

    return {
        "user_id": event.user_id,
        "risk_score": round(risk_score, 2),
        "anomaly_detected": is_anomaly,
        "attack_type": attack_label,
        "confidence": round(attack_confidence, 2),
        "recommended_action": action,
        "timestamp": time.time()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
