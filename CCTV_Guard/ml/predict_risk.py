import pandas as pd
import joblib

# -----------------------------
# Load model & data
# -----------------------------
model = joblib.load("../models/risk_model.pkl")
df = pd.read_csv("../data/cctv_metadata.csv")

# -----------------------------
# Feature engineering (same as training)
# -----------------------------
df["open_ports_count"] = df["open_ports"].apply(lambda x: len(str(x).split(",")))
enc_map = {"none": 0, "weak": 1, "strong": 2}
df["encryption_encoded"] = df["encryption"].map(enc_map)

X = df[[
    "firmware_year",
    "default_credentials",
    "rtsp_enabled",
    "encryption_encoded",
    "open_ports_count"
]]

# -----------------------------
# Predict
# -----------------------------
df["ml_risk_label"] = model.predict(X)

inv_map = {0: "Low", 1: "Medium", 2: "High"}
df["ml_risk_label"] = df["ml_risk_label"].map(inv_map)

# -----------------------------
# Save output
# -----------------------------
df.to_csv("../data/cctv_ml_predictions.csv", index=False)
print("ML predictions saved to data/cctv_ml_predictions.csv")
