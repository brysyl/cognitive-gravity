# Cognitive Gravity

Cognitive Gravity is an agentic volumetric synthesizer for a hands-first WebXR productivity space. It materializes abstract thoughts as kinetic 3D nodes, allows pinch-based interaction with tracked hands, and synthesizes collided concepts into higher-order knowledge using Meta Llama.

## Stack
- Frontend: Vite, TypeScript, Three.js, WebXR-ready ECS pattern
- Physics: custom gravity + collision logic tuned for a compact 0.6m workspace
- Backend: FastAPI with WebSocket orchestration
- AI: Meta Llama via HTTP API
- Memory: Supabase pgvector
- Deploy: Vercel + Google Cloud Run

## Local development
1. Copy `.env.example` to `.env` and configure values
2. Python:
   pip install -r requirements.txt
   uvicorn main:app --host 0.0.0.0 --port 8080 --reload
3. Frontend:
   npm install
   npm run dev

## Deployment
- Frontend: GitHub Actions -> Vercel
- Backend: GitHub Actions -> Google Cloud Run
