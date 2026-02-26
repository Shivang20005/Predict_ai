import sys
import json
import pandas as pd
import joblib
import os
import numpy as np
import tensorflow as tf

# Constants
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
M1_PATH = os.path.join(MODEL_DIR, "model_M1.h5")
M2_PATH = os.path.join(MODEL_DIR, "model_M2.h5")
M1_ENCODERS = os.path.join(MODEL_DIR, "encoders_M1.pkl")
M2_ENCODERS = os.path.join(MODEL_DIR, "encoders_M2.pkl")
M1_SCALER = os.path.join(MODEL_DIR, "scaler_M1.pkl")
M2_SCALER = os.path.join(MODEL_DIR, "scaler_M2.pkl")
M1_FEATURES_PATH = os.path.join(MODEL_DIR, "features_M1.pkl")
M2_FEATURES_PATH = os.path.join(MODEL_DIR, "features_M2.pkl")

def get_symptom_flags(symptoms_str):
    symptoms_str = symptoms_str.lower()
    return {
        "dry_cough": 1 if "dry cough" in symptoms_str else 0,
        "chest_pain": 1 if "chest pain" in symptoms_str else 0,
        "mild_fever": 1 if "mild fever" in symptoms_str else 0,
        "sputum_cough": 1 if "sputum" in symptoms_str else 0,
        "evening_fever": 1 if "evening fever" in symptoms_str else 0,
        "weight_loss": 1 if "weight loss" in symptoms_str else 0,
        "loss_appetite": 1 if "loss of appetite" in symptoms_str else 0,
        "night_sweats": 1 if "night sweats" in symptoms_str else 0,
    }

def make_prediction(input_data):
    try:
        # Load models
        model_m1 = tf.keras.models.load_model(M1_PATH)
        model_m2 = tf.keras.models.load_model(M2_PATH)
        
        # Load encoders & scalers
        encoders_m1 = joblib.load(M1_ENCODERS)
        encoders_m2 = joblib.load(M2_ENCODERS)
        scaler_m1 = joblib.load(M1_SCALER)
        scaler_m2 = joblib.load(M2_SCALER)
        features_m1_list = joblib.load(M1_FEATURES_PATH)
        features_m2_list = joblib.load(M2_FEATURES_PATH)
        
    except Exception as e:
        return {"error": f"Error loading models/encoders: {str(e)}"}

    # Prepare Data
    symptoms_str = input_data.get('Symptoms', '')
    symptom_flags = get_symptom_flags(symptoms_str)
    
    # Base dataframe with all possible inputs
    full_data = {**input_data, **symptom_flags}
    
    # Process for M1
    df1 = pd.DataFrame([full_data])
    for col, le in encoders_m1.items():
        if col in df1.columns:
            val = str(df1[col].iloc[0])
            if val not in le.classes_:
                val = le.classes_[0] # Fallback
            df1[col] = le.transform([val])
    
    # Handle numeric M1
    df1['Age'] = pd.to_numeric(df1['Age'], errors='coerce').fillna(30)
    # Ensure disease_duration_months exists
    if 'disease_duration_months' not in df1.columns:
        df1['disease_duration_months'] = 0
        
    X1 = df1[features_m1_list].values.astype('float32')
    X1_scaled = scaler_m1.transform(X1)
    
    # Process for M2
    df2 = pd.DataFrame([full_data])
    for col, le in encoders_m2.items():
        if col in df2.columns:
            val = str(df2[col].iloc[0])
            if val not in le.classes_:
                val = le.classes_[0]
            df2[col] = le.transform([val])
            
    # Handle numeric M2
    df2['Age'] = pd.to_numeric(df2['Age'], errors='coerce').fillna(30)
    if 'Region Code' not in df2.columns:
        df2['Region Code'] = 39 # Default/Average
        
    X2 = df2[features_m2_list].values.astype('float32')
    X2_scaled = scaler_m2.transform(X2)
    
    # Predict
    prob1 = float(model_m1.predict(X1_scaled, verbose=0)[0][0])
    prob2 = float(model_m2.predict(X2_scaled, verbose=0)[0][0])
    
    # Logic: 
    # M1 Positive: prob1 > 0.5 (1=Positive)
    # M2 Positive: prob2 < 0.5 (0=Abnormal)
    # Combined: Both indicate TB
    
    m1_sick = prob1 > 0.5
    m2_sick = prob2 < 0.5
    
    is_tb_positive = m1_sick and m2_sick
    
    # Result mapping
    result_status = "Tuberculosis Detected" if is_tb_positive else "No Tuberculosis Detected"
    confidence = (prob1 + (1 - prob2)) / 2 * 100 if is_tb_positive else ( (1-prob1) + prob2 ) / 2 * 100
    
    # Severity and recommendations
    severity = "High" if is_tb_positive else ("Moderate" if (m1_sick or m2_sick) else "Low")
    
    if is_tb_positive:
        recommendation = "Both clinical tests and symptoms indicate high probability of Tuberculosis. Immediate consultation with a specialist is required."
    elif m1_sick or m2_sick:
        recommendation = "Inconclusive results. One test indicates potential risk. Please consult a doctor for a follow-up checkup."
    else:
        recommendation = "No immediate signs of Tuberculosis detected. Maintain a healthy lifestyle and consult if symptoms persist."

    return {
        "treatment_type": result_status,
        "confidence": f"{confidence:.2f}%",
        "risk_level": severity,
        "preferred_test": "In-person Clinical Evaluation" if is_tb_positive else "Repeat Screening in 3 months",
        "recommendation": recommendation,
        "debug_info": f"M1(GeneXpert) Prob: {prob1:.4f}, M2(X-ray) Prob: {prob2:.4f}"
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No input provided"}))
        sys.exit(1)
        
    try:
        input_json = sys.argv[1]
        data = json.loads(input_json)
        result = make_prediction(data)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
