import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score
import joblib
import os

# Define constants
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(MODEL_DIR, "tb_data_v2.csv")
MODEL_PATH = os.path.join(MODEL_DIR, "tb_prediction_model.pkl")
ENCODER_PATH = os.path.join(MODEL_DIR, "label_encoders.pkl")

def train_model():
    print("Loading dataset...")
    try:
        df = pd.read_csv(DATA_PATH)
    except FileNotFoundError:
        print(f"Error: Dataset not found at {DATA_PATH}")
        return

    # Target
    target_col = 'Treatment Type' 
    df = df.dropna(subset=[target_col])
    
    # Preprocessing
    print("Preprocessing data...")
    
    if 'Symptoms' in df.columns:
        df['Symptoms'] = df['Symptoms'].astype(str).str.strip().str.title()
    
    # Label Encoded features
    label_cols = ['Gender', 'Region', 'Occupation', 'Smoking Status', 'Alcohol Consumption', 'Living Conditions', 'Complications']
    
    encoders = {}
    
    for col in label_cols:
        if col in df.columns:
            df[col] = df[col].astype(str).fillna("Unknown")
            le = LabelEncoder()
            df[col] = le.fit_transform(df[col])
            print(f"Encoded {col}: {len(le.classes_)} classes")
            encoders[col] = le
            
    # Process Age
    df['Age'] = pd.to_numeric(df['Age'], errors='coerce').fillna(0)

    # One-Hot Symptoms
    if 'Symptoms' in df.columns:
        s_exploded = df['Symptoms'].str.split(', ').explode()
        s_dummies = pd.get_dummies(s_exploded, prefix='Symptom').groupby(level=0).sum()
        df = df.drop('Symptoms', axis=1).join(s_dummies)
        encoders['symptom_columns'] = s_dummies.columns.tolist()

    # Target Encoding
    le_target = LabelEncoder()
    # Force target to string to avoid float issues in report
    df[target_col] = le_target.fit_transform(df[target_col].astype(str))
    encoders[target_col] = le_target

    # Final feature selection
    symptom_cols = [c for c in df.columns if c.startswith('Symptom_')]
    feature_cols = label_cols + ['Age'] + symptom_cols
    
    X = df[feature_cols]
    y = df[target_col]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training Random Forest Classifier on shape:", X_train.shape)
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train, y_train)
    
    y_pred = clf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"Accuracy: {acc * 100:.2f}%")
    
    # Save artifacts FIRST
    joblib.dump(clf, MODEL_PATH)
    joblib.dump(encoders, ENCODER_PATH)
    print(f"Model saved to {MODEL_PATH}")

    # Optional report
    try:
        classes = [str(c) for c in le_target.classes_]
        print(classification_report(y_test, y_pred, target_names=classes))
    except Exception as e:
        print("Report failed:", e)

if __name__ == "__main__":
    train_model()
