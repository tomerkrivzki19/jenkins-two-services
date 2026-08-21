# Jenkins Two Services – CI/CD Final Project

Final practical assignment for **Continuous Integration with Jenkins**.

This project demonstrates a complete CI/CD pipeline for two Dockerized services using Jenkins, Docker, Nginx, automated testing, coverage enforcement, integration testing, Git branch management, build metadata, and Blue/Green deployment with automatic failure protection.

---

# 1. Project Overview

The application contains two independent services:

- **API Service** – Node.js / Express
- **Web Service** – Static frontend served by Nginx

Each service:

- Has its own Dockerfile
- Is built into its own Docker image
- Runs inside its own Docker container

The Web service communicates with the API through Docker's internal network.

The browser does not communicate directly with the API container.

```text
Browser
   |
   v
Nginx / Web
   |
   | /api/*
   v
Docker Internal Network
   |
   v
Node.js API
```

For the Blue/Green production environment, an additional permanent Nginx gateway is placed in front of the application.

---

# 2. Project Structure

```text
jenkins-two-services/
|
|-- api/
|   |-- Dockerfile
|   |-- app.js
|   |-- api.test.js
|   |-- package.json
|   |-- package-lock.json
|
|-- web/
|   |-- Dockerfile
|   |-- index.html
|   |-- script.js
|   |-- nginx.conf
|
|-- gateway/
|   |-- Dockerfile
|   |-- nginx.conf
|
|-- scripts/
|   |-- deploy-blue-green.sh
|
|-- compose.yml
|-- Jenkinsfile
|-- README.md
```

---

# 3. API Service

The API service is built using:

- Node.js
- Express

It runs internally on:

```text
3001
```

The API exposes two main endpoints.

## `/data`

Returns application information used by the frontend.

Example:

```json
{
  "data": {
    "service": "Jenkins API",
    "status": "running"
  }
}
```

## `/health`

Returns the current health and build information.

Example:

```json
{
  "status": "ok",
  "build": "25",
  "commit": "abc1234"
}
```

The health endpoint is also used by the Blue/Green deployment process to determine whether a newly started version is safe to receive production traffic.

---

# 4. Web Service

The Web service is served by Nginx.

Nginx serves the frontend files and acts as a reverse proxy between the browser and the API.

The browser requests:

```text
/api/data
```

or:

```text
/api/health
```

Nginx forwards these requests internally to:

```text
http://api:3001
```

For example:

```nginx
location /api/ {
    proxy_pass http://api:3001/;
}
```

The hostname `api` is resolved using Docker's internal DNS.

Therefore, the API does not need to expose port `3001` directly to the host computer for the Web service to communicate with it.

The communication flow is:

```text
Browser
   |
   | localhost:8081/api/data
   v
Web / Nginx
   |
   | http://api:3001/data
   v
API Container
```

---

# 5. Docker Architecture

The project creates two main application images:

```text
jenkins-api
jenkins-web
```

The API image contains the Node.js application.

The Web image contains:

- Nginx
- index.html
- script.js
- nginx.conf
- deployment slot information

Docker networks allow the containers to communicate without exposing the API directly to the host.

---

# 6. Local Development

The normal local environment can be started with:

```bash
docker compose up --build
```

The local frontend is available at:

```text
http://localhost:8081
```

API data through Nginx:

```text
http://localhost:8081/api/data
```

Health information through Nginx:

```text
http://localhost:8081/api/health
```

The local Compose environment is separate from the Jenkins Blue/Green production deployment.

---

# 7. Automated Tests

The API is tested using:

- Jest
- Supertest

The tests verify the important API behavior.

Tests include:

- `GET /data`
- `GET /health`
- local build metadata
- Jenkins build metadata

Example:

```text
PASS ./api.test.js

API routes
  ✓ GET /data returns API data
  ✓ GET /health uses local values when Jenkins variables are missing
  ✓ GET /health uses Jenkins environment variables
```

---

# 8. Coverage Gate

The project requires a minimum test coverage of:

```text
80%
```

Coverage is checked automatically by Jenkins.

If any required coverage metric falls below 80%, the Jenkins pipeline fails and later stages are not executed.

A successful result can look like:

```text
----------|---------|----------|---------|---------
File      | % Stmts | % Branch | % Funcs | % Lines
----------|---------|----------|---------|---------
All files |     100 |      100 |     100 |     100
app.js    |     100 |      100 |     100 |     100
----------|---------|----------|---------|---------
```

This prevents insufficiently tested code from reaching deployment.

---

# 9. Build Stamp

Every Jenkins-built API image contains information identifying the exact build.

Jenkins injects:

- Jenkins build number
- Git commit

into the Docker image during the image build process.

The Git commit is shortened to the first seven characters.

The Docker build uses build arguments similar to:

```bash
docker build \
  --build-arg BUILD_NUMBER=$BUILD_NUMBER \
  --build-arg GIT_COMMIT=$GIT_COMMIT \
  -t jenkins-api:$BUILD_NUMBER \
  ./api
```

The running application exposes this information through:

```text
/api/health
```

Example:

```json
{
  "status": "ok",
  "build": "25",
  "commit": "abc1234"
}
```

This makes it possible to identify exactly which Jenkins build and Git revision are currently running.

---

# 10. Jenkins Multibranch Pipeline

The project uses a Jenkins **Multibranch Pipeline**.

The repository contains two active branches:

```text
main
dev
```

Jenkins automatically detects and builds both branches.

Each branch has its own independent build history.

---

# 11. Branch Strategy

## `dev`

The `dev` branch performs CI validation but does not deploy to the live Blue/Green environment.

It performs:

```text
Checkout
   |
   v
Install Dependencies
   |
   v
Tests + Coverage
   |
   v
Build API Image
   |
   v
Build Web Image
   |
   v
Integration Test
   |
   STOP
```

No production deployment is performed from `dev`.

---

## `main`

The `main` branch performs the complete pipeline.

```text
Checkout
   |
   v
Install Dependencies
   |
   v
Tests + Coverage
   |
   v
Build API Image
   |
   v
Build Web Image
   |
   v
Integration Test
   |
   v
Blue/Green Deployment
```

Only a successful `main` pipeline can deploy a new application version.

---

# 12. Jenkins Pipeline

The Jenkins pipeline performs the following major stages:

```text
Checkout
        |
        v
Branch Info
        |
        v
Install API Dependencies
        |
        v
API Tests + Coverage
        |
        v
Build API Image
        |
        v
Build WEB Image
        |
        v
Integration Test
        |
        v
Blue/Green Deploy
        |
        v
Production
```

If an earlier stage fails, the following stages are skipped automatically.

For example:

```text
Tests FAILED
      |
      X
Docker Build skipped
Integration skipped
Deployment skipped
```

This prevents invalid application versions from reaching production.

---

# 13. Integration Testing

After the Docker images are built, Jenkins performs an integration test.

Jenkins creates an isolated Docker network and starts temporary API and Web containers.

Example architecture:

```text
test-web
   |
   | /api/data
   v
Nginx
   |
   | api:3001
   v
test-api
```

The test verifies that the Web container can successfully communicate with the API container through Docker networking and Nginx.

A request is made through the Web container:

```text
http://localhost/api/data
```

Internally, Nginx forwards the request to:

```text
http://api:3001/data
```

If the services cannot communicate, the integration stage fails.

The temporary test containers and network are separate from the production environment.

---

# 14. Blue/Green Deployment

The `main` branch uses a Blue/Green deployment strategy.

The goal is to deploy a new application version without immediately destroying the currently working version.

There are two possible deployment slots:

```text
BLUE
GREEN
```

Only one slot receives production traffic at a time.

---

# 15. Fixed Production Address

The production application always uses one fixed external address:

```text
http://localhost:8090
```

The user does not need to know whether BLUE or GREEN is currently active.

A permanent Nginx gateway controls where the traffic is sent.

```text
                     localhost:8090
                           |
                           v
                  +------------------+
                  |  Gateway Nginx   |
                  +--------+---------+
                           |
                    Active Version
                      /         \
                     /           \
                    v             v
              +----------+   +-----------+
              | WEB BLUE |   | WEB GREEN |
              +----+-----+   +-----+-----+
                   |               |
                   v               v
              +----------+   +-----------+
              | API BLUE |   | API GREEN |
              +----------+   +-----------+
```

The gateway itself remains running during deployment.

---

# 16. Blue/Green Deployment Process

Jenkins first determines which deployment is currently active.

For example:

```text
Current deployment: blue
New deployment: green
```

If BLUE is currently active, Jenkins prepares GREEN.

If GREEN is currently active, Jenkins prepares BLUE.

The process is:

```text
Current version is live
        |
        v
Determine opposite slot
        |
        v
Create new Docker network
        |
        v
Start new API
        |
        v
Start new Web
        |
        v
Health check new version
        |
       / \
      /   \
   PASS   FAIL
    |       |
    v       v
 Switch   Delete new version
 Traffic  Keep old version
    |
    v
Verify production
    |
    v
Remove old version
```

---

# 17. Successful Deployment

For example, assume BLUE is currently live.

Jenkins starts GREEN while BLUE continues serving users.

```text
BLUE = LIVE
GREEN = STARTING
```

Jenkins checks:

```text
GREEN /health
```

If GREEN returns:

```json
{
  "status": "ok"
}
```

the health check passes.

Jenkins then updates the gateway Nginx configuration from:

```nginx
proxy_pass http://web-blue:80;
```

to:

```nginx
proxy_pass http://web-green:80;
```

The Nginx configuration is validated before the switch.

Then Nginx is gracefully reloaded.

The gateway container itself is not stopped.

After the switch:

```text
localhost:8090
      |
      v
   GREEN
```

Jenkins verifies production traffic again.

Only after successful verification is the previous BLUE environment removed.

The next successful deployment performs the opposite operation:

```text
GREEN -> BLUE
```

---

# 18. Automatic Failure Protection / Rollback

The deployment process protects the currently working version from a broken release.

For testing purposes, a new deployment was intentionally configured to return:

```text
HTTP/1.1 500 Internal Server Error
```

from `/health`.

Jenkins detected:

```text
Health-checking green...

HTTP/1.1 500 Internal Server Error

Health check FAILED.
```

The broken GREEN deployment was then removed:

```text
web-green
api-green
green-network
```

while Jenkins reported:

```text
blue remains live.
```

The pipeline ended with:

```text
Finished: FAILURE
```

However, the production application remained available at:

```text
http://localhost:8090
```

and continued serving the previous healthy BLUE version.

The process therefore becomes:

```text
BLUE LIVE
   |
   +--------------------------+
                              |
                        Start GREEN
                              |
                              v
                       /health = 500
                              |
                              X
                       HEALTH FAILED
                              |
                              v
                       Delete GREEN
                              |
                              v
                         BLUE LIVE
```

Production traffic is never intentionally switched to a version that fails its pre-switch health check.

---

# 19. Deployment Status Dashboard

The frontend contains a visual deployment monitoring dashboard.

It displays:

- API service status
- API message
- server time
- health status
- Jenkins build number
- Git commit
- active deployment slot

The deployment slot is displayed using a visual colored indicator.

For BLUE:

```text
ACTIVE DEPLOYMENT

■ BLUE

HEALTH STATUS     OK
JENKINS BUILD     25
GIT COMMIT        abc1234
```

For GREEN:

```text
ACTIVE DEPLOYMENT

■ GREEN

HEALTH STATUS     OK
JENKINS BUILD     26
GIT COMMIT        def5678
```

This makes the Blue/Green traffic switch visible from the frontend.

The browser continues using:

```text
http://localhost:8090
```

regardless of the currently active color.

---

# 20. Failure Scenarios

The pipeline is designed to detect failures at different stages.

| Failure Scenario        | Expected Result                                      |
| ----------------------- | ---------------------------------------------------- |
| Unit test failure       | Pipeline stops during testing                        |
| Coverage below 80%      | Pipeline stops at coverage gate                      |
| Dockerfile syntax error | Pipeline stops during image build                    |
| Incorrect API address   | Integration test fails                               |
| `/health` failure       | New deployment rejected and old version remains live |

This ensures that failures are detected as early as possible.

---

# 21. Example Health-Check Failure

A Blue/Green failure test produced the following behavior:

```text
=== BLUE/GREEN DEPLOYMENT ===

Current deployment: blue
New deployment:     green

Starting API green...
Starting WEB green...

Waiting for new version...

Health-checking green...

wget: server returned error:
HTTP/1.1 500 Internal Server Error

Health check FAILED.

web-green
api-green
green-network

blue remains live.

ERROR: script returned exit code 1

Finished: FAILURE
```

At the same time:

```text
http://localhost:8090
```

continued serving BLUE successfully.

---

# 22. Technologies Used

The project uses:

- Jenkins
- Jenkins Multibranch Pipeline
- Docker
- Docker Compose
- Docker Networks
- Nginx
- Node.js
- Express
- Jest
- Supertest
- Git
- GitHub
- HTML
- CSS
- JavaScript
- Shell scripting

---

# 23. Important Addresses

## Local Development

Frontend:

```text
http://localhost:8081
```

API through Nginx:

```text
http://localhost:8081/api/data
```

Health:

```text
http://localhost:8081/api/health
```

---

## Blue/Green Production

Fixed production address:

```text
http://localhost:8090
```

API:

```text
http://localhost:8090/api/data
```

Health:

```text
http://localhost:8090/api/health
```

Deployment information:

```text
http://localhost:8090/deployment.json
```

---

# 24. Main Concepts Demonstrated

This project demonstrates:

### Continuous Integration

Every code change is automatically:

- checked out
- tested
- measured for coverage
- built into Docker images
- integration tested

### Continuous Deployment

Successful changes on `main` automatically proceed to Blue/Green deployment.

### Docker Networking

Containers communicate using Docker's internal DNS rather than host `localhost`.

### Reverse Proxy

Nginx routes browser API requests to the internal API service.

### Quality Gate

Coverage must remain at or above 80%.

### Build Traceability

Every running deployment exposes its Jenkins build number and Git commit.

### Blue/Green Deployment

A new version is prepared beside the existing version before traffic is switched.

### Failure Protection

An unhealthy new deployment is rejected while the currently working deployment remains available.

---

# 25. Hardest Part of the Assignment

The most challenging part of this project was implementing the Blue/Green deployment.

The difficulty was not simply starting two Docker containers. The deployment required several components to work together correctly, including Docker networks, Nginx reverse proxying, health checks, Jenkins environment variables, Docker image versions, container lifecycle management, and traffic switching.

One of the most important concepts I learned was the difference between an application simply running and an application being safe to deploy.

A new version should not immediately replace the currently working version. Instead, the new version is started alongside the existing deployment and tested independently.

Only after its health check succeeds does the gateway switch production traffic to it.

The failure scenario made this concept especially clear.

When the new GREEN version intentionally returned an HTTP 500 response from `/health`, Jenkins detected the failure and removed the GREEN containers and network.

The BLUE deployment remained active and continued serving the application through the same fixed URL.

This helped me understand why Blue/Green deployment is useful in real CI/CD environments: a broken release does not need to replace a healthy production application.

---

# 26. CI/CD Flow Summary

The complete project flow can be summarized as:

```text
Developer
   |
   v
Git Push
   |
   v
GitHub
   |
   v
Jenkins Multibranch Pipeline
   |
   +-------------------------+
   |                         |
   v                         v
 DEV                       MAIN
   |                         |
   v                         v
Tests                     Tests
   |                         |
   v                         v
Coverage                  Coverage
   |                         |
   v                         v
Build Images              Build Images
   |                         |
   v                         v
Integration               Integration
   |                         |
   X                         v
No Deploy               Blue/Green
                           |
                           v
                     Health Check
                        /     \
                       /       \
                    PASS       FAIL
                     |           |
                     v           v
                   Switch      Reject
                   Traffic     Version
                     |           |
                     v           v
                  New Live    Old Stays Live
```

---

# 27. Submission Evidence

The project submission includes:

- GitHub repository containing all source code
- Jenkinsfile
- Dockerfiles for both services
- Docker Compose configuration
- Blue/Green deployment script
- Automated API tests
- Coverage configuration
- Nginx configuration
- README documentation
- Screenshot of a successful Jenkins build
- Screenshot of a failed Jenkins build
- Screenshot proving the previous deployment remained available after a failed release
- Evidence of separate `main` and `dev` Jenkins build histories

---

# 28. Author

**Tomer Krivizki**

Continuous Integration with Jenkins  
Final Practical Assignment
