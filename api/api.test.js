const request = require("supertest");
const app = require("./app");

describe("API routes", () => {
  test("GET /data returns API data", async () => {
    const response = await request(app).get("/data");

    expect(response.statusCode).toBe(200);
    expect(response.body.data.service).toBe("Jenkins API");
    expect(response.body.data.status).toBe("running");
  });

  test("GET /health returns ok", async () => {
    const response = await request(app).get("/health");

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("ok");
  });
});
