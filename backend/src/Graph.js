// Graph.js
const Node = require("./Node");

class Graph {
  constructor() {
    this.nodes = {};
  }

  addNode(name) {
    if (!this.nodes[name]) {
      this.nodes[name] = new Node(name);
    }
  }

  addEdge(node1, node2, weight) {
    this.addNode(node1);
    this.addNode(node2);
    this.nodes[node1].addEdge(this.nodes[node2], weight);
    this.nodes[node2].addEdge(this.nodes[node1], weight); // Undirected graph
  }
}

module.exports = Graph;
