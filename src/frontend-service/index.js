const express = require('express');
const axios = require('axios');
const redis = require('redis');
const util = require('util');
const cors = require('cors');

const app = express();
const port = 3005;

app.use(express.json());
app.use(cors());

// Redis cache configuration
const redisHost = process.env.REDIS_HOST || 'redis';
const redisClient = redis.createClient(6379, redisHost);
redisClient.set = util.promisify(redisClient.set);
redisClient.get = util.promisify(redisClient.get);
redisClient.del = util.promisify(redisClient.del);

redisClient.on("error", (errorMessage) => {
  console.error(`Redis connection error: ${errorMessage}`);
});

redisClient.on("connect", () => {
  console.log("✅ Front-end server: Redis cache connected successfully");
});

// Catalog service replicas (for load balancing)
const catalogHosts = process.env.CATALOG_HOSTS 
  ? process.env.CATALOG_HOSTS.split(',') 
  : ['catalog-server'];
const orderHosts = process.env.ORDER_HOSTS 
  ? process.env.ORDER_HOSTS.split(',') 
  : ['order-server'];

let catalogIndex = 0;
let orderIndex = 0;

// Round-robin load balancing for catalog service
function getNextCatalogHost() {
  const host = catalogHosts[catalogIndex % catalogHosts.length];
  catalogIndex++;
  return host;
}

// Round-robin load balancing for order service
function getNextOrderHost() {
  const host = orderHosts[orderIndex % orderHosts.length];
  orderIndex++;
  return host;
}

// Cache invalidation endpoint (called by backend replicas)
app.post('/cache/invalidate', async (req, res) => {
  const { keys } = req.body;
  
  if (!keys || !Array.isArray(keys)) {
    return res.status(400).json({ error: 'Invalid keys array' });
  }

  console.log(`🔄 Cache invalidation request received for keys: ${keys.join(', ')}`);
  
  const startTime = Date.now();
  
  try {
    // Delete all specified keys from cache
    for (const key of keys) {
      await redisClient.del(key);
    }
    
    const invalidationTime = Date.now() - startTime;
    console.log(`✅ Cache invalidated successfully in ${invalidationTime}ms`);
    
    res.json({ 
      message: 'Cache invalidated', 
      keys: keys,
      invalidationTime: invalidationTime
    });
  } catch (err) {
    console.error('❌ Cache invalidation failed:', err);
    res.status(500).json({ error: 'Cache invalidation failed' });
  }
});

// Search books by topic (with caching)
app.get('/search/:bookTopic', async (req, res) => {
  const searchBookTopic = req.params.bookTopic.trim();
  const cacheKey = `search:${searchBookTopic}`;
  
  console.log(`🔍 Search request for topic: ${searchBookTopic}`);
  
  const startTime = Date.now();
  
  try {
    // Check cache first
    const cachedData = await redisClient.get(cacheKey);
    
    if (cachedData) {
      const cacheTime = Date.now() - startTime;
      console.log(`✅ Cache HIT for "${searchBookTopic}" (${cacheTime}ms)`);
      return res.json({
        items: JSON.parse(cachedData),
        cached: true,
        responseTime: cacheTime
      });
    }
    
    console.log(`❌ Cache MISS for "${searchBookTopic}"`);
    
    // Forward request to catalog service (with load balancing)
    const catalogHost = getNextCatalogHost();
    console.log(`📡 Forwarding to catalog host: ${catalogHost}`);
    
    const response = await axios.get(`http://${catalogHost}:3000/search/${searchBookTopic}`);
    
    // Cache the result for 1 hour
    await redisClient.set(cacheKey, JSON.stringify(response.data.items), 'EX', 3600);
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ Search completed in ${totalTime}ms (cache updated)`);
    
    res.json({
      items: response.data.items,
      cached: false,
      responseTime: totalTime
    });
    
  } catch (err) {
    console.error('❌ Search error:', err.message);
    res.status(err.response?.status || 500).json({ 
      error: err.response?.data?.error || 'Search failed' 
    });
  }
});

// Get book info by ID (with caching)
app.get('/info/:id', async (req, res) => {
  const itemId = req.params.id;
  const cacheKey = `info:${itemId}`;
  
  console.log(`📖 Info request for book ID: ${itemId}`);
  
  const startTime = Date.now();
  
  try {
    // Check cache first
    const cachedData = await redisClient.get(cacheKey);
    
    if (cachedData) {
      const cacheTime = Date.now() - startTime;
      console.log(`✅ Cache HIT for book ${itemId} (${cacheTime}ms)`);
      return res.json({
        ...JSON.parse(cachedData),
        cached: true,
        responseTime: cacheTime
      });
    }
    
    console.log(`❌ Cache MISS for book ${itemId}`);
    
    // Forward request to catalog service (with load balancing)
    const catalogHost = getNextCatalogHost();
    console.log(`📡 Forwarding to catalog host: ${catalogHost}`);
    
    const response = await axios.get(`http://${catalogHost}:3000/info/${itemId}`);
    
    // Cache the result for 30 minutes
    await redisClient.set(cacheKey, JSON.stringify(response.data), 'EX', 1800);
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ Info request completed in ${totalTime}ms (cache updated)`);
    
    res.json({
      ...response.data,
      cached: false,
      responseTime: totalTime
    });
    
  } catch (err) {
    console.error('❌ Info request error:', err.message);
    res.status(err.response?.status || 500).json({ 
      error: err.response?.data?.error || 'Info request failed' 
    });
  }
});

// Purchase book (no caching, forward to order service)
app.post('/purchase', async (req, res) => {
  const { id, orderCost } = req.body;
  
  console.log(`💰 Purchase request for book ${id} with payment $${orderCost}`);
  
  const startTime = Date.now();
  
  try {
    // Forward to order service (with load balancing)
    const orderHost = getNextOrderHost();
    console.log(`📡 Forwarding to order host: ${orderHost}`);
    
    const response = await axios.post(`http://${orderHost}:3006/purchase`, {
      id,
      orderCost
    });
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ Purchase completed in ${totalTime}ms`);
    
    res.json({
      ...response.data,
      responseTime: totalTime
    });
    
  } catch (err) {
    console.error('❌ Purchase error:', err.message);
    res.status(err.response?.status || 500).json({ 
      error: err.response?.data?.error || 'Purchase failed' 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'frontend',
    cacheConnected: redisClient.connected,
    timestamp: new Date().toISOString()
  });
});

// Get cache statistics
app.get('/cache/stats', async (req, res) => {
  try {
    const info = await util.promisify(redisClient.info).bind(redisClient)();
    res.json({ 
      status: 'connected',
      info: info 
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

// Clear all cache (for testing)
app.post('/cache/clear', async (req, res) => {
  try {
    await util.promisify(redisClient.flushdb).bind(redisClient)();
    console.log('🗑️ Cache cleared');
    res.json({ message: 'Cache cleared successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Front-end server running on port ${port}`);
  console.log(`📊 Load balancing catalog replicas: ${catalogHosts.join(', ')}`);
  console.log(`📊 Load balancing order replicas: ${orderHosts.join(', ')}`);
});
