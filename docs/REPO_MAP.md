# Repo Map

This repository generates Apple Wallet passes for events, with a simple web interface and server logic that builds the pass file you can add to Wallet. The goal is to make it easy to create and distribute event passes without needing to understand the low-level Wallet format.

What lives where (plain-English):

- `src/` is the website you see in the browser. It is the UI for entering event details and previewing the pass.
- `api/` is the server code that the website calls. It accepts form data and returns a finished pass file.
- `functions/` holds deployment-ready server functions used by the hosting platform. These power pass creation in production.

Other notable items:

- `generic.pass/` is a sample pass package used for local testing.
- `README.md` explains how to run the project and what it does at a high level.
