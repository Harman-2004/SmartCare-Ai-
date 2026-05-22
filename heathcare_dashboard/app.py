import os
from datetime import datetime
from flask import Flask, jsonify, render_template, request
from werkzeug.utils import secure_filename

app = Flask(__name__)

latest_data = {
    "heart": {
        "bpm": 0,
        "status": "Waiting for sensor",
        "consciousness": "Unknown",
        "updated_at": None,
    },
    "medicine": {
        "name": "No medicine scanned",
        "use": "Scan a medicine strip or bottle from the Raspberry Pi camera.",
        "dosage": "Ask a doctor or pharmacist before taking any medicine.",
        "warning": "This project is only for assistance, not medical diagnosis.",
        "updated_at": None,
    },
}

history = []

medicine_database = {
    "dolo 650": {
        "name": "Dolo 650",
        "use": "Used for fever and mild to moderate pain relief.",
        "dosage": "Common adult dose is usually 1 tablet when needed, but follow a doctor's advice.",
        "warning": "Avoid overdose and be careful in liver disease. Do not combine with other paracetamol medicines.",
    },
    "paracetamol": {
        "name": "Paracetamol",
        "use": "Used for fever, headache, and body pain.",
        "dosage": "Dose depends on age and body weight. Follow the prescription or medicine label.",
        "warning": "Overdose can harm the liver. Avoid alcohol and duplicate paracetamol products.",
    },
    "cetirizine": {
        "name": "Cetirizine",
        "use": "Used for allergy symptoms such as sneezing, runny nose, and itching.",
        "dosage": "Usually taken once daily, but follow medical advice.",
        "warning": "May cause sleepiness. Avoid driving if drowsy.",
    },
    "aspirin": {
        "name": "Aspirin",
        "use": "Used for pain, fever, inflammation, and sometimes blood thinning under medical advice.",
        "dosage": "Dose depends on purpose. Use only as prescribed.",
        "warning": "Avoid in bleeding disorders, stomach ulcers, and children unless prescribed.",
    },
}


def now_text():
    return datetime.now().strftime("%d %b %Y, %I:%M %p")


def analyze_heart_rate(bpm):
    if bpm <= 0:
        return "No pulse detected", "Possible emergency"
    if 55 <= bpm <= 110:
        return "Normal", "Likely conscious"
    if 40 <= bpm < 55 or 110 < bpm <= 130:
        return "Abnormal", "Needs attention"
    return "Critical", "Possible unconscious / emergency"


def find_medicine(query):
    clean_query = query.strip().lower()
    for key, details in medicine_database.items():
        if key in clean_query or clean_query in key:
            return details

    return {
        "name": query.strip().title() if query.strip() else "Unknown medicine",
        "use": "Medicine not found in local database. Send this name to the AI/NVIDIA LLM module for explanation.",
        "dosage": "Dosage unavailable. Confirm with a doctor or pharmacist.",
        "warning": "Do not consume unknown medicine based only on OCR output.",
    }


@app.route('/')
def dashboard():
    return render_template('index.html')


@app.route('/api/data')
def get_data():
    return jsonify(latest_data)


@app.route('/api/history')
def get_history():
    return jsonify(history[-20:])


@app.route('/api/heart', methods=['GET', 'POST'])
def heart_rate():
    if request.method == 'POST':
        payload = request.get_json(silent=True) or {}
        bpm = int(payload.get("bpm", 0))
        status, consciousness = analyze_heart_rate(bpm)

        latest_data["heart"] = {
            "bpm": bpm,
            "status": status,
            "consciousness": consciousness,
            "updated_at": now_text(),
        }
        history.append({
            "type": "Heart Rate",
            "title": f"{bpm} BPM",
            "detail": f"{status} - {consciousness}",
            "time": latest_data["heart"]["updated_at"],
        })

    return jsonify(latest_data["heart"])


# Setup upload directory relative to root
UPLOAD_FOLDER = os.path.join(app.root_path, 'static', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/api/medicine', methods=['GET', 'POST'])
def medicine():
    if request.method == 'POST':
        scanned_text = ""
        image_url = latest_data["medicine"].get("image_url")

        # Check if request has an image uploaded as multipart form-data
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename != '':
                filename = secure_filename(file.filename)
                # Keep a single file for dashboard simplicity, or use timestamp for unique files
                base, ext = os.path.splitext(filename)
                unique_filename = f"scanned_med{ext}"
                save_path = os.path.join(UPLOAD_FOLDER, unique_filename)
                file.save(save_path)
                # Use timestamp-busting param for image reloading in cache
                image_url = f"/static/uploads/{unique_filename}?t={int(datetime.now().timestamp())}"
            
            scanned_text = request.form.get("name") or request.form.get("text") or ""
        else:
            # Fallback to standard JSON parsing
            payload = request.get_json(silent=True) or {}
            scanned_text = payload.get("name") or payload.get("text") or ""
            if "image_url" in payload:
                image_url = payload.get("image_url")

        details = find_medicine(scanned_text)

        latest_data["medicine"] = {
            **details,
            "image_url": image_url,
            "updated_at": now_text(),
        }
        history.append({
            "type": "Medicine",
            "title": latest_data["medicine"]["name"],
            "detail": latest_data["medicine"]["use"],
            "time": latest_data["medicine"]["updated_at"],
        })

    return jsonify(latest_data["medicine"])


@app.route('/heartrate')
def old_heart_rate_route():
    return jsonify(latest_data["heart"])

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
