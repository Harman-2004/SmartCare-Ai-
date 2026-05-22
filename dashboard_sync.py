# -*- coding: utf-8 -*-
"""
SmartCare AI - Raspberry Pi Edge Synchronization Module
======================================================
Save this script on your Raspberry Pi. You can import its functions 
directly into your main sensor loop and camera controller.

Requirements:
    pip install requests
"""

import os
import requests

# ==============================================================================
# ⚙️ CONFIGURATION: CHOOSE WHERE YOUR FLASK WEB SERVER IS RUNNING
# ==============================================================================
# Choose ONE of the following options depending on your setup:

# Option A: Flask is running on the SAME Raspberry Pi (All-in-One hardware build)
SERVER_URL = "http://127.0.0.1:5000"

# Option B: Flask is running on your laptop, and Pi is connected via local Wi-Fi
# SERVER_URL = "http://192.168.1.15:5000"  # <-- Replace with your laptop's Wi-Fi IP

# Option C: Flask is deployed to Vercel or tunneled via Ngrok
# SERVER_URL = "https://harman-2004-smartcare.vercel.app" 
# ==============================================================================


def send_heart_rate(bpm):
    """
    Sends real-time heart rate (BPM) from the MAX30102 sensor to the web dashboard.
    
    Args:
        bpm (int): Patient's calculated Heart Rate in Beats Per Minute.
    """
    url = f"{SERVER_URL}/api/heart"
    payload = {
        "bpm": int(bpm)
    }
    
    try:
        # Timeout at 3 seconds to avoid blocking the hardware sensor loop
        response = requests.post(url, json=payload, timeout=3)
        
        if response.status_code == 200:
            data = response.json()
            print(f"[💓 Vital Sync Info] Successfully uploaded {bpm} BPM.")
            print(f"   Calculated Status: {data.get('status')}")
            print(f"   Calculated Consciousness: {data.get('consciousness')}")
            return True
        else:
            print(f"[⚠️ Vital Sync Warn] Server replied with status code {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print("[❌ Vital Sync Error] Could not connect to Flask server.")
        print(f"   Please verify the Flask server is running at: {SERVER_URL}")
        return False


def send_scanned_medicine(medicine_name, image_path=None):
    """
    Sends the recognized medicine name and captures/uploads the camera JPEG.
    
    Args:
        medicine_name (str): Name of the medicine identified by OCR or NVIDIA LLM.
        image_path (str, optional): Path to the captured JPEG file on Pi's disk.
    """
    url = f"{SERVER_URL}/api/medicine"
    
    # 1. Prepare text payload
    data_payload = {
        "name": str(medicine_name)
    }
    
    # 2. Check if a camera image file is provided
    if image_path and os.path.exists(image_path):
        try:
            print(f"[📷 Cam Sync Info] Uploading photo '{image_path}' and data...")
            with open(image_path, 'rb') as img_file:
                # Package as multipart/form-data
                files_payload = {
                    'image': (os.path.basename(image_path), img_file, 'image/jpeg')
                }
                
                response = requests.post(
                    url, 
                    data=data_payload, 
                    files=files_payload, 
                    timeout=10 # Higher timeout for image file transfers
                )
        except requests.exceptions.RequestException as e:
            print(f"[❌ Cam Sync Error] Image upload failed: {e}")
            return False
    else:
        # Fallback: Send only text JSON if no camera image is available
        try:
            print("[💊 Cam Sync Info] Uploading recognized name without photo...")
            response = requests.post(url, json=data_payload, timeout=5)
        except requests.exceptions.RequestException as e:
            print(f"[❌ Cam Sync Error] Text upload failed: {e}")
            return False

    # 3. Process API server response
    if response and response.status_code == 200:
        res_data = response.json()
        print(f"[💊 Cam Sync Info] Medicine update success!")
        print(f"   Matched Drug: {res_data.get('name')}")
        print(f"   Uses: {res_data.get('use')}")
        print(f"   Image URL: {res_data.get('image_url')}")
        return True
    else:
        print(f"[⚠️ Cam Sync Warn] Server replied with status code: {response.status_code if response else 'No Response'}")
        return False


# ==============================================================================
# 🧪 MOCK TEST RUN (You can run this file directly on the Pi or your PC to test!)
# ==============================================================================
if __name__ == "__main__":
    print("==================================================")
    print("🤖 SmartCare AI - Hardware Sync Script Diagnostic")
    print("==================================================")
    print(f"Targeting Server: {SERVER_URL}\n")
    
    # Test 1: Vitals
    print("--- 1. Testing Vitals Synchronization ---")
    send_heart_rate(75)
    
    # Test 2: Medicine
    print("\n--- 2. Testing Medicine Text-Only Synchronization ---")
    send_scanned_medicine("Dolo 650")
    
    print("\nDiagnostic complete.")
