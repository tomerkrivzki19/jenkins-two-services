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

describe("Health build information", () => {
  test("uses Jenkins environment variables when provided", async () => {
    process.env.BUILD_NUMBER = "25";
    process.env.GIT_COMMIT = "abc1234";

    jest.resetModules();

    const appWithBuildInfo = require("./app");

    const response = await request(appWithBuildInfo).get("/health");

    expect(response.statusCode).toBe(200);
    expect(response.body.build).toBe("25");
    expect(response.body.commit).toBe("abc1234");

    delete process.env.BUILD_NUMBER;
    delete process.env.GIT_COMMIT;
  });
});
