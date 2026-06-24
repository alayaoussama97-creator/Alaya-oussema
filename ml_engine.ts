import * as tf from '@tensorflow/tfjs';

export const AttackType = {
    NORMAL: 0,
    BRUTE_FORCE: 1,
    NETWORK_SCAN: 2,
    MALWARE: 3
} as const;

export class MLEngine {
    private anomalyModel: tf.Sequential | null = null;
    private classifierModel: tf.Sequential | null = null;
    private isInitialized = false;

    constructor() {}

    async init() {
        if (this.isInitialized) return;

        // 1. Create and Train Anomaly Detector (Autoencoder)
        // Features: [hour_normalized, geo_risk, frequency, device_trust]
        this.anomalyModel = tf.sequential();
        this.anomalyModel.add(tf.layers.dense({ units: 2, activation: 'relu', inputShape: [4] }));
        this.anomalyModel.add(tf.layers.dense({ units: 4, activation: 'sigmoid' }));
        this.anomalyModel.compile({ optimizer: 'adam', loss: 'meanSquaredError' });

        // Generate synthetic "normal" data
        const normalData = tf.randomNormal([100, 4], 0.1, 0.05); // low geo risk, high trust, etc.
        await this.anomalyModel.fit(normalData, normalData, { epochs: 20, verbose: 0 });

        // 2. Create and Train Attack Classifier
        // Features: [failed_logins, ports_scanned, mtls_fail, rapid_requests]
        this.classifierModel = tf.sequential();
        this.classifierModel.add(tf.layers.dense({ units: 8, activation: 'relu', inputShape: [4] }));
        this.classifierModel.add(tf.layers.dense({ units: 4, activation: 'softmax' })); // 4 types
        this.classifierModel.compile({ optimizer: 'adam', loss: 'categoricalCrossentropy', metrics: ['accuracy'] });

        // Training data
        // Normal: [0, 0, 0, 10]
        // Brute: [10, 0, 1, 100]
        // Scan: [0, 50, 0, 300]
        const xTrain = tf.tensor2d([
            [0, 0, 0, 10], [1, 1, 0, 15],       // NORMAL
            [10, 0, 1, 100], [20, 2, 1, 250],   // BRUTE FORCE
            [0, 50, 0, 300], [0, 100, 0, 600],  // SCAN
            [5, 10, 1, 500], [2, 5, 1, 400]     // MALWARE
        ]);
        const yTrain = tf.tensor2d([
            [1, 0, 0, 0], [1, 0, 0, 0], // NORMAL
            [0, 1, 0, 0], [0, 1, 0, 0], // BRUTE
            [0, 0, 1, 0], [0, 0, 1, 0], // SCAN
            [0, 0, 0, 1], [0, 0, 0, 1]  // MALWARE
        ]);

        await this.classifierModel.fit(xTrain, yTrain, { epochs: 30, verbose: 0 });

        this.isInitialized = true;
        console.log('Nexus ML Engine: Models trained and loaded successfully.');
    }

    async analyze(event: any) {
        if (!this.isInitialized) await this.init();

        // 1. Anomaly Check
        const uebaFeatures = tf.tensor2d([[
            event.hour / 24, 
            event.geoRisk || 0, 
            (event.frequency || 0) / 100, 
            event.deviceTrust || 1
        ]]);
        const recon = this.anomalyModel!.predict(uebaFeatures) as tf.Tensor;
        const error = tf.losses.meanSquaredError(uebaFeatures, recon).dataSync()[0];
        
        // 2. Attack Label
        const attackFeatures = tf.tensor2d([[
            event.failedLogins || 0,
            event.portsScanned || 0,
            event.mtlsFail || 0,
            event.rapidRequests || 0
        ]]);
        const prediction = this.classifierModel!.predict(attackFeatures) as tf.Tensor;
        const probabilities = await prediction.data();
        const attackTypeId = probabilities.indexOf(Math.max(...probabilities));
        const confidence = probabilities[attackTypeId];

        const attackLabels = ['NORMAL', 'BRUTE_FORCE', 'SCAN', 'MALWARE'];
        const label = attackLabels[attackTypeId];

        // 3. Risk Calculation
        let riskScore = error * 500; // autoencoder error scaling
        if (label !== 'NORMAL') riskScore += (confidence * 50);
        if (event.failedLogins > 5) riskScore += 20;

        return {
            riskScore: Math.min(100, Math.max(0, Math.floor(riskScore))),
            label: label,
            confidence: confidence,
            isAnomaly: error > 0.05,
            error: error
        };
    }
}

export const mlEngine = new MLEngine();
