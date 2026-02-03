# Architecture Overview

This project has a small, clear flow from the website to pass generation and deployment.

## Pieces

- Frontend (`src/`): The web UI that collects event details and lets you preview a pass.
- Backend (`api/`, `functions/`): Server endpoints that take those details and build the final Apple Wallet pass file.
- Deployment (Vercel): Hosts the frontend and runs the backend functions in production.
- Future templates (Supabase): A planned place to store reusable pass templates and recipient lists.

## How It Fits Together

1. A user opens the site (frontend) and fills in event details.
2. The frontend sends the details to a backend endpoint.
3. The backend builds the pass package and returns it to the browser.
4. Vercel runs both the frontend and the backend functions in production.
5. In the future, Supabase will store templates and recipients so the frontend can load saved events and personalize passes.
