const request = require("supertest");

describe("API routes", () => {
  test("GET /data returns API data", async () => {
    jest.resetModules();

    delete process.env.BUILD_NUMBER;
    delete process.env.GIT_COMMIT;

    const app = require("./app");

    const response = await request(app).get("/data");

    expect(response.statusCode).toBe(200);
    expect(response.body.data.service).toBe("Jenkins API");
    expect(response.body.data.status).toBe("running");
  });

  test("GET /health uses local values when Jenkins variables are missing", async () => {
    jest.resetModules();

    delete process.env.BUILD_NUMBER;
    delete process.env.GIT_COMMIT;

    const app = require("./app");

    const response = await request(app).get("/health");

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.build).toBe("local");
    expect(response.body.commit).toBe("local");
  });

  test("GET /health uses Jenkins environment variables", async () => {
    jest.resetModules();

    process.env.BUILD_NUMBER = "25";
    process.env.GIT_COMMIT = "abc1234";

    const app = require("./app");

    const response = await request(app).get("/health");

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.build).toBe("25");
    expect(response.body.commit).toBe("abc1234");

    delete process.env.BUILD_NUMBER;
    delete process.env.GIT_COMMIT;
  });
});
