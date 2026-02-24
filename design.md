# Design - PREDICT_AI

## Architecture Diagram
The system follows a classic **MERN** stack architecture enhanced with a **Python AI Engine**.

```mermaid
graph TD
    Client[Web Browser (React.js + Tailwind)] -->|HTTPS/REST| Server[Node.js + Express.js]
    Server -->|Mongoose| DB[(MongoDB)]
    Server -->|API/gRPC| AI[AI Engine (Python/TensorFlow/NLP)]
    AI -->|Insights| Server
    Server -->|JSON Response| Client
```

## Module Breakdown

### 1. Front-End
- **Framework**: React.js
- **Styling**: Tailwind CSS
- **Features**: Responsive dashboards, interactive symptom input, and real-time lab report tracking.

### 2. Back-End
- **Framework**: Node.js, Express.js
- **Database**: MongoDB (NoSQL for flexible data structures)
- **Authentication**: JWT-based role-based access control.

### 3. AI Engine
- **Language**: Python
- **Core Libraries**: TensorFlow, NLP (Natural Language Processing)
- **Functionality**: Analyzing patient symptoms to provide triage levels and clinical insights.

## Data Flow
1. **Input**: Patient submits symptoms via the React front-end.
2. **Processing**: The Node.js back-end receives the request and sends data to the Python AI Engine.
3. **Analysis**: The AI Engine processes the text using NLP models and identifies potential health risks.
4. **Storage**: Data is logged into MongoDB for history and analytics.
5. **Output**: Insights are sent back to the front-end dashboard for the patient and doctor.

## Security Design
- **Role-Based Access Control (RBAC)**: Distinct permissions for Patients, Doctors, and Admins.
- **Encrypted Storage**: Sensitive patient data and passwords (hashed with bcrypt) are stored securely.
- **Secure Transport**: All data in transit is encrypted using HTTPS/TLS.
