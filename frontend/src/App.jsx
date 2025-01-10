import React, { useState } from 'react';
import ReactFlow, { Background, Controls, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';
import './index.css';
import dagre from 'dagre';

// Set up the graph layout using Dagre
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes, edges, rankdir) => {
  dagreGraph.setGraph({
    rankdir: rankdir,  // Dynamic layout direction
    nodesep: 50,       // Distance between nodes
    edgesep: 10,       // Distance between edges
    ranksep: 100,      // Distance between horizontal ranks (sibling nodes)
  });

  // Add nodes
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 180, height: 80 });
  });

  // Add edges
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Apply the layout
  dagre.layout(dagreGraph);

  // Set node positions based on layout
  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.position = { x: nodeWithPosition.x, y: nodeWithPosition.y };
  });

  return { nodes, edges };
};

function App() {
  const [projectPath, setProjectPath] = useState('');
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [layout, setLayout] = useState('TB');  // Default layout (Top to Bottom)

  const getDirectoryTree = async () => {
    const response = await fetch('http://localhost:5001/get-directory-tree', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath }),
    });

    const result = await response.json();
    const { nodes, edges } = convertToFlowFormat(result);

    const layoutedElements = getLayoutedElements(nodes, edges, layout);
    setNodes(layoutedElements.nodes);
    setEdges(layoutedElements.edges);
  };

  const convertToFlowFormat = (tree) => {
    const nodes = [];
    const edges = [];

    const addNode = (id, label, type, parentId = null) => {
      nodes.push({
        id,
        data: { label },
        position: { x: 0, y: 0 },
        type,
      });

      if (parentId) {
        const edgeColor = parentId === 'root' ? 'blue' : 'green'; // Color for root-parent or normal parent-child
        edges.push({
          id: `${parentId}-${id}`,
          source: parentId,
          target: id,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: edgeColor, strokeWidth: 2 }, // Apply edge color
        });
      }
    };

    const rootNode = tree.label;
    addNode(rootNode, rootNode, 'root');

    const processTree = (node, parentId) => {
      if (node.children) {
        node.children.forEach((child, index) => {
          const nodeId = `${parentId}-${child.label}`;
          addNode(nodeId, child.label, 'file', parentId);

          // Check for sibling edges and color them differently
          if (index > 0) {
            const siblingId = `${parentId}-${node.children[index - 1].label}`;
            edges.push({
              id: `${siblingId}-${nodeId}`,
              source: siblingId,
              target: nodeId,
              markerEnd: { type: MarkerType.ArrowClosed },
              style: { stroke: 'red', strokeWidth: 2 }, // Color for sibling edge
            });
          }

          if (child.children) {
            processTree(child, nodeId);
          }
        });
      }
    };

    processTree(tree, rootNode);

    return { nodes, edges };
  };

  const changeLayout = (newLayout) => {
    setLayout(newLayout);
    const layoutedElements = getLayoutedElements(nodes, edges, newLayout);
    setNodes(layoutedElements.nodes);
    setEdges(layoutedElements.edges);
  };

  return (
    <div className="App">
      <h1>Node.js Project Manager</h1>
      <input
        type="text"
        placeholder="Enter project path"
        value={projectPath}
        onChange={(e) => setProjectPath(e.target.value)}
      />
      <button onClick={getDirectoryTree}>Get Directory Diagram</button>

      <div>
        <button 
          onClick={() => changeLayout('TB')} 
          className={layout === 'TB' ? 'active' : ''}
        >
          Top to Bottom
        </button>
        <button 
          onClick={() => changeLayout('BT')} 
          className={layout === 'BT' ? 'active' : ''}
        >
          Bottom to Top
        </button>
        <button 
          onClick={() => changeLayout('LR')} 
          className={layout === 'LR' ? 'active' : ''}
        >
          Left to Right
        </button>
        <button 
          onClick={() => changeLayout('RL')} 
          className={layout === 'RL' ? 'active' : ''}
        >
          Right to Left
        </button>
      </div>

      {/* Explanation Card for Edges */}
      <div className="card">
        <h3>Edge Types Explanation</h3>
        <ul>
          <li><strong>Parent-Child Edge:</strong> This edge represents a hierarchical relationship where one node is a parent of another. Represented with <strong style ={{color: "#0b750b"}}>green</strong></li>
          <li><strong>Sibling Edge:</strong> This edge connects nodes that are on the same level of hierarchy (i.e., sibling nodes).Represented with <strong style ={{color: "#f00000"}}>red</strong></li>
        </ul>
      </div>

      <div style={{ height: '600px', width: '100%' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          draggable
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}

export default App;
