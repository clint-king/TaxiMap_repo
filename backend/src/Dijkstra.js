// Dijkstra.js
import PriorityQueue from "./PriorityQueue.js";

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
      
      // If we dequeue a node that is still at Infinity distance, it means there is no path
      if (distances[currentNode] === Infinity) break;

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

  // Construct path from destination to start
  let path = [];
  let step = destination;

  while (step !== null) {  // Fixes incorrect stopping condition
      path.unshift(step);
      step = previous[step];
  }

  // If destination is still at Infinity distance, no path exists
  if (distances[destination] === Infinity) {
      return { distance: Infinity, path: [] };
  }

  return { distance: distances[destination], path };
}

export default dijkstra;
