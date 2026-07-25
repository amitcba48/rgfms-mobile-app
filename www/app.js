const API_URL = "https://script.google.com/macros/s/AKfycbzBbst8f-GoGhM4UEnrO7UpqkjtB6DTl7ip-9WlZyfPTWrLLzkZaeWrRKhvnWrbCikK/exec"; 

let masterData = {};
let clockInterval = null;

document.addEventListener("DOMContentLoaded", () => {
  const savedUser = localStorage.getItem("rgfms_user");
  if (savedUser) {
    showDashboard(JSON.parse(savedUser));
  }
});

function startLiveClock() {
  if (clockInterval) clearInterval(clockInterval);
  
  const updateClock = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = now.toLocaleDateString([], { day: '2-digit', month: 'short' });
    const clockElement = document.getElementById("current-time");
    if (clockElement) {
      clockElement.innerText = `${dateStr}, ${timeStr}`;
    }
  };

  updateClock();
  clockInterval = setInterval(updateClock, 1000);
}

/**
 * Native GPS helper (Runs without any NPM or local software installation)
 */
/**
 * Fast & Reliable GPS helper with fallback for WebViews & HTTP
 */
function getCurrentLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your device browser.");
      resolve({ lat: "", lng: "", mapLink: "Location N/A" });
      return;
    }

    const options = {
      enableHighAccuracy: false, // Set to false so Wi-Fi/Mobile towers respond INSTANTLY
      timeout: 10000,            // Increased to 10 seconds
      maximumAge: 30000          // Use cached position if recorded within last 30 seconds
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        resolve({
          lat: lat,
          lng: lng,
          mapLink: `https://maps.google.com/?q=${lat},${lng}`
        });
      },
      (error) => {
        console.warn("GPS Error Details:", error);
        
        let msg = "Could not get location.";
        if (error.code === 1) {
          msg = "Location permission denied. Please allow location access in your browser/app settings.";
        } else if (error.code === 2) {
          msg = "Position unavailable. Please turn ON Device Location (GPS).";
        } else if (error.code === 3) {
          msg = "Location request timed out.";
        }
        
        alert("GPS Notice: " + msg);
        resolve({ lat: "", lng: "", mapLink: "Location N/A" });
      },
      options
    );
  });
}

async function apiCall(action, payload = {}) {
  const requestBody = {
    action: action,
    ...payload
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      mode: "cors",
      redirect: "follow",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("API Call Error:", error);
    return { success: false, message: "Network connection error or request timed out." };
  }
}

async function login() {
  const employeeId = document.getElementById("emp-id").value.trim();
  const password = document.getElementById("password").value.trim();
  const loginBtn = document.getElementById("login-btn");

  if (!employeeId || !password) {
    alert("Please enter Employee ID and Password");
    return;
  }

  loginBtn.innerText = "Authenticating...";
  loginBtn.disabled = true;

  const res = await apiCall("login", { employeeId, password });

  loginBtn.innerText = "Log In";
  loginBtn.disabled = false;

  if (res && res.success) {
    localStorage.setItem("rgfms_user", JSON.stringify(res.user));
    showDashboard(res.user);
  } else {
    alert(res.message || "Invalid credentials. Please check Employee ID and Password.");
  }
}

async function showDashboard(user) {
  document.getElementById("login-section").classList.add("hidden");
  document.getElementById("dashboard-section").classList.remove("hidden");
  
  document.getElementById("user-name").innerText = user.name || user.employeeId;
  document.getElementById("user-role").innerText = user.designation || "Staff";

  startLiveClock();

  const lastCheckIn = localStorage.getItem("last_checkin_" + user.employeeId);
  if (lastCheckIn) {
    document.getElementById("checkin-status").innerText = lastCheckIn;
  }

  fetchMasterData();
}

async function fetchMasterData() {
  const res = await apiCall("getMasterData");
  if (res && res.success && res.data) {
    masterData = res.data;
    const subSelect = document.getElementById("substation-select");
    subSelect.innerHTML = '<option value="">-- Select Substation --</option>';

    Object.keys(masterData).forEach(sub => {
      subSelect.innerHTML += `<option value="${sub}">${sub}</option>`;
    });
  }
}

function onSubstationChange() {
  const subSelect = document.getElementById("substation-select").value;
  const feederSelect = document.getElementById("feeder-select");

  feederSelect.innerHTML = '<option value="">-- Select Feeder --</option>';

  if (subSelect && masterData[subSelect]) {
    masterData[subSelect].forEach(feeder => {
      feederSelect.innerHTML += `<option value="${feeder}">${feeder}</option>`;
    });
  }
}

async function handleAttendance(type) {
  const sub = document.getElementById("substation-select").value;
  const feeder = document.getElementById("feeder-select").value;
  const statusElem = document.getElementById("feeder-status");
  const remarksElem = document.getElementById("status-remarks");

  const feederStatus = statusElem ? statusElem.value : (type === "Check-Out" ? "Completed" : "Started");
  const remarks = remarksElem ? remarksElem.value.trim() : "";

  if (!sub) {
    alert("Please select a Substation first.");
    return;
  }

  const savedUser = JSON.parse(localStorage.getItem("rgfms_user") || "{}");

  // 📍 Fetch device GPS coordinates
  const location = await getCurrentLocation();

  // Send request to Google Sheets
  const res = await apiCall("logAttendance", {
    employeeId: savedUser.employeeId,
    employeeName: savedUser.name,
    type: type,
    substation: sub,
    feeder: feeder,
    feederStatus: feederStatus,
    remarks: remarks,
    latitude: location.lat,
    longitude: location.lng
  });

  if (res && res.success) {
    const now = new Date();
    const timestamp = `${now.toLocaleDateString([], { day: '2-digit', month: 'short' })} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const statusText = `${feederStatus} at ${timestamp} (${sub}${feeder ? ' - ' + feeder : ''})`;

    document.getElementById("checkin-status").innerText = statusText;
    if (savedUser.employeeId) {
      localStorage.setItem("last_checkin_" + savedUser.employeeId, statusText);
    }

    if (remarksElem) remarksElem.value = "";

    alert(`Recorded ${type} (${feederStatus}) successfully!\nLocation: ${location.lat ? location.lat + ', ' + location.lng : 'N/A'}`);
  } else {
    alert("Failed to record " + type.toLowerCase() + ": " + (res.message || "Network error"));
  }
}

function logout() {
  if (clockInterval) clearInterval(clockInterval);
  localStorage.removeItem("rgfms_user");
  location.reload();
}
