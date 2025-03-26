import Graph from "./src/Graph.js";
import dijkstra from "./src/Dijkstra.js";

let graph = new Graph();
graph.addEdge("9", "10", 17);
graph.addEdge("9", "11", 23);
graph.addEdge("9", "12", 22);
graph.addEdge("13", "14", 400);
graph.addEdge("11", "10", 24);
graph.addEdge("12", "10", 18);
graph.addEdge("14", "16", 18);
graph.addEdge("14", "15", 28);
graph.addEdge("10", "13", 0);


console.log(dijkstra(graph, "9", "14"));