# Contributing to PayPilot AI

Thank you for your interest in contributing to **PayPilot AI**! This project was built for the Global PayPal AI Hackathon to demonstrate autonomous financial operations powered by the PayPal Developer Platform and AI agents.

## Code of Conduct
We are committed to providing a welcoming, inclusive, and harassment-free environment for all participants.

## Development Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/paypilot-ai.git
   cd paypilot-ai
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Initialize database:
   ```bash
   npx prisma generate
   npx prisma db push
   node prisma/seed.js
   ```
4. Run tests:
   ```bash
   npm test
   ```
5. Start development server:
   ```bash
   npm run dev
   ```

## Pull Request Guidelines
- Ensure all tests pass (`npm test`).
- Maintain TypeScript strictness without `any` regressions where possible.
- Never commit live production credentials, API secrets, or private tokens.
