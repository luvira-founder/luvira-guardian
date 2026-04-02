
Secure AI Incident Response Agent powered by Auth0 Token Vault.

## Overview
Luvira Guardian is a secure AI action system that helps users coordinate incident-response workflows across tools like GitLab, Slack, and Google Calendar using delegated authorization through Auth0 Token Vault.

The system is designed around:
- Zero-Local-Secrets architecture
- visible Permission Contracts
- structured audit logging
- high-risk action protection
- safe failure handling

## Repository Structure
- `/backend` – backend services and orchestration logic
- `/frontend` – frontend console and user interface
- `/docs` – supporting architecture and implementation notes

## Core Features
- Auth0 authentication
- delegated token access with Token Vault
- preflight validation
- user-approved workflow execution
- partial success and graceful failure handling
- audit trail and reconnect flows

## Tech Stack
- Backend: FastAPI / Python
- Frontend: Next.js / React / TypeScript
- Auth: Auth0
- Integrations: GitLab, Slack, Google Calendar

## Status
Work in progress. Initial project structure created for hackathon development.

## Notes
Do not commit real credentials, tokens, or secrets.
Use `.env.example` only.
