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

async function apiCall(action, payload = {}) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({ action, ...payload }),
      redirect: "follow"
    });
    return await res.json();
  } catch (err) {
    console.error("API Error:", err);
    return { success: false, message: "Network connection issue" };
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

  // Visual Feedback for Fast UX
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

  // Start the live ticking clock under name
  startLiveClock();

  // Load last saved check-in time if present
  const lastCheckIn = localStorage.getItem("last_checkin_" + user.employeeId);
  if (lastCheckIn) {
    document.getElementById("checkin-status").innerText = lastCheckIn;
  }

  // Pre-fetch Master Data immediately
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

  if (!sub) {
    alert("Please select a Substation first.");
    return;
  }

  const savedUser = JSON.parse(localStorage.getItem("rgfms_user") || "{}");

  // Send log to Google Sheets via API
  const res = await apiCall("logAttendance", {
    employeeId: savedUser.employeeId,
    employeeName: savedUser.name,
    type: type,
    substation: sub,
    feeder: feeder
  });

  if (res && res.success) {
    const now = new Date();
    const timestamp = `${now.toLocaleDateString([], { day: '2-digit', month: 'short' })} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const statusText = `${type} at ${timestamp} (${sub}${feeder ? ' - ' + feeder : ''})`;

    document.getElementById("checkin-status").innerText = statusText;
    if (savedUser.employeeId) {
      localStorage.setItem("last_checkin_" + savedUser.employeeId, statusText);
    }

    // Clean user notification
    alert(`${type} Successfully!`);
  } else {
    alert("Failed to record " + type.toLowerCase() + ": " + (res.message || "Network error"));
  }
}

function logout() {
  if (clockInterval) clearInterval(clockInterval);
  localStorage.removeItem("rgfms_user");
  location.reload();
}
