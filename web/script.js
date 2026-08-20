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

getApiData();
