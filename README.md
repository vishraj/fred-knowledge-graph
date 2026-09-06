# FRED Intelligence Knowledge Graph

An AI-powered orchestration engine and interactive visualization platform designed to dynamically traverse, synthesize, and visualize macroeconomic relationships using data from the Federal Reserve Economic Data (FRED) API.

## Features

- **Interactive Knowledge Graph:** A responsive, physics-based D3 force-directed graph (`react-force-graph-2d`) that visualizes complex economic relationships in real-time.
- **Enterprise Telemetry HUD:** A sleek, glassmorphism-styled Heads-Up Display that provides deep-dive analytics on selected economic nodes, featuring auto-scaling historical sparklines powered by Recharts.
- **Multi-Agent Orchestration:** Driven by a Python backend using LangChain and Google's Gemini models. Specialized agents (Inflation, Housing, Validation) autonomously fetch and synthesize data to build the graph.
- **Zero-State Onboarding:** A polished, fully responsive onboarding flow that presents users with clickable "prompt cards" to execute complex economic queries with a single click.

## Tech Stack

**Frontend:**
- React (Vite)
- `react-force-graph-2d` for D3 graph rendering
- `recharts` for KPI sparkline generation
- Lucide React for iconography
- Vanilla CSS with modern Glassmorphism aesthetics

**Backend:**
- Python (FastAPI)
- LangChain & `langchain-google-genai`
- FRED API Integration
- Uvicorn

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.9+)
- A valid FRED API Key
- A valid Google Gemini API Key

### 1. Environment Setup

Create a `.env` file in the root directory of your project and add your API keys:

```env
FRED_API_KEY=your_fred_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

*(Note: Do not commit your `.env` file to version control. It should be added to your `.gitignore`.)*

### 2. Backend Setup

Open a terminal and navigate to the project root:

```bash
# Create a virtual environment
python -m venv .venv

# Activate the virtual environment
# On macOS/Linux:
source .venv/bin/activate
# On Windows:
# .venv\Scripts\activate

# Install the Python dependencies
pip install fastapi uvicorn langchain langchain-google-genai python-dotenv httpx
```

Start the backend server:
```bash
python backend/server.py
```
*The API will run on `http://localhost:8001`.*

### 3. Frontend Setup

Open a separate terminal window in the project root:

```bash
# Install the Node dependencies
npm install

# Start the Vite development server
npm run dev
```

The application will be available at `http://localhost:5173` (or the port provided by Vite).
