// simulationEngine.js
// This file now connects to our real Python FastAPI backend which runs the LangChain/LLM logic

export async function simulateQuery(query, config = {}) {
  try {
    const payload = { 
      query,
      model: config.model || "gemini-3.6-flash",
      temperature: config.temperature ?? 0.0,
      top_p: config.top_p ?? 1.0,
      top_k: config.top_k ?? 40
    };
    
    const response = await fetch('http://localhost:8001/api/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
    
  } catch (error) {
    console.error("Error communicating with the backend:", error);
    return {
      log: [
        { agent: 'System', action: 'Error', detail: 'Failed to connect to the backend server. Is FastAPI running?' }
      ],
      graph: { nodes: [], edges: [] },
      finalInsight: "Error: Could not complete analysis due to backend connection failure."
    };
  }
}
