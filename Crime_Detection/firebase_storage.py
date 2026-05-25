import os
import requests
from datetime import datetime

class FirebaseStorage:
    """
    Firebase Storage service to replace Pinata IPFS uploads.
    Uploads files to Firebase Storage and returns public URLs.
    """
    
    def __init__(self):
        # Firebase configuration
        self.api_key = "AIzaSyBPP6Oe6ZhTGBHqrqPczfaXkuUPG9X9mSQ"
        self.storage_bucket = "evasafe-new.firebasestorage.app"
        self.project_id = "evasafe-new"
        
        # Firebase Storage REST API endpoint
        self.upload_url = f"https://firebasestorage.googleapis.com/v0/b/{self.storage_bucket}/o"
    
    def upload_file(self, file_path, folder="videos"):
        """
        Upload a file to Firebase Storage.
        
        Args:
            file_path (str): Path to the file to upload
            folder (str): Folder name in Firebase Storage (default: "videos")
            
        Returns:
            str: Public download URL or None if failed
        """
        try:
            if not os.path.exists(file_path):
                print(f"❌ File not found: {file_path}")
                return None
            
            filename = os.path.basename(file_path)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            storage_path = f"{folder}/{timestamp}_{filename}"
            
            # Read file
            with open(file_path, 'rb') as f:
                file_data = f.read()
            
            # Upload to Firebase Storage using REST API
            upload_endpoint = f"{self.upload_url}?name={storage_path}&uploadType=media"
            
            headers = {
                'Content-Type': 'video/mp4',
            }
            
            response = requests.post(
                upload_endpoint,
                data=file_data,
                headers=headers,
                params={'key': self.api_key}
            )
            
            if response.status_code in [200, 201]:
                # Get the download token from response
                response_data = response.json()
                download_token = response_data.get('downloadTokens', '')
                
                # Construct public URL
                download_url = f"https://firebasestorage.googleapis.com/v0/b/{self.storage_bucket}/o/{storage_path.replace('/', '%2F')}?alt=media"
                
                if download_token:
                    download_url += f"&token={download_token}"
                
                print(f"✅ Successfully uploaded to Firebase Storage")
                print(f"📦 Storage Path: {storage_path}")
                print(f"🔗 Download URL: {download_url}")
                
                return download_url
            else:
                print(f"❌ Upload failed. Status code: {response.status_code}")
                print(f"Response: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Error uploading to Firebase: {e}")
            return None
    
    def upload_video(self, video_path):
        """
        Convenience method specifically for video uploads.
        
        Args:
            video_path (str): Path to the video file
            
        Returns:
            str: Public download URL or None if failed
        """
        return self.upload_file(video_path, folder="crime_videos")


# Create singleton instance
firebase_storage = FirebaseStorage()


def upload_to_firebase(video_path):
    """
    Main function to upload video to Firebase Storage (replaces upload_to_pinata).
    
    Args:
        video_path (str): Path to the video file
        
    Returns:
        str: Firebase Storage download URL or None
    """
    return firebase_storage.upload_video(video_path)
