/* ==========================================================================
   SmartCare AI Health Companion - Static & GitHub Pages Emulated Client Logic
   ========================================================================== */

// Offline/Emulated Database & State
const MEDICINE_DATABASE = {
    "dolo 650": {
        name: "Dolo 650",
        use: "Used for fever and mild to moderate pain relief.",
        dosage: "Common adult dose is usually 1 tablet when needed, but follow a doctor's advice.",
        warning: "Avoid overdose and be careful in liver disease. Do not combine with other paracetamol medicines."
    },
    "paracetamol": {
        name: "Paracetamol",
        use: "Used for fever, headache, and body pain.",
        dosage: "Dose depends on age and body weight. Follow the prescription or medicine label.",
        warning: "Overdose can harm the liver. Avoid duplicate paracetamol products."
    },
    "cetirizine": {
        name: "Cetirizine",
        use: "Used for allergy symptoms such as sneezing, runny nose, and itching.",
        dosage: "Usually taken once daily, but follow medical advice.",
        warning: "May cause sleepiness. Avoid driving if drowsy."
    },
    "aspirin": {
        name: "Aspirin",
        use: "Used for pain, fever, inflammation, and sometimes blood thinning.",
        dosage: "Dose depends on purpose. Use only as prescribed.",
        warning: "Avoid in bleeding disorders, stomach ulcers, and children unless prescribed."
    }
};

// Default initial state
let localState = {
    heart: {
        bpm: 72,
        status: "Normal",
        consciousness: "Likely conscious",
        updated_at: "System Initialized"
    },
    medicine: {
        name: "No medicine scanned",
        use: "Scan a medicine strip or bottle from the Raspberry Pi camera.",
        dosage: "Ask a doctor or pharmacist before taking any medicine.",
        warning: "This project is only for assistance, not medical diagnosis.",
        updated_at: "Ready"
    },
    history: [
        {
            type: "Heart Rate",
            title: "72 BPM",
            detail: "Normal - Likely conscious",
            time: "System Initialized"
        }
    ]
};

// Flag to indicate if we have permanently fallen back to local simulation
let isClientSideSimulation = false;

// Helper to set DOM text safely
function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.innerText = value || "--";
    }
}

// Global Toast System
function showToast(message) {
    const toast = document.getElementById("toast");
    if (toast) {
        toast.innerText = message;
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 2500);
    }
}

// Navigation Tab Switching Logic
function switchTab(tabId) {
    const contents = document.querySelectorAll(".tab-content");
    contents.forEach(content => content.classList.remove("active"));

    const navButtons = document.querySelectorAll(".nav-btn");
    navButtons.forEach(btn => btn.classList.remove("active"));

    const activeSection = document.getElementById(`tab-${tabId}`);
    if (activeSection) activeSection.classList.add("active");

    const activeBtn = document.getElementById(`nav-${tabId}`);
    if (activeBtn) activeBtn.classList.add("active");

    const viewport = document.querySelector(".scanner-viewport");
    if (viewport) {
        if (tabId === 'medicine') {
            viewport.classList.add("scanning");
        } else {
            viewport.classList.remove("scanning");
        }
    }
}

// Modulate ECG wave speed dynamically based on BPM
function modulateEcgAnimation(bpm) {
    const ecgPath = document.querySelector(".ecg-path");
    if (!ecgPath) return;

    if (!bpm || bpm <= 0) {
        ecgPath.style.animationDuration = "12s";
        ecgPath.style.stroke = "var(--text-muted)";
        return;
    }

    let duration = 3.5;
    if (bpm > 0) {
        duration = Math.max(1.2, Math.min(8.0, (75 / bpm) * 3.5));
    }

    ecgPath.style.animationDuration = `${duration}s`;

    if (bpm >= 55 && bpm <= 110) {
        ecgPath.style.stroke = "var(--cyan)";
    } else if (bpm >= 40 && bpm < 55 || bpm > 110 && bpm <= 130) {
        ecgPath.style.stroke = "#ffd600";
    } else {
        ecgPath.style.stroke = "var(--color-red)";
    }
}

