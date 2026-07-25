// REPLACE THIS URL WITH YOUR PUBLISHED APPS SCRIPT WEB APP API URL
const API_URL = "https://script.google.com/macros/s/AKfycbzBbst8f-GoGhM4UEnrO7UpqkjtB6DTl7ip-9WlZyfPTWrLLzkZaeWrRKhvnWrbCikK/exec";

let masterSubstationData = {};

document.addEventListener("DOMContentLoaded", () => {
  startClock();
  checkSession();
});

function startClock() {
  setInterval(() => {
    const now = new Date();
    const clockEl = document.getElementById("liveClock");
    if (clockEl) clockEl.innerText = now.toLocaleTimeString();
  }, 1000);
}

function checkSession() {
  const user = JSON.parse(localStorage.getItem("rgfms_user"));
  if (user) {
    showDashboard(user);
  } else {
    showLogin();
  }
}

function showLogin() {
  document.getElementById("loginView").classList.remove("hidden");
  document.getElementById("dashboardView").classList.add("hidden");
}

function showDashboard(user) {
  document.getElementById("loginView").classList.add("hidden");
  document.getElementById("dashboardView").classList.remove("hidden");

  // Render Employee Name & Designation (Col E)
  document.getElementById("userDisplayName").innerText = user.name || "Employee";
  document.getElementById("userDisplayRole").innerText = `${user.designation || 'Field Staff'} (${user.employeeId})`;

  fetchMasterData();
}

async function handleLogin() {
  const empId = document.getElementById("empIdInput").value.trim();
  const password = document.getElementById("passwordInput").value.trim();
  const alertEl = document.getElementById("loginAlert");

  if (!empId || !password) {
    alertEl.innerText = "Please fill in all fields.";
    alertEl.classList.remove("hidden");
    return;
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "login", employeeId: empId, password: password })
    });
    
    const data = await res.json();

    if (data.success) {
      alertEl.classList.add("hidden");
      localStorage.setItem("rgfms_user", JSON.stringify(data.user));
      showDashboard(data.user);
    } else {
      alertEl.innerText = data.message || "Invalid Login";
      alertEl.classList.remove("hidden");
    }
  } catch (err) {
    alertEl.innerText = "Connection error. Check API URL.";
    alertEl.classList.remove("hidden");
  }
}

async function fetchMasterData() {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "getMasterData" })
    });
    const data = await res.json();

    if (data.success) {
      masterSubstationData = data.data;
      populateSubstations(Object.keys(masterSubstationData));
    }
  } catch (err) {
    console.error("Master data error:", err);
  }
}

function populateSubstations(substations) {
  const listEl = document.getElementById("substationList");
  listEl.innerHTML = "";
  substations.forEach(sub => {
    const opt = document.createElement("option");
    opt.value = sub;
    listEl.appendChild(opt);
  });
}

function onSubstationChange(subName) {
  const listEl = document.getElementById("feederList");
  listEl.innerHTML = "";
  const feeders = masterSubstationData[subName] || [];
  feeders.forEach(f => {
    const opt = document.createElement("option");
    opt.value = f;
    listEl.appendChild(opt);
  });
}

function handleLogout() {
  localStorage.removeItem("rgfms_user");
  showLogin();
}

function submitStatusReport() {
  alert("Status report feature ready to connect!");
}
