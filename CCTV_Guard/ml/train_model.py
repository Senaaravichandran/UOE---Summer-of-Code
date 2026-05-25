import pandas as pd
import joblib
import os
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report

# -----------------------------
# Load metadata
# -----------------------------
df = pd.read_csv("../data/cctv_metadata.csv")

# -----------------------------
# Feature engineering
# -----------------------------

# Count number of open ports
df["open_ports_count"] = df["open_ports"].apply(lambda x: len(str(x).split(",")))

# Encode encryption
enc_map = {"none": 0, "weak": 1, "strong": 2}
df["encryption_encoded"] = df["encryption"].map(enc_map)

# -----------------------------
# Define target label
# -----------------------------
# Risk label derived from exposure_level
risk_map = {"low": 0, "medium": 1, "high": 2}
df["risk_label"] = df["exposure_level"].map(risk_map)

# -----------------------------
# Select features
# -----------------------------
X = df[[
    "firmware_year",
    "default_credentials",
    "rtsp_enabled",
    "encryption_encoded",
    "open_ports_count"
]]

y = df["risk_label"]

# -----------------------------
# Train-test split
# -----------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.3, random_state=42
)

# -----------------------------
# Train model
# -----------------------------
model = RandomForestClassifier(
    n_estimators=100,
    random_state=42
)
model.fit(X_train, y_train)

# -----------------------------
# Evaluate
# -----------------------------
y_pred = model.predict(X_test)
print("Classification Report:\n")
print(classification_report(y_test, y_pred))

# -----------------------------
# Save model
# -----------------------------
os.makedirs('../models', exist_ok=True)
joblib.dump(model, '../models/risk_model.pkl')
print("ML model saved to models/risk_model.pkl")