// Update heart vital panel UI
function updateHeart(heart) {
    const bpm = heart.bpm || 0;
    setText("bpm", bpm > 0 ? bpm : "--");
    setText("heartUpdated", heart.updated_at || "Waiting for data...");
    setText("consciousness", heart.consciousness || "Unknown");
    setText("heartStatusText", (heart.status || "STANDBY").toUpperCase());

    modulateEcgAnimation(bpm);

    const badge = document.getElementById("heartBadge");
    const statusText = document.getElementById("heartStatusText");
    
    if (badge) {
        badge.innerText = heart.status || "Standby";
        badge.className = "badge";

        if (heart.status === "Normal") {
            badge.classList.add("normal-badge");
            if (statusText) statusText.className = "status-indicator-text green";
        } else if (heart.status === "Critical" || heart.status === "No pulse detected" || heart.status === "Possible emergency") {
            badge.classList.add("critical-badge");
            if (statusText) statusText.className = "status-indicator-text red";
        } else {
            badge.classList.add("warning-badge");
            if (statusText) statusText.className = "status-indicator-text yellow";
        }
    }
}

// Update medicine scan info card UI
function updateMedicine(medicine) {
    const medName = medicine.name || "No medicine scanned";
    setText("medicineName", medName);
    setText("medicineMini", medName === "No medicine scanned" ? "No scan" : medName);
    setText("medicineUse", medicine.use || "Waiting for OCR trigger...");
    setText("medicineDosage", medicine.dosage || "Consult a professional.");
    setText("medicineWarning", medicine.warning || "Do not consume unknown medicine.");
    setText("medicineUpdated", medicine.updated_at || "No scan recorded");

    const overlayText = document.getElementById("medicineScanOverlayText");
    if (overlayText) {
        if (medName !== "No medicine scanned") {
            overlayText.innerHTML = `<span style="color: var(--color-green)">✔ ${medName} Scanned Successfully</span>`;
        } else {
            overlayText.innerText = "Show medicine strip to Raspberry Pi Camera";
        }
    }
}

// Render log history items
function updateHistory(history) {
    const historyList = document.getElementById("historyList");
    setText("activityCount", history.length);

    if (!historyList) return;

    if (!history.length) {
        historyList.innerHTML = '<p class="empty-state">No telemetry data recorded yet.</p>';
        return;
    }

    historyList.innerHTML = history
        .slice()
        .reverse()
        .map((item) => {
            const isHeart = item.type === "Heart Rate";
            const borderStyle = isHeart ? "border-left: 3px solid var(--color-red)" : "border-left: 3px solid var(--color-green)";
            
            return `
                <div class="history-item" style="${borderStyle}">
                    <div>
                        <strong>${item.title}</strong>
                        <p>${item.detail}</p>
                    </div>
                    <span>${item.time}</span>
                </div>
            `;
        })
        .join("");
}

// Fetch helper that falls back gracefully
async function loadDashboard() {
    // If we've already detected we are in offline static mode
    if (isClientSideSimulation) {
        updateHeart(localState.heart);
        updateMedicine(localState.medicine);
        updateHistory(localState.history);
        return;
    }

    try {
        const response = await fetch("/api/data");
        if (!response.ok) throw new Error("Offline");
        const data = await response.json();
        
        const historyResponse = await fetch("/api/history");
        const history = await historyResponse.json();

        updateHeart(data.heart);
        updateMedicine(data.medicine);
        updateHistory(history);
    } catch (error) {
        // Activate Local Simulation Mode (Perfect for GitHub Pages)
        if (!isClientSideSimulation) {
            isClientSideSimulation = true;
            console.log("⚠️ Backend offline: Activating local emulated client engine.");
            showToast("ℹ️ Emulated Client Mode Active");
            
            // Load previously saved mock state from localStorage if it exists
            const savedState = localStorage.getItem("smartcare_mock_state");
            if (savedState) {
                localState = JSON.parse(savedState);
            }
        }
        
        updateHeart(localState.heart);
        updateMedicine(localState.medicine);
        updateHistory(localState.history);
    }
}

