/* ==========================================================================
   SmartCare AI Health Companion - Premium Client-Side Logic
   ========================================================================== */

// Helper to fetch JSON from API
async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
        },
        ...options,
    });

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }

    return response.json();
}

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
        // Remove active show class after 2.5 seconds
        setTimeout(() => toast.classList.remove("show"), 2500);
    }
}

// Navigation Tab Switching Logic
function switchTab(tabId) {
    // Hide all tab content sections
    const contents = document.querySelectorAll(".tab-content");
    contents.forEach(content => {
        content.classList.remove("active");
    });

    // Remove active styles from nav buttons
    const navButtons = document.querySelectorAll(".nav-btn");
    navButtons.forEach(btn => {
        btn.classList.remove("active");
    });

    // Show selected tab content section
    const activeSection = document.getElementById(`tab-${tabId}`);
    if (activeSection) {
        activeSection.classList.add("active");
    }

    // Set active class on corresponding button
    const activeBtn = document.getElementById(`nav-${tabId}`);
    if (activeBtn) {
        activeBtn.classList.add("active");
    }

    // If switching to medicine scan, check if we have a scan and update layout
    if (tabId === 'medicine') {
        const viewport = document.querySelector(".scanner-viewport");
        if (viewport) {
            viewport.classList.add("scanning");
        }
    } else {
        const viewport = document.querySelector(".scanner-viewport");
        if (viewport) {
            viewport.classList.remove("scanning");
        }
    }
}

// Modulate ECG wave speed dynamically based on BPM
function modulateEcgAnimation(bpm) {
    const ecgPath = document.querySelector(".ecg-path");
    if (!ecgPath) return;

    if (!bpm || bpm <= 0) {
        // Flat line or extremely slow drift
        ecgPath.style.animationDuration = "12s";
        ecgPath.style.stroke = "var(--text-muted)";
        return;
    }

    // Determine animation duration (seconds per scroll loop)
    // Baseline: 75 BPM = 3.5s duration
    // Higher BPM = shorter duration (faster flow)
    // Lower BPM = longer duration (slower flow)
    let duration = 3.5;
    
    if (bpm > 0) {
        // Calculate duration: inversely proportional to BPM
        duration = Math.max(1.2, Math.min(8.0, (75 / bpm) * 3.5));
    }

    ecgPath.style.animationDuration = `${duration}s`;

    // Visual feedback color matching status
    if (bpm >= 55 && bpm <= 110) {
        ecgPath.style.stroke = "var(--cyan)";
    } else if (bpm >= 40 && bpm < 55 || bpm > 110 && bpm <= 130) {
        ecgPath.style.stroke = "#ffd600"; // yellow
    } else {
        ecgPath.style.stroke = "var(--color-red)"; // emergency crimson
    }
}

// Update heart vital panel widgets
function updateHeart(heart) {
    const bpm = heart.bpm || 0;
    setText("bpm", bpm > 0 ? bpm : "--");
    setText("heartUpdated", heart.updated_at || "Waiting for Raspberry Pi data...");
    setText("consciousness", heart.consciousness || "Unknown");
    setText("heartStatusText", (heart.status || "STANDBY").toUpperCase());

    // Modulate ECG animation speed
    modulateEcgAnimation(bpm);

    // Apply color-coded badges
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

// Update medicine scan info card
function updateMedicine(medicine) {
    const medName = medicine.name || "No medicine scanned";
    setText("medicineName", medName);
    setText("medicineMini", medName === "No medicine scanned" ? "No scan" : medName);
    setText("medicineUse", medicine.use || "Waiting for Raspberry Pi camera OCR trigger...");
    setText("medicineDosage", medicine.dosage || "Please consult with a licensed doctor.");
    setText("medicineWarning", medicine.warning || "Do not consume unknown medications.");
    setText("medicineUpdated", medicine.updated_at || "No scan recorded");

    // Scanner overlay text
    const overlayText = document.getElementById("medicineScanOverlayText");
    if (overlayText) {
        if (medName !== "No medicine scanned") {
            overlayText.innerHTML = `<span style="color: var(--color-green)">✔ ${medName} Scanned Successfully</span>`;
        } else {
            overlayText.innerText = "Show medicine strip to Raspberry Pi Camera";
        }
    }
}

// Render dynamic HTML list for recent logs
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
            const iconColor = isHeart ? "border-left: 3px solid var(--color-red)" : "border-left: 3px solid var(--color-green)";
            
            return `
                <div class="history-item" style="${iconColor}">
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

// Load and refresh dashboard telemetry
async function loadDashboard() {
    try {
        const data = await fetchJson("/api/data");
        const history = await fetchJson("/api/history");

        updateHeart(data.heart);
        updateMedicine(data.medicine);
        updateHistory(history);
    } catch (error) {
        console.warn("Telemetry offline - waiting for Flask API connection.");
    }
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

    try {
        await fetchJson("/api/heart", {
            method: "POST",
            body: JSON.stringify({ bpm }),
        });

        bpmInput.value = "";
        showToast("💓 Live BPM injected successfully!");
        loadDashboard();
    } catch (e) {
        showToast("❌ Injection failed. Server unreachable.");
    }
}

// Inject manual Medicine OCR simulation stream
async function sendMedicine() {
    const medicineInput = document.getElementById("demoMedicine");
    if (!medicineInput) return;

    const name = medicineInput.value.trim();

    if (!name) {
        showToast("⚠️ Enter a valid medicine name to inject.");
        return;
    }

    try {
        await fetchJson("/api/medicine", {
            method: "POST",
            body: JSON.stringify({ name }),
        });

        medicineInput.value = "";
        showToast("💊 Medicine Scan injected successfully!");
        loadDashboard();
        
        // Auto navigate to Medicine tab to show results
        setTimeout(() => switchTab('medicine'), 400);
    } catch (e) {
        showToast("❌ Injection failed. Server unreachable.");
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
    // Theme Initial State Setup
    const storedTheme = localStorage.getItem("theme") || "dark";
    const switchEl = document.getElementById("darkModeSwitch");
    
    if (storedTheme === "light") {
        document.body.classList.add("light-mode");
        if (switchEl) switchEl.checked = false;
    } else {
        document.body.classList.remove("light-mode");
        if (switchEl) switchEl.checked = true;
    }

    // Set first view
    switchTab('dashboard');

    // Run first telemetry data poll
    loadDashboard();

    // Set telemetry poll interval
    setInterval(loadDashboard, 2000);
}

// Boot setup
window.addEventListener("DOMContentLoaded", initApp);

// PWA Service Worker Registration
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/static/service-worker.js").catch(() => {});
}
