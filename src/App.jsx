import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Activity, Brain, CheckCircle2, ChevronRight, Server, Database, Zap, Clock, TrendingUp, Users, Building2, RotateCcw } from 'lucide-react';
import ForceGraph2D from 'react-force-graph-2d';
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from 'recharts';
import { simulateQuery } from './simulationEngine';
import './index.css';

// Initial empty state for the graph
const initialGraphData = { nodes: [], links: [] };

function App() {
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState([]);
  const [graphData, setGraphData] = useState(initialGraphData);
  const [finalInsight, setFinalInsight] = useState(null);
  const [metrics, setMetrics] = useState({});
  const [telemetry, setTelemetry] = useState({ nodes: 0, time: 0, confidence: "N/A" });
  const [selectedNode, setSelectedNode] = useState(null);

  const [config, setConfig] = useState({
    model: 'global.anthropic.claude-sonnet-4-6',
    temperature: 0.0,
    top_p: 1.0,
    top_k: 40
  });

  const fgRef = useRef();
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Helper to get an icon based on the agent name
  const getAgentIcon = (agent) => {
    switch (agent) {
      case 'Orchestrator': return <Brain size={16} />;
      case 'Inflation Agent': return <Activity size={16} />;
      case 'Housing Agent': return <Activity size={16} />;
      case 'Validation Agent': return <CheckCircle2 size={16} />;
      default: return <ChevronRight size={16} />;
    }
  };


  // Allow clicking a suggestion to run it immediately
  const handleSuggestedQuery = (suggestedText) => {
    setQuery(suggestedText);
    // We cannot just call handleSubmit because it uses event.preventDefault() and reads from state which might not be updated synchronously.
    // Instead we construct a synthetic event or just call a shared executeQuery function.
    // To keep it simple, we wrap the execution logic:
    const fakeEvent = { preventDefault: () => { } };
    // Wait a tick for React to batch setQuery, though we don't strictly need it if we pass text directly to the API, but our handleSubmit uses state `query`.
    // Let's just refactor to pass the query string directly.
    executeRun(suggestedText);
  };

  const executeRun = async (qText) => {
    if (!qText.trim() || isProcessing) return;

    setIsProcessing(true);
    setLogs([]);
    setGraphData(initialGraphData);
    setFinalInsight(null);
    setMetrics({});
    setSelectedNode(null);

    const startTime = performance.now();

    // Call our simulation engine and pass the config
    const result = await simulateQuery(qText, config);

    for (let i = 0; i < result.log.length; i++) {
      await new Promise(r => setTimeout(r, 800)); // 800ms delay per log for visual effect
      setLogs(prev => [...prev, result.log[i]]);

      if (result.log[i].action === 'Relationship Discovered') {
        setGraphData({
          nodes: result.graph.nodes,
          links: result.graph.edges.slice(0, i)
        });
      }
    }

    const endTime = performance.now();

    setGraphData({ nodes: result.graph.nodes, links: result.graph.edges });
    setMetrics(result.metrics || {});
    setFinalInsight(result.finalInsight);
    setTelemetry({
      nodes: result.graph.nodes.length,
      time: ((endTime - startTime) / 1000).toFixed(1),
      confidence: "94%"
    });
    setIsProcessing(false);

    setTimeout(() => {
      if (fgRef.current) {
        // Configure D3 forces to spread the graph out to fill the screen
        fgRef.current.d3Force('charge').strength(-600);
        fgRef.current.d3Force('link').distance(180);
        
        fgRef.current.d3ReheatSimulation();
        // Removed hardcoded zoom and center - now handled dynamically by zoomToFit
      }
    }, 500);
  }

  const handleReset = () => {
    setQuery('');
    setLogs([]);
    setGraphData(initialGraphData);
    setFinalInsight(null);
    setMetrics({});
    setSelectedNode(null);
    setTelemetry({ nodes: 0, time: 0, confidence: "N/A" });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    executeRun(query);
  };

  // Node rendering customization for the Force Graph
  const paintNode = useCallback((node, ctx, globalScale) => {
    const label = node.label;
    const fontSize = 16 / globalScale;
    ctx.font = `600 ${fontSize}px Inter, sans-serif`;

    // Draw Node Circle
    ctx.beginPath();
    // highlight selected node by making it slightly larger and adding a thick border
    const radius = node.id === selectedNode ? 20 : 14;
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = node.id === 'cpi' ? '#ef4444' : '#3b82f6'; // Red for CPI, blue for rest
    ctx.fill();
    ctx.strokeStyle = node.id === selectedNode ? '#fde047' : '#ffffff';
    ctx.lineWidth = (node.id === selectedNode ? 4 : 2) / globalScale;
    ctx.stroke();

    // Draw Label
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#f8fafc';
    // Position label dynamically below the node
    ctx.fillText(label, node.x, node.y + radius + (4 / globalScale));
  }, [selectedNode]);

  // Format data for Recharts
  const formatChartData = (dataArray) => {
    if (!dataArray) return [];
    return dataArray.map((item) => ({
      date: item.date,
      value: parseFloat(item.value || 0)
    }));
  };

  return (
    <div className="app-container">
      {/* Sidebar / Agent Activity Panel */}
      <aside className="sidebar">
        {/* Configuration Section */}
        <div style={{ marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1rem', color: '#f8fafc', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Model Configuration
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Model Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Model</label>
              <select
                value={config.model}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-color)',
                  padding: '0.5rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.875rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="gemini-3.6-flash">Google Gemini 3.6 Flash</option>
                <option value="global.anthropic.claude-sonnet-4-6">Anthropic Claude 4.6 Sonnet</option>
                <option value="anthropic.claude-4-5-opus">Anthropic Claude 4.5 Opus</option>
              </select>
            </div>

            {/* Temperature Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Temperature</span>
                <span>{config.temperature}</span>
              </label>
              <input
                type="range" min="0" max="1" step="0.1"
                value={config.temperature}
                onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                style={{ cursor: 'pointer' }}
              />
            </div>

            {/* Top P Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Top P</span>
                <span>{config.top_p}</span>
              </label>
              <input
                type="range" min="0" max="1" step="0.05"
                value={config.top_p}
                onChange={(e) => setConfig({ ...config, top_p: parseFloat(e.target.value) })}
                style={{ cursor: 'pointer' }}
              />
            </div>

            {/* Top K Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Top K</span>
                <span>{config.top_k}</span>
              </label>
              <input
                type="range" min="1" max="100" step="1"
                value={config.top_k}
                onChange={(e) => setConfig({ ...config, top_k: parseInt(e.target.value) })}
                style={{ cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>

        <h2 style={{ fontSize: '1rem', color: '#f8fafc', marginBottom: '1rem' }}>Agent Audit Trail</h2>
        {logs.length === 0 && !isProcessing && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            System idle. Enter a query to deploy research agents.
          </p>
        )}

        {logs.map((log, idx) => (
          <div key={idx} className="agent-log">
            <div className="agent-log-header">
              {getAgentIcon(log.agent)}
              {log.agent} - {log.action}
            </div>
            <div className="agent-log-body">
              {log.detail}
            </div>
          </div>
        ))}

        {isProcessing && (
          <div style={{ color: 'var(--accent)', fontSize: '0.875rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Activity size={14} className="animate-pulse" /> Agents are analyzing...
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="header">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1><Brain className="text-accent" /> Federal Reserve Economic Data (FRED) Intelligence</h1>

            {/* System Telemetry Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <button 
                onClick={handleReset}
                title="Reset Dashboard"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '9999px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'var(--text-main)' }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'var(--border-color)' }}
              >
                <RotateCcw size={14} /> Start Over
              </button>
              
              <div className="telemetry-bar">
                <div className="telemetry-item">
                <Database size={14} /> Total Corpus Nodes: 2.4M
              </div>
              <div className="telemetry-item">
                <Server size={14} /> Active Subgraph: {telemetry.nodes || 0}
              </div>
              <div className="telemetry-item">
                <Clock size={14} /> Latency: {telemetry.time > 0 ? telemetry.time + 's' : '0.0s'}
              </div>
              <div className="telemetry-item" style={{ color: telemetry.confidence === 'N/A' ? 'var(--text-muted)' : 'var(--success)' }}>
                <Zap size={14} /> Confidence: {telemetry.confidence}
              </div>
              </div>
            </div>
          </div>
        </header>

        {/* Knowledge Graph Visualization */}
        <div className="graph-container" ref={containerRef}>
          {logs.length === 0 && !isProcessing && (
            <div className="welcome-overlay">
              <h2>Welcome to FRED Intelligence</h2>
              <p>Select a suggestion below to deploy AI agents to traverse the economic knowledge graph.</p>

              <div className="prompt-cards-container">
                <div className="prompt-card" onClick={() => handleSuggestedQuery("How have recent spikes in CPI inflation impacted current regional housing markets?")}>
                  <div className="prompt-card-icon"><Building2 size={18} /></div>
                  <div className="prompt-card-text">How have recent spikes in CPI inflation impacted current regional housing markets?</div>
                </div>
                <div className="prompt-card" onClick={() => handleSuggestedQuery("Analyze the cascading effects of recent tech sector unemployment trends.")}>
                  <div className="prompt-card-icon"><Users size={18} /></div>
                  <div className="prompt-card-text">Analyze the cascading effects of recent tech sector unemployment trends.</div>
                </div>
                <div className="prompt-card" onClick={() => handleSuggestedQuery("What is the current relationship between federal interest rates and real wage stagnation?")}>
                  <div className="prompt-card-icon"><TrendingUp size={18} /></div>
                  <div className="prompt-card-text">What is the current relationship between federal interest rates and real wage stagnation?</div>
                </div>
                <div className="prompt-card" onClick={() => handleSuggestedQuery("Trace the recent economic chain reaction from consumer price volatility to shifts in national employment.")}>
                  <div className="prompt-card-icon"><Activity size={18} /></div>
                  <div className="prompt-card-text">Trace the recent economic chain reaction from consumer price volatility to shifts in national employment.</div>
                </div>
                <div className="prompt-card" onClick={() => handleSuggestedQuery("How have stagnant nominal wages impacted household purchasing power over the last year?")}>
                  <div className="prompt-card-icon"><Zap size={18} /></div>
                  <div className="prompt-card-text">How have stagnant nominal wages impacted household purchasing power over the last year?</div>
                </div>
              </div>
            </div>
          )}

          <ForceGraph2D
            ref={fgRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            nodeCanvasObject={paintNode}
            onNodeClick={(node) => setSelectedNode(node.id)}
            onBackgroundClick={() => setSelectedNode(null)}
            cooldownTicks={100}
            onEngineStop={() => {
              if (fgRef.current) {
                fgRef.current.zoomToFit(600, 80); // Smoothly zoom to perfectly fit all nodes with 80px padding
              }
            }}
            linkColor={() => 'rgba(255,255,255,0.2)'}
            linkWidth={2}
            linkDirectionalArrowLength={3.5}
            linkDirectionalArrowRelPos={1}
            linkDirectionalParticles={2}
            linkDirectionalParticleSpeed={0.005}
            linkDirectionalParticleWidth={2}
            linkDirectionalParticleColor={() => 'rgba(59, 130, 246, 0.8)'}
            backgroundColor="transparent"
          />

          {/* Right-Side Metrics HUD */}
          {Object.keys(metrics).length > 0 && (
            <div className="metrics-hud">
              <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', color: 'var(--text-muted)' }}>
                Live FRED Data Stream
              </h3>

              {!selectedNode && (
                <div style={{ padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>
                  Click a node in the graph to view its detailed historical telemetry.
                </div>
              )}

              {selectedNode && metrics[selectedNode] && metrics[selectedNode].length > 0 && (() => {
                const dataPoints = metrics[selectedNode];
                const latestObj = dataPoints[dataPoints.length - 1];
                const prevObj = dataPoints[0]; // compare with oldest in window

                // Parse values safely
                const latestValue = parseFloat(latestObj.value || 0);
                const prevValue = parseFloat(prevObj.value || 0);
                const diff = latestValue - prevValue;
                const isPositive = diff >= 0;

                return (
                  <div key={selectedNode} className="metric-card">
                    <div className="metric-header">
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="metric-title">{selectedNode.replace('_', ' ').toUpperCase()}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                          {prevObj.date} to {latestObj.date}
                        </span>
                      </div>
                      <span className="metric-value">{latestValue.toFixed(2)}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Trend (5 periods):</span>
                      <div className="metric-trend" style={{ color: isPositive ? 'var(--success)' : '#ef4444' }}>
                        {isPositive ? '▲' : '▼'} {Math.abs(diff).toFixed(2)} pts
                      </div>
                    </div>

                    <div className="metric-chart">
                      <ResponsiveContainer width="100%" height={40}>
                        <LineChart data={formatChartData(dataPoints)}>
                          <YAxis domain={['auto', 'auto']} hide />
                          <Tooltip
                            contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                            itemStyle={{ color: '#f8fafc' }}
                            labelStyle={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}
                            formatter={(value) => [value, 'Value']}
                            labelFormatter={(label) => `Date: ${label}`}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke={isPositive ? 'var(--success)' : '#ef4444'}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Chat / Query Interface */}
        <div className="chat-panel">

          {finalInsight && (
            <div className="final-insight">
              <h3><CheckCircle2 size={20} /> Synthesized Insight</h3>
              <p>{finalInsight}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="chat-input-wrapper">
            <input
              type="text"
              className="chat-input"
              placeholder="e.g. How does CPI inflation impact regional housing markets?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isProcessing}
            />
            <button type="submit" className="chat-submit" disabled={isProcessing || !query.trim()}>
              <Send size={18} />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default App;
