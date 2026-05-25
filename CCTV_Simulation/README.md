UrbanGuard/
├── flutter_frontend/
│   ├── lib/
│   │   ├── main.dart
│   │   ├── pages/
│   │   │   ├── onboarding_page.dart
│   │   │   ├── register_camera_page.dart
│   │   │   ├── video_upload_page.dart
│   ├── pubspec.yaml
│   ├── android/
│   ├── ios/
│   ├── web/
│   ├── build/
│   ├── test/
│   └── assets/
│       ├── onboarding_images/
│       ├── videos/ (Optional: If you want to store video assets)
│
├── flask_backend/
│   ├── uploaded_videos/     # Temporary storage for uploaded videos
│   ├── server.py            # Flask backend server
│   ├── requirements.txt     # Python dependencies
│   ├── model/
│   │   ├── model.h5         # Trained ML model
│   │   ├── preprocessing.py # Preprocessing helper functions
│   └── logs/
│       ├── app.log          # Logs for server activity
│
└── README.md                # Documentation
