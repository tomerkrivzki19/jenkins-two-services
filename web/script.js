async function getApiData() {
  try {
    // 1. Fetch data from API
    const response = await fetch("/api/data");

    // 2. Convert response to JSON
    const data = await response.json();

    console.log(data);

    // 3. Display API data in the HTML
    document.getElementById("service").textContent = data.data.service;
    document.getElementById("status").textContent = data.data.status;
    document.getElementById("message").textContent = data.data.message;
    document.getElementById("time").textContent = data.data.time;
  } catch (error) {
    console.error("Failed to get API data:", error);

    document.getElementById("error").textContent =
      "Could not connect to the API";
  }
}

async function getHealthData() {
  try {
    const response = await fetch("/api/health");
    const health = await response.json();

    console.log(health);

    document.getElementById("health-status").textContent = health.status;
    document.getElementById("build-number").textContent =
      health.build || "local";
    document.getElementById("commit-id").textContent = health.commit || "local";
  } catch (error) {
    console.error("Failed to get health data:", error);

    document.getElementById("health-status").textContent = "offline";
  }
}

async function getDeploymentSlot() {
  try {
    const response = await fetch("/deployment.json");
    const deployment = await response.json();

    document.getElementById("deployment-slot").textContent =
      deployment.slot.toUpperCase();
  } catch (error) {
    console.error("Failed to get deployment slot:", error);

    document.getElementById("deployment-slot").textContent = "UNKNOWN";
  }
}

getApiData();
getHealthData();
getDeploymentSlot();
