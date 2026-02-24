const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const Jimp = require('jimp');

exports.analyzeReport = async (req, res) => {
    try {
        const diagnosticData = req.body;
        const filePath = req.file ? req.file.path : null;

        // Path to python script
        const scriptPath = path.join(__dirname, '../ml_models/predict.py');
        const pythonExecutable = process.env.PYTHON_PATH || 'python';

        // Add some defaults for report analysis if not provided
        const inputData = {
            Symptoms: diagnosticData.symptoms || "",
            Age: diagnosticData.age || 30, // Default or fetch from user profile
            Gender: diagnosticData.gender || "Other",
            "Sputum Smear Test": diagnosticData.sputum_smear || "Negative",
            "Diabetes": diagnosticData.diabetes || "No",
            "HIV": diagnosticData.hiv || "No",
            "Smoking Status": diagnosticData.smoking_status || "Non-smoker",
            "Alcohol Consumption": "Non-drinker",
            "Malnutrition": "No",
            "Chronic Lung Disease": "No",
            "Living Conditions": "Average",
            "Region Code": 39,
            "disease_duration_months": 0
        };

        const pythonProcess = spawn(pythonExecutable, [scriptPath, JSON.stringify(inputData)]);

        let dataString = '';
        let errorString = '';

        pythonProcess.stdout.on('data', (data) => {
            dataString += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorString += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`Python script exited with code ${code}: ${errorString}`);
                return res.status(500).json({ message: "Analysis model failed", error: errorString });
            }

            try {
                const predictionResult = JSON.parse(dataString);

                res.json({
                    message: "Report Analysis Complete",
                    result: predictionResult.treatment_type,
                    confidence: predictionResult.confidence,
                    findings: [predictionResult.recommendation],
                    risk_level: predictionResult.risk_level,
                    is_clinical_analysis: true
                });

                // Cleanup: Delete uploaded file after processing if it was just for analysis
                if (filePath) {
                    fs.unlink(filePath, (err) => {
                        if (err) console.error("Failed to delete temp file:", err);
                    });
                }

            } catch (parseError) {
                console.error("JSON Parse Error:", parseError, "Raw Data:", dataString);
                res.status(500).json({ message: "Invalid response from model", raw: dataString });
            }
        });

    } catch (error) {
        console.error("Analysis Error:", error);
        res.status(500).json({ message: "Error analyzing report", error: error.message });
    }
};

exports.predictSymptom = (req, res) => {
    const symptomData = req.body; // Expects JSON object matching predict.py input

    // Path to python script
    const scriptPath = path.join(__dirname, '../ml_models/predict.py');

    // Spawn python process
    // Use environment variable or default 'python' to avoid hardcoded paths
    const pythonExecutable = process.env.PYTHON_PATH || 'python';
    const pythonProcess = spawn(pythonExecutable, [scriptPath, JSON.stringify(symptomData)]);

    let dataString = '';
    let errorString = '';

    pythonProcess.stdout.on('data', (data) => {
        dataString += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        errorString += data.toString();
    });

    pythonProcess.on('close', (code) => {
        if (code !== 0) {
            console.error(`Python script exited with code ${code}: ${errorString}`);
            return res.status(500).json({ message: "Prediction model failed", error: errorString });
        }

        try {
            const result = JSON.parse(dataString);
            res.json(result);
        } catch (parseError) {
            console.error("JSON Parse Error:", parseError, "Raw Data:", dataString);
            res.status(500).json({ message: "Invalid response from model", raw: dataString });
        }
    });
};