// Helper to format timestamps
function getNowString() {
    const d = new Date();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const hours = d.getHours();
    const mins = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${hour12}:${mins} ${ampm}`;
}

// Calculate diagnostics client-side
function analyzeHeartRate(bpm) {
    if (bpm <= 0) return ["No pulse detected", "Possible emergency"];
    if (55 <= bpm && bpm <= 110) return ["Normal", "Likely conscious"];
    if ((40 <= bpm && bpm < 55) || (110 < bpm && bpm <= 130)) return ["Abnormal", "Needs attention"];
    return ["Critical", "Possible unconscious / emergency"];
}

// Inject manual Heart Rate BPM simulation stream
async function sendHeartRate() {
    const bpmInput = document.getElementById("demoBpm");
    if (!bpmInput) return;

    const bpm = Number(bpmInput.value);
    if (!bpm || bpm < 0 || bpm > 220) {
        showToast("⚠️ Enter a valid BPM value between 30 and 220.");
        return;
    }

    if (isClientSideSimulation) {
        const [status, consciousness] = analyzeHeartRate(bpm);
        const timestamp = getNowString();
        
        localState.heart = {
            bpm: bpm,
            status: status,
            consciousness: consciousness,
            updated_at: timestamp
        };
        
        localState.history.push({
            type: "Heart Rate",
            title: `${bpm} BPM`,
            detail: `${status} - ${consciousness}`,
            time: timestamp
        });

        localStorage.setItem("smartcare_mock_state", JSON.stringify(localState));
        bpmInput.value = "";
        showToast("💓 BPM injected locally!");
        loadDashboard();
    } else {
        try {
            const response = await fetch("/api/heart", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bpm })
            });
            if (!response.ok) throw new Error("Fail");
            bpmInput.value = "";
            showToast("💓 Live BPM injected successfully!");
            loadDashboard();
        } catch (e) {
            showToast("❌ Injection failed. Server unreachable.");
        }
    }
}

// Inject manual Medicine OCR simulation stream
async function sendMedicine() {
    const medicineInput = document.getElementById("demoMedicine");
    if (!medicineInput) return;

    const query = medicineInput.value.trim();
    if (!query) {
        showToast("⚠️ Enter a valid medicine name to inject.");
        return;
    }

    if (isClientSideSimulation) {
        const timestamp = getNowString();
        const cleanQuery = query.toLowerCase();
        let details = null;
        
        for (const [key, val] of Object.entries(MEDICINE_DATABASE)) {
            if (cleanQuery.includes(key) || key.includes(cleanQuery)) {
                details = val;
                break;
            }
        }
        
        if (!details) {
            details = {
                name: query.charAt(0).toUpperCase() + query.slice(1),
                use: "Medicine not found in local database. Simulated cloud search lookup successful.",
                dosage: "Dosage unavailable. Confirm with a doctor.",
                warning: "Do not consume unknown medicine based only on OCR output."
            };
        }

        localState.medicine = {
            ...details,
            updated_at: timestamp
        };

        localState.history.push({
            type: "Medicine",
            title: localState.medicine.name,
            detail: localState.medicine.use,
            time: timestamp
        });

        localStorage.setItem("smartcare_mock_state", JSON.stringify(localState));
        medicineInput.value = "";
        showToast("💊 Medicine Scan injected locally!");
        loadDashboard();
        
        setTimeout(() => switchTab('medicine'), 400);
    } else {
        try {
            const response = await fetch("/api/medicine", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: query })
            });
            if (!response.ok) throw new Error("Fail");
            medicineInput.value = "";
            showToast("💊 Medicine Scan injected successfully!");
            loadDashboard();
            
            setTimeout(() => switchTab('medicine'), 400);
        } catch (e) {
            showToast("❌ Injection failed. Server unreachable.");
        }
    }
}

// iOS/Material Style Dark/Light Theme Handler
function toggleDarkMode() {
    const switchEl = document.getElementById("darkModeSwitch");
    if (!switchEl) return;

    const isDark = switchEl.checked;
    
    if (isDark) {
        document.body.classList.remove("light-mode");
        localStorage.setItem("theme", "dark");
        showToast("🌙 Dark Theme Active");
    } else {
        document.body.classList.add("light-mode");
        localStorage.setItem("theme", "light");
        showToast("☀️ Light Theme Active");
    }
}

// Initialize application state
function initApp() {
    const storedTheme = localStorage.getItem("theme") || "dark";
    const switchEl = document.getElementById("darkModeSwitch");
    
    if (storedTheme === "light") {
        document.body.classList.add("light-mode");
        if (switchEl) switchEl.checked = false;
    } else {
        document.body.classList.remove("light-mode");
        if (switchEl) switchEl.checked = true;
    }

    switchTab('dashboard');
    loadDashboard();
    
    // Periodically sync or poll
    setInterval(loadDashboard, 2000);
}

// Boot setup
window.addEventListener("DOMContentLoaded", initApp);

// Service Worker Registration
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}
