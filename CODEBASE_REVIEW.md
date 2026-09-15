# FRED Knowledge Graph: In-Depth Codebase Review

This document is designed to help you quickly understand the literal code behind the application. It breaks down the key functions and components you might need to explain during your live demo.

---

## 1. The Frontend Layer (`src/App.jsx`)

The React frontend is responsible for triggering the AI agents and rendering the complex D3 physics graph.

### A. Dispatching the Query
When a user clicks a prompt card, the app executes `executeRun(query)`. This sends an HTTP POST to our Python backend, waiting for the AI to build the graph:
```javascript
const response = await fetch('http://localhost:8001/api/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: q,
    model: "claude-3-5-sonnet", // We pass our target model to the backend
  })
});
const result = await response.json();
// The frontend takes the AI's JSON output and saves it to React state
setGraphData({ nodes: result.graph.nodes, links: result.graph.edges });
```

### B. Rendering the Physics Graph
We use `<ForceGraph2D>` to render the nodes. A critical feature here is the **Auto-Framing Engine**. We wait for the physics simulation to stop (`onEngineStop`), and then dynamically calculate the bounding box to zoom the camera so no nodes are ever cut off, regardless of screen size.
```javascript
<ForceGraph2D
  ref={fgRef}
  width={dimensions.width}
  height={dimensions.height}
  graphData={graphData}
  cooldownTicks={100} // Run physics engine for exactly 100 ticks
  onEngineStop={() => {
    if (fgRef.current) {
      // Once physics settle, dynamically zoom camera to fit all nodes with 80px padding
      fgRef.current.zoomToFit(600, 80); 
    }
  }}
/>
```

---

## 2. The Backend Orchestration Engine (`backend/server.py`)

This is the "Brain" of the application built with FastAPI and LangChain. 

### A. The "Universe" of Knowledge
Because this is a Proof-of-Concept, the graph database is completely hardcoded at the top of the Python file. 
```python
NODES = [
  { "id": "cpi", "label": "CPI Inflation", "category": "inflation" },
  { "id": "wages", "label": "Real Wages", "category": "labor" },
  # ... etc
]
```
*(Demo Tip: In production, we would replace this hardcoded list by querying a real Graph Database like Amazon Neptune or Neo4j).*

### B. Step 1: The Orchestrator Agent
The Orchestrator isn't a complex class—it's simply a Python function that formats a string and sends it to the Claude LLM to determine the starting node.
```python
start_prompt = PromptTemplate.from_template(
    "You are an economic orchestrator. Given this user query: '{query}', "
    "and these available nodes: {nodes}. "
    "Reply with ONLY the ID of the node that is the most logical starting point for this analysis. Do not include any other text."
)
# Send the prompt to Claude
start_node_response = llm.invoke(start_prompt.format(query=query, nodes=", ".join(node_ids)))
start_node = extract_text(start_node_response.content) # e.g. returns "cpi"
```

### C. Step 2: Dynamic Graph Traversal (The Workflow)
Once the starting node is picked, the backend manually explores 2 levels deep (Hop 1 and Hop 2) into the `EDGES` list to build a causal chain. It dynamically maps a cool agent name (like "Labor Agent") to the UI audit logs based on the specific node it is currently exploring!
```python
def get_agent_name(node_id):
    mapping = {
        "cpi": "Inflation Agent",
        "wages": "Labor Agent",
        "mortgage_rates": "Monetary Agent",
        "housing_affordability": "Housing Agent",
        "employment": "Labor Agent",
    }
    return mapping.get(node_id, "Macro Agent")

# Hop 1 Logic
agent_1 = get_agent_name(start_node)
hop1_edges = [e for e in EDGES if e["source"] == start_node]
```

### D. Step 3: The Validation & Synthesis Agent
Finally, the script pulls the last 5 data points for those nodes from the offline FRED data JSON, and hands that raw data to Claude to write the final executive summary.
```python
# Pass ONLY the last 5 data points to save context window and ensure we analyze recent trends
for node in discovered_nodes:
    if node in FRED_DATA:
        context_data[node] = FRED_DATA[node][-5:] 

synthesis_prompt = PromptTemplate.from_template(
    "You are a helpful assistant explaining economics to a general audience. "
    "The user asked: '{query}'. "
    "Here is the actual recent historical time-series data for these metrics: {data}. "
    "Write a concise summary answering the user's question... "
    "Limit your entire response to exactly 5 or 6 short sentences."
)
final_insight_response = llm.invoke(synthesis_prompt.format(query=query, data=json.dumps(context_data)))
```

---

## 3. The Data Layer (`public/data/fred_data.json`)
To ensure the demo never crashes or gets rate-limited by the government FRED API, we use a local JSON file that acts as an offline cache. The file contains monthly and quarterly time-series arrays for 5 major metrics:
1. `cpi`
2. `wages`
3. `mortgage_rates`
4. `price_changes`
5. `employment`

Because the app is reading from this file in real-time, the sparklines in the UI and the Insights written by the AI are completely accurate and based on real historical data!
