// Node.js
class Node {
  constructor(name) {
    this.name = name;
    this.edges = {};
  }

  addEdge(neighbor, weight) {
    this.edges[neighbor.name] = weight;
  }
}

module.exports = Node;
