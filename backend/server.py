import os
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# LangChain imports for LLM Abstraction
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_aws import ChatBedrock
from langchain_core.prompts import PromptTemplate
from langchain_core.messages import HumanMessage, SystemMessage

load_dotenv()

app = FastAPI()

# Allow CORS for our local React app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For dev only, restrict in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the LLM. 
# -------------------------------------------------------------
# TO SWAP TO AWS BEDROCK IN THE FUTURE:
# 1. pip install langchain-aws
# 2. from langchain_aws import ChatBedrock
# 3. llm = ChatBedrock(model_id="anthropic.claude-3-sonnet-20240229-v1:0", client=...)
# -------------------------------------------------------------
llm = ChatGoogleGenerativeAI(model="gemini-3.6-flash", temperature=0)


# Load our mock graph and FRED data from the files we already made
BASE_DIR = os.path.dirname(os.path.dirname(__file__))

# Read graph structure (we'll parse the JS file crudely for the PoC, 
# or just redefine it here to keep things clean and robust for the backend)
NODES = [
  { "id": "cpi", "label": "CPI Inflation", "category": "inflation" },
  { "id": "wages", "label": "Real Wages", "category": "labor" },
  { "id": "housing_affordability", "label": "Housing Affordability", "category": "housing" },
  { "id": "regional_demand", "label": "Regional Demand", "category": "regional" },
  { "id": "price_changes", "label": "Housing Price Changes", "category": "housing" },
  { "id": "mortgage_rates", "label": "Mortgage Rates", "category": "finance" },
  { "id": "employment", "label": "Employment Levels", "category": "labor" }
]

EDGES = [
  { "source": "cpi", "target": "wages", "description": "High CPI directly reduces real wages." },
  { "source": "wages", "target": "housing_affordability", "description": "Lower real wages reduce housing affordability." },
  { "source": "mortgage_rates", "target": "housing_affordability", "description": "Higher rates drastically reduce affordability." },
  { "source": "housing_affordability", "target": "regional_demand", "description": "Affordability shifts drive regional demand changes." },
  { "source": "regional_demand", "target": "price_changes", "description": "Demand fluctuations lead to housing price changes." },
  { "source": "employment", "target": "regional_demand", "description": "Employment levels support regional housing demand." }
]

# Load actual FRED time series data
with open(os.path.join(BASE_DIR, 'public', 'data', 'fred_data.json'), 'r') as f:
    FRED_DATA = json.load(f)


class QueryRequest(BaseModel):
    query: str
    model: str = "gemini-3.6-flash"
    temperature: float = 0.0
    top_p: float = 1.0
    top_k: int = 40

@app.post("/api/query")
async def process_query(req: QueryRequest):
    query = req.query
    
    # Initialize the LLM dynamically per request using the user's config
    if "claude" in req.model:
        llm = ChatBedrock(
            model_id=req.model
        )
    else:
        llm = ChatGoogleGenerativeAI(
            model=req.model, 
            temperature=req.temperature,
            top_p=req.top_p,
            top_k=req.top_k
        )
    
    log = []
    def add_log(agent, action, detail):
        log.append({"agent": agent, "action": action, "detail": detail})

    add_log("Orchestrator", "Query Received", f"Analyzing intent: '{query}'")

    # Helper function to handle different content formats from LangChain
    def extract_text(content):
        if isinstance(content, list):
            if len(content) > 0:
                if isinstance(content[0], dict):
                    return content[0].get("text", str(content))
                return str(content[0])
            return ""
        return str(content)

    # Step 1: Use LLM to determine starting node
    start_prompt = PromptTemplate.from_template(
        "You are an economic orchestrator. Given this user query: '{query}', "
        "and these available nodes: {nodes}. "
        "Reply with ONLY the ID of the node that is the most logical starting point for this analysis. Do not include any other text."
    )
    node_ids = [n["id"] for n in NODES]
    start_node_response = llm.invoke(start_prompt.format(query=query, nodes=", ".join(node_ids)))
    
    start_node_raw = extract_text(start_node_response.content)
    start_node = start_node_raw.strip().replace("'", "").replace('"', '')
    
    if start_node not in node_ids:
        start_node = "cpi" # fallback
        
    add_log("Orchestrator", "Routing", f"Decided to start traversal at node: {start_node}")

    # Step 2: Traverse graph (Simplified multi-hop for the PoC)
    discovered_nodes = {start_node}
    discovered_edges = []
    
    def get_agent_name(node_id):
        mapping = {
            "cpi": "Inflation Agent",
            "wages": "Labor Agent",
            "mortgage_rates": "Monetary Agent",
            "housing_affordability": "Housing Agent",
            "employment": "Labor Agent",
            "price_changes": "Market Agent"
        }
        return mapping.get(node_id, "Macro Agent")

    # Hop 1
    agent_1 = get_agent_name(start_node)
    add_log(agent_1, "Analyzing Graph", f"Finding relationships for {start_node}...")
    hop1_edges = [e for e in EDGES if e["source"] == start_node]
    for e in hop1_edges:
        discovered_edges.append(e)
        discovered_nodes.add(e["target"])
        add_log(agent_1, "Relationship Discovered", f"Found link: {e['source']} -> {e['target']}")
        
    # Hop 2
    if hop1_edges:
        next_node = hop1_edges[0]["target"]
        agent_2 = get_agent_name(next_node)
        add_log(agent_2, "Deep Dive", f"Investigating cascading effects from {next_node}...")
        hop2_edges = [e for e in EDGES if e["source"] == next_node]
        for e in hop2_edges:
            discovered_edges.append(e)
            discovered_nodes.add(e["target"])
            add_log(agent_2, "Relationship Discovered", f"Found link: {e['source']} -> {e['target']}")

    # Step 3: Fetch actual FRED data for discovered nodes
    add_log("Validation Agent", "Data Retrieval", "Extracting real FRED time-series data for discovered nodes to synthesize an insight.")
    
    context_data = {}
    for node in discovered_nodes:
        if node in FRED_DATA:
            # We only pass the last 5 data points to the LLM to save context window size for the fast demo
            context_data[node] = FRED_DATA[node][-5:] 

    # Step 4: Use LLM to synthesize final insight using real data
    synthesis_prompt = PromptTemplate.from_template(
        "You are a helpful assistant explaining economics to a general audience. "
        "The user asked: '{query}'. "
        "Our agents discovered the following causal chain: {edges}. "
        "Here is the actual recent historical time-series data for these metrics: {data}. "
        "Write a concise summary answering the user's question in simple, everyday language that a non-economist can easily understand. Do not use jargon. "
        "Limit your entire response to exactly 5 or 6 short sentences. Never exceed this limit."
    )
    
    final_insight_response = llm.invoke(synthesis_prompt.format(
        query=query, 
        edges=json.dumps(discovered_edges), 
        data=json.dumps(context_data)
    ))
    
    final_insight = extract_text(final_insight_response.content)

    # Format response for React frontend
    return {
        "log": log,
        "graph": {
            "nodes": [n for n in NODES if n["id"] in discovered_nodes],
            "edges": discovered_edges
        },
        "metrics": context_data,
        "finalInsight": final_insight
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
