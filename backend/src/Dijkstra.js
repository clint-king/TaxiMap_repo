// Dijkstra.js
const PriorityQueue = require("./PriorityQueue");

function dijkstra(graph, start, destination) {
  let distances = {};
  let previous = {};
  let pq = new PriorityQueue();

  for (let node in graph.nodes) {
    distances[node] = node === start ? 0 : Infinity;
    pq.enqueue(node, distances[node]);
    previous[node] = null;
  }

  while (!pq.isEmpty()) {
    let currentNode = pq.dequeue();
    if (currentNode === destination) break;

    for (let neighbor in graph.nodes[currentNode].edges) {
      let newDist = distances[currentNode] + graph.nodes[currentNode].edges[neighbor];
      if (newDist < distances[neighbor]) {
        distances[neighbor] = newDist;
        previous[neighbor] = currentNode;
        pq.enqueue(neighbor, newDist);
      }
    }
  }

  let path = [];
  let step = destination;
  while (step) {
    path.unshift(step);
    step = previous[step];
  }

  return { distance: distances[destination], path };
}

module.exports = dijkstra;
