const API_URL = "YOUR_APPS_SCRIPT_WEB_APP_URL_HERE"; 

let masterData = {};

document.addEventListener("DOMContentLoaded", () => {
  const savedUser = localStorage.getItem("rgfms_user");
  if (savedUser) {
    showDashboard(JSON.parse(savedUser));
  }
});

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
    console.error("API Call Error:", err);
    return { success: false, message: "Network connection issue" };
  }
}

async function login() {
  const employeeId = document.getElementById("emp-id").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!employeeId || !password) {
    alert("Please enter Employee ID and Password");
    return;
  }

  const res = await apiCall("login", { employeeId, password });

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

  // Silent load of master data without popping up credential alerts
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

function handleAttendance(type) {
  const sub = document.getElementById("substation-select").value;
  const feeder = document.getElementById("feeder-select").value;

  if (!sub) {
    alert("Please select a Substation first.");
    return;
  }

  alert(`${type} recorded successfully for ${sub} ${feeder ? '(' + feeder + ')' : ''}`);
}

function logout() {
  localStorage.removeItem("rgfms_user");
  location.reload();
}
