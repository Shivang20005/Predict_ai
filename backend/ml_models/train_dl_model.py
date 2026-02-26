import pandas as pd
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout, BatchNormalization
from tensorflow.keras.callbacks import EarlyStopping
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
import joblib
import os

# Define constants
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(MODEL_DIR, "Srms_ims.csv")
MODEL_PATH = os.path.join(MODEL_DIR, "tb_prediction_model.h5")
ENCODER_PATH = os.path.join(MODEL_DIR, "label_encoders_dl.pkl")

def build_model(input_dim, num_classes):
    model = Sequential([
        Dense(128, activation='relu', input_dim=input_dim),
        BatchNormalization(),
        Dropout(0.3),
        Dense(64, activation='relu'),
        BatchNormalization(),
        Dropout(0.2),
        Dense(32, activation='relu'),
        # Output layer
        Dense(num_classes, activation='softmax' if num_classes > 1 else 'sigmoid')
    ])
    
    optimizer = tf.keras.optimizers.Adam(learning_rate=0.001)
    loss = 'sparse_categorical_crossentropy' if num_classes > 1 else 'binary_crossentropy'
    
    model.compile(optimizer=optimizer, loss=loss, metrics=['accuracy'])
    return model

def train_dl_model():
    print("Loading dataset...")
    try:
        df = pd.read_csv(DATA_PATH)
    except FileNotFoundError:
        print(f"Error: Dataset not found at {DATA_PATH}")
        return

    # Target
    target_col = 'Treatment Type' 
    if target_col not in df.columns:
        # Fallback check if it's named differently in new dataset
        print(f"Target column '{target_col}' not found. Available columns: {df.columns.tolist()}")
        return

    df = df.dropna(subset=[target_col])
    
    # Preprocessing
    print("Preprocessing data for Deep Learning...")
    
    # Feature columns (based on RFC implementation)
    label_cols = ['Gender', 'Region', 'Occupation', 'Smoking Status', 'Alcohol Consumption', 'Living Conditions', 'Complications']
    
    # Clean Symptoms
    if 'Symptoms' in df.columns:
        df['Symptoms'] = df['Symptoms'].astype(str).str.strip().str.title()
    
    encoders = {}
    
    # Encode Categorical Features
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
    df[target_col] = le_target.fit_transform(df[target_col].astype(str))
    encoders[target_col] = le_target
    num_classes = len(le_target.classes_)

    # Final feature selection
    symptom_cols = [c for c in df.columns if c.startswith('Symptom_')]
    feature_cols = label_cols + ['Age'] + symptom_cols
    
    X = df[feature_cols].values.astype('float32')
    y = df[target_col].values
    
    # Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Scaling (Crucial for NN)
    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train)
    X_test = scaler.transform(X_test)
    encoders['scaler'] = scaler
    
    print(f"Training Deep Learning model on shape: {X_train.shape}")
    model = build_model(X_train.shape[1], num_classes)
    
    # Early stopping to prevent overfitting
    early_stop = EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True)
    
    history = model.fit(
        X_train, y_train,
        validation_data=(X_test, y_test),
        epochs=100,
        batch_size=32,
        callbacks=[early_stop],
        verbose=1
    )
    
    # Evaluation
    loss, accuracy = model.evaluate(X_test, y_test, verbose=0)
    print(f"Final Test Accuracy: {accuracy * 100:.2f}%")
    
    # Save artifacts
    model.save(MODEL_PATH)
    joblib.dump(encoders, ENCODER_PATH)
    print(f"DL Model saved to {MODEL_PATH}")
    print(f"Encoders saved to {ENCODER_PATH}")

if __name__ == "__main__":
    train_dl_model()
