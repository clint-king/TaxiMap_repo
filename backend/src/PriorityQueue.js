// PriorityQueue.js
class PriorityQueue {
    constructor() {
      this.queue = [];
    }
  
    enqueue(node, priority) {
      this.queue = this.queue.filter(item => item.node !== node); // Remove any existing instance
      this.queue.push({ node, priority });
      this.queue.sort((a, b) => a.priority - b.priority); // Ensure min priority is always first
  }
  
  
    dequeue() {
      return this.queue.shift().node;
    }
  
    isEmpty() {
      return this.queue.length === 0;
    }
  }
  
  export default  PriorityQueue;
  