# TimeKeeper

A fullstack **Time Tracking SaaS Application** built with Spring Boot (backend) and React (frontend).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Java 21, Spring Boot 3.2.3, Spring Security, JWT |
| Database | H2 (in-memory, auto-seeded on startup) |
| Frontend | React 18, Vite 5, Redux Toolkit 2, Tailwind CSS 3 |
| Build | Maven (backend), npm (frontend) |

---

## Prerequisites

Make sure you have the following installed before running the project:

- **Java 21+** (LTS) — [Download](https://adoptium.net/)
- **Maven 3.8+** — [Download](https://maven.apache.org/download.cgi) *(or use the included `mvnw` wrapper)*
- **Node.js 18+** and **npm** — [Download](https://nodejs.org/)
- **Git** — [Download](https://git-scm.com/)

Verify installations:
```bash
java -version   # should print 21.x or higher
mvn -version
node -version   # should print v18 or higher
npm -version
```

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/adityaZuciTech/TimeKeeper.git
cd TimeKeeper
```

---

### 2. Run the Backend

```bash
cd backend
mvn spring-boot:run
```

- The API server starts on **http://localhost:8080**
- H2 in-memory database is created and **auto-seeded** with demo data on every startup
- H2 console is available at **http://localhost:8080/h2-console**
  - JDBC URL: `jdbc:h2:mem:timekeeperdb`
  - Username: `sa` | Password: *(leave blank)*

> **Note:** The database resets on every restart (in-memory). All data is re-seeded automatically.

---

### 3. Run the Frontend

Open a **new terminal**, then:

```bash
cd frontend
npm install
npm run dev
```

- The app starts on **http://localhost:5173** (or **http://localhost:5174** if 5173 is already in use — Vite picks the next free port automatically)
- API calls are proxied to the backend at `http://localhost:8080` automatically
- The backend CORS policy allows `localhost:5173`, `localhost:5174`, and `localhost:3000`

---

## Demo Login Credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@timekeeper.app` | `Admin123!` |
| Manager | `manager@timekeeper.app` | `Manager123!` |
| Employee | `john@timekeeper.app` | `Employee123!` |

---

## Project Structure

```
TimeKeeper/
├── backend/                  # Spring Boot application
│   ├── src/
│   │   └── main/
│   │       ├── java/com/timekeeper/
│   │       │   ├── config/       # Security, JWT, CORS config
│   │       │   ├── controller/   # REST API controllers
│   │       │   ├── dto/          # Request/Response DTOs
│   │       │   ├── entity/       # JPA entities
│   │       │   ├── repository/   # Spring Data JPA repositories
│   │       │   └── service/      # Business logic
│   │       └── resources/
│   │           └── application.properties
│   └── pom.xml
│
├── frontend/                 # React + Vite application
│   ├── src/
│   │   ├── components/       # Shared UI components (Sidebar, Layout, Modal)
│   │   ├── features/         # Redux slices (auth, employees, departments, etc.)
│   │   ├── pages/            # Page components (Login, Dashboard, Timesheets, etc.)
│   │   ├── services/         # Axios API service files
│   │   └── store/            # Redux store configuration
│   ├── package.json
│   └── vite.config.js
│
└── project-specifications/   # Product specs and API documentation
```

---

## Common Issues

**Port already in use**
- Backend (8080): Kill the process using port 8080 or change `server.port` in `backend/src/main/resources/application.properties`
- Frontend (5173): Vite will automatically try the next available port

**`npm install` fails**
- Ensure you are using Node.js 18 or higher: `node -version`
- Delete `node_modules` and `package-lock.json`, then re-run `npm install`

**Backend fails to start**
- Ensure Java 21+ is installed and `JAVA_HOME` is set correctly
- Run `mvn clean` inside `backend/` and then `mvn spring-boot:run` again

**Login fails / CORS error in browser console**
- Check which port the frontend is running on (Vite prints it on startup)
- If it is not `5173`, `5174`, or `3000`, add the port to `cors.allowed-origins` in `backend/src/main/resources/application.properties` and restart the backend

---

## Available Scripts

### Backend
```bash
mvn spring-boot:run       # Start the development server
mvn clean package         # Build a production JAR
java -jar target/timekeeper-backend-1.0.0.jar  # Run the built JAR
```

### Frontend
```bash
npm run dev       # Start the development server (http://localhost:5173 or next free port)
npm run build     # Build for production (output in dist/)
npm run preview   # Preview the production build locally
```