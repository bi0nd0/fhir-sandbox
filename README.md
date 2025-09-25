# SMART on FHIR Sandbox

A lightweight SMART on FHIR R4 sandbox built with Node.js, TypeScript, and Hono. The API serves static FHIR payloads stored in `data/r4/<patientId>` folders, making it easy to prototype SMART on FHIR integrations locally.

## Getting Started

```bash
npm install
npm run dev:server    # Start the Hono API (defaults to http://localhost:3000)
npm run dev           # Optional: start the Vite client placeholder on http://localhost:5173
```

### Build & Test

```bash
npm run build         # Type-check + build server and client bundles
npm run lint          # ESLint + Prettier checks
npm test              # Vitest API coverage
```

## API Overview

All endpoints are namespaced under `/r4`:

- `GET /r4/Patient/:id` – fetch a single patient resource.
- `GET /r4/Observation?patient=<id>&category=<vital-signs|laboratory|social-history>` – retrieve category-scoped observations. The `patient` parameter accepts either `<id>` or `Patient/<id>` formats and the `category` parameter is required.
- `GET /r4/AllergyIntolerance?patient=<id>` – list allergy intolerances for a patient (accepts `<id>` or `Patient/<id>` formats).
- `GET /r4/MedicationRequest?patient=<id>` – list medication requests for a patient (accepts `<id>` or `Patient/<id>` formats).

Responses are served with the `application/fhir+json` content type and return OperationOutcome payloads on validation or data errors.

## Data Layout

Static payloads live in `data/r4/<patientId>`; for example, patient `123456` includes:

```
patient.json
observation.vital-signs.json
observation.laboratory.json
observation.social-history.json
allergyintolerance.json
medicationrequest.json
```

Add new patients or resource types by dropping additional JSON files in the same structure.
