# Cognitive Gravity

Cognitive Gravity: Agentic Volumetric Synthesizer for Meta VR Start Developer Competition 2026.

## Overview
A hands-first WebXR workspace where abstract thoughts are materialized as kinetic 3D nodes. When nodes collide, the backend synthesizes a higher-order concept with Meta Llama and stores semantic memory in Supabase pgvector.

## Stack
- Frontend: Vite, TypeScript, Three.js, WebXR-appropriate ECS patterns
- Physics: lightweight custom gravity + collision logic
- Backend: FastAPI, WebSockets
- AI: Meta Llama (via HTTP API)
- Storage: Supabase pgvector
- Deployment: Vercel + Google Cloud Run
