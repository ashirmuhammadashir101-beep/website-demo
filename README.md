# AMA Contest Platform

This project is a minimal legal paid quiz/contest platform. It includes:

- User registration and login
- Contest questions and answer submission
- Entry fee payment recording (Opay placeholder)
- Admin panel endpoints for withdrawals and analytics
- Static frontend pages for demo usage

## Setup

1. Copy `.env.example` to `.env`.
2. Install dependencies:

```bash
npm install
```

3. Initialize the database:

```bash
npm run init-db
```

4. Start the server:

```bash
npm start
```

5. Open `http://localhost:3000` in your browser.

## Notes

- Payment flows are placeholders. Replace with your Opay integration.
- The platform is built as a skill-based paid quiz with a transparent prize.
- Do not use this code for illegal or fraudulent schemes.
