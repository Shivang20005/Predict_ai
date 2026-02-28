import pandas as pd
import numpy as np
import os

def generate_tb_data(n_samples=8000):
    np.random.seed(42)
    
    # 1. Base Demographics
    age = np.random.randint(5, 85, n_samples)
    gender = np.random.choice(['Male', 'Female', 'Other'], n_samples)
    region = np.random.choice(['Dhaka', 'Chittagong', 'Rajshahi', 'Khulna', 'Sylhet', 'Rangpur', 'Barisal'], n_samples)
    occupation = np.random.choice(['Farmer', 'Laborer', 'Student', 'Housewife', 'Service', 'Business', 'Unemployed'], n_samples)
    
    # 2. Risk Factors
    smoking = np.random.choice(['Non-smoker', 'Current smoker', 'Ex-smoker'], n_samples, p=[0.5, 0.4, 0.1])
    alcohol = np.random.choice(['None', 'Occasional', 'Regular'], n_samples, p=[0.6, 0.3, 0.1])
    living_conditions = np.random.choice(['Crowded', 'Well-ventilated', 'Slum'], n_samples, p=[0.45, 0.35, 0.2])
    complications = np.random.choice(['None', 'Diabetes', 'HIV', 'Malnutrition', 'Asthma'], n_samples, p=[0.6, 0.15, 0.1, 0.1, 0.05])
    
    data = []
    for i in range(n_samples):
        # We want to balance classes better
        is_positive = np.random.random() < 0.5 # 50/50 split for training balance
        
        active_symptoms = []
        if is_positive:
            # POSITIVE TB CASE
            active_symptoms.append('Cough')
            
            # Decide resistance
            # Stronger correlation with HIV and Slums
            if complications[i] == 'HIV' or (living_conditions[i] == 'Slum' and np.random.random() < 0.4):
                treatment = 'Drug-resistant TB treatment'
                # Drug resistant cases usually have more severe symptoms
                major_symptoms = ['Weight Loss', 'Night Sweats', 'Chest Pain', 'Fever', 'Fatigue', 'Loss of Appetite']
                picked = np.random.choice(major_symptoms, size=np.random.randint(4, 7), replace=False)
                active_symptoms.extend(picked)
            else:
                treatment = 'DOTS'
                # DOTS cases have normal TB symptoms
                major_symptoms = ['Weight Loss', 'Night Sweats', 'Chest Pain', 'Fever']
                picked = np.random.choice(major_symptoms, size=np.random.randint(2, 5), replace=False)
                active_symptoms.extend(picked)
            
            test_required = 'Yes'
        else:
            # NEGATIVE TB CASE
            # Only 10% have Cough
            if np.random.random() < 0.1:
                active_symptoms.append('Cough')
            
            non_tb_symptoms = ['Fatigue', 'Loss of Appetite', 'Fever'] # Fever can happen in flu etc.
            if np.random.random() < 0.3:
                picked = np.random.choice(non_tb_symptoms, size=np.random.randint(1, 3), replace=False)
                active_symptoms.extend(picked)
                
            treatment = 'None'
            test_required = 'No'
            
        data.append({
            'Age': age[i],
            'Gender': gender[i],
            'Region': region[i],
            'Occupation': occupation[i],
            'Symptoms': ', '.join(active_symptoms) if active_symptoms else 'None',
            'Smoking Status': smoking[i],
            'Alcohol Consumption': alcohol[i],
            'Living Conditions': living_conditions[i],
            'Complications': complications[i],
            'Treatment Type': treatment,
            'Test Required': test_required
        })
        
    df = pd.DataFrame(data)
    
    # Save to CSV
    output_path = os.path.join(os.path.dirname(__file__), "tb_data_v2.csv")
    df.to_csv(output_path, index=False)
    print(f"Generated {n_samples} samples at {output_path}")
    return output_path

if __name__ == "__main__":
    generate_tb_data()
