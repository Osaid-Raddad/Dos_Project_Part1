const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const database = new sqlite3.Database(path.join(__dirname, 'database.db'));
const axios = require("axios")
const cors = require("cors")
const redis = require('redis');
const util = require("util")

const redisHost = process.env.REDIS_HOST || 'redis';
const redisClient = redis.createClient(6379, redisHost);
redisClient.set = util.promisify(redisClient.set);
redisClient.get = util.promisify(redisClient.get);
redisClient.del = util.promisify(redisClient.del);

redisClient.on("error", (errorMessage) => {
  console.error(`Redis connection error: ${errorMessage}`);
  console.warn('⚠️ Redis not available yet, will retry automatically...');
  // Don't exit - let it retry automatically
});

redisClient.on("connect", () => {
  console.log("✅ Redis connected successfully");
});

// Front-end server configuration for cache invalidation
const frontendHost = process.env.FRONTEND_HOST || 'frontend';
const frontendPort = process.env.FRONTEND_PORT || 3005;

// Replica synchronization configuration
const isWriteMaster = process.env.WRITE_MASTER === 'true';
const replicaHost = process.env.REPLICA_HOST || null;

console.log(`🔧 Catalog service mode: ${isWriteMaster ? 'WRITE MASTER' : 'READ REPLICA'}`);
if (replicaHost) {
  console.log(`🔧 Replica host: ${replicaHost}`);
}

// Function to send cache invalidation request to front-end server
async function invalidateFrontendCache(keys) {
  try {
    console.log(`📤 Sending cache invalidation to front-end for keys: ${keys.join(', ')}`);
    const response = await axios.post(`http://${frontendHost}:${frontendPort}/cache/invalidate`, {
      keys: keys
    });
    console.log(`✅ Front-end cache invalidated successfully`);
    return response.data;
  } catch (err) {
    console.error(`❌ Failed to invalidate front-end cache: ${err.message}`);
    // Continue even if cache invalidation fails
    return null;
  }
}

// Function to synchronize write to replica
async function syncWriteToReplica(bookId, newStock) {
  if (!replicaHost) {
    return; // No replica configured
  }
  
  try {
    console.log(`🔄 Syncing write to replica: book ${bookId}, new stock: ${newStock}`);
    await axios.post(`http://${replicaHost}:3000/sync-write`, {
      bookId: bookId,
      numberOfItems: newStock
    });
    console.log(`✅ Replica synchronized successfully`);
  } catch (err) {
    console.error(`❌ Failed to sync to replica: ${err.message}`);
  }
}

const application = express();
const serverPort = 3000;

application.use(express.json());
application.use(cors())

let calculatedOrderPrice = 0;
let previousNumberOfItems;
let updateTestResult;
let wasOrderSuccessful;
let orderResultMessage;

// Sync write endpoint (called by write master to update replicas)
application.post("/sync-write", (request, response) => {
  const { bookId, numberOfItems } = request.body;
  
  console.log(`🔄 Received sync request for book ${bookId}, new stock: ${numberOfItems}`);
  
  database.run(
    `UPDATE items SET numberOfItems = ? WHERE id = ?`,
    [numberOfItems, bookId],
    function (errorOnUpdate) {
      if (errorOnUpdate) {
        console.error('Sync write failed:', errorOnUpdate.message);
        return response.status(500).json({error: "Sync failed"});
      }
      
      console.log(`✅ Replica updated: book ${bookId}, stock: ${numberOfItems}`);
      response.json({message: "Replica synchronized"});
    }
  );
});

application.post("/order",(request, response) => {
  // Only write master can process orders
  if (!isWriteMaster) {
    return response.status(403).json({error: "This replica is read-only. Orders must go through write master."});
  }
  
  const incomingOrder = request.body
  const bookSearchId = request.body.id
  const customerOrderCost = request.body.orderCost
  
  database.all(`SELECT * FROM items WHERE id = ?`, [bookSearchId], (errorOnSelect, selectedRows) => {
    if (errorOnSelect) {
      console.error(errorOnSelect.message);
      return response.status(500).json({error: "Database error"});
    }
    
    // Book not found
    if (!selectedRows || selectedRows.length === 0) {
      return response.status(404).json({error: "Book not found"});
    }
    
    const book = selectedRows[0];
    calculatedOrderPrice = book.bookCost;
    previousNumberOfItems = book.numberOfItems;
    
    console.log('Book Cost:', calculatedOrderPrice);
    console.log('Customer Payment:', customerOrderCost);
    console.log('Current Stock:', previousNumberOfItems);
    
    // Check if out of stock (MUST be > 0 to purchase)
    if (previousNumberOfItems <= 0) {
      return response.status(400).json({error: "Book is out of stock"});
    }
    
    // Check if payment is sufficient
    if (customerOrderCost < calculatedOrderPrice) {
      return response.status(400).json({
        error: `you should pay ${calculatedOrderPrice}$ but you paid ${customerOrderCost}$`
      });
    }
    
    // Stock is available (> 0) and payment is sufficient - proceed with purchase
    let updatedNumberOfItems = previousNumberOfItems - 1;
    
    // IMPORTANT: Invalidate cache BEFORE database write (server-push technique)
    const keysToInvalidate = [
      `${bookSearchId}`,        // Invalidate local Redis cache key (book ID)
      `info:${bookSearchId}`,   // Invalidate front-end cache for info endpoint
      book.bookTopic            // Invalidate topic search cache
    ];
    
    // Send invalidation request to front-end server
    invalidateFrontendCache([`info:${bookSearchId}`, `search:${book.bookTopic}`])
      .catch(err => console.error('Cache invalidation error:', err));
    
    // Also invalidate local catalog service cache
    redisClient.del(`${bookSearchId}`).catch(err => {
      console.error('Local cache invalidation failed:', err);
    });
    
    database.run(
      `UPDATE items SET numberOfItems = ? WHERE id = ?`,
      [updatedNumberOfItems, bookSearchId],
      function (errorOnUpdate) {
        if (errorOnUpdate) {
          console.error('Error updating record:', errorOnUpdate.message);
          return response.status(500).json({error: "Failed to update inventory"});
        }
        
        console.log(`✅ Successfully purchased book ID ${bookSearchId}. Stock: ${previousNumberOfItems} -> ${updatedNumberOfItems}`);
        
        // Synchronize write to replica
        syncWriteToReplica(bookSearchId, updatedNumberOfItems)
          .catch(err => console.error('Replica sync error:', err));
        
        // Return success response
        response.json({message: "Book has been purchased"});
      }
    );
  });
});



database.serialize(() => {
  database.run(
    `CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY ,  
    bookTopic TEXT,
    numberOfItems INTEGER ,
    bookCost INTEGER,  
    bookTitle TEXT
  )`,
    (err) => {
      if (err) {
        console.error('Error creating table:', err);
        return;
      }
      
      // Check if table is empty and seed with initial data
      database.get('SELECT COUNT(*) as count FROM items', (err, row) => {
        if (err) {
          console.error('Error checking table:', err);
          return;
        }
        
        if (row.count === 0) {
          console.log('Seeding database with initial data...');
          const sampleBooks = [
            { id: 1, bookTopic: 'fiction', numberOfItems: 10, bookCost: 15, bookTitle: 'The Great Adventure' },
            { id: 2, bookTopic: 'fiction', numberOfItems: 8, bookCost: 20, bookTitle: 'Mystery of the Lost City' },
            { id: 3, bookTopic: 'science', numberOfItems: 12, bookCost: 25, bookTitle: 'Introduction to Physics' },
            { id: 4, bookTopic: 'science', numberOfItems: 5, bookCost: 30, bookTitle: 'Advanced Chemistry' },
            { id: 5, bookTopic: 'history', numberOfItems: 7, bookCost: 18, bookTitle: 'World War Chronicles' },
            { id: 6, bookTopic: 'history', numberOfItems: 15, bookCost: 22, bookTitle: 'Ancient Civilizations' },
            { id: 7, bookTopic: 'programming', numberOfItems: 20, bookCost: 35, bookTitle: 'JavaScript Mastery' },
            { id: 8, bookTopic: 'programming', numberOfItems: 10, bookCost: 40, bookTitle: 'Node.js Complete Guide' },
            { id: 9, bookTopic: 'education', numberOfItems: 15, bookCost: 28, bookTitle: 'How to finish Project 3 on time' },
            { id: 10, bookTopic: 'education', numberOfItems: 12, bookCost: 32, bookTitle: 'Why theory classes are so hard' },
            { id: 11, bookTopic: 'nature', numberOfItems: 18, bookCost: 24, bookTitle: 'Spring in the Pioneer Valley' }
          ];
          
          const insertStmt = database.prepare(
            'INSERT INTO items (id, bookTopic, numberOfItems, bookCost, bookTitle) VALUES (?, ?, ?, ?, ?)'
          );
          
          sampleBooks.forEach(book => {
            insertStmt.run(book.id, book.bookTopic, book.numberOfItems, book.bookCost, book.bookTitle);
          });
          
          insertStmt.finalize(() => {
            console.log('Database seeded successfully with sample books!');
          });
        } else {
          console.log(`Database already contains ${row.count} items`);
        }
      });
    }
  );
});


application.post('/seed', (request, response) => {
  const sampleBooks = [
    { id: 1, bookTopic: 'fiction', numberOfItems: 10, bookCost: 15, bookTitle: 'The Great Adventure' },
    { id: 2, bookTopic: 'fiction', numberOfItems: 8, bookCost: 20, bookTitle: 'Mystery of the Lost City' },
    { id: 3, bookTopic: 'science', numberOfItems: 12, bookCost: 25, bookTitle: 'Introduction to Physics' },
    { id: 4, bookTopic: 'science', numberOfItems: 5, bookCost: 30, bookTitle: 'Advanced Chemistry' },
    { id: 5, bookTopic: 'history', numberOfItems: 7, bookCost: 18, bookTitle: 'World War Chronicles' },
    { id: 6, bookTopic: 'history', numberOfItems: 15, bookCost: 22, bookTitle: 'Ancient Civilizations' },
    { id: 7, bookTopic: 'programming', numberOfItems: 20, bookCost: 35, bookTitle: 'JavaScript Mastery' },
    { id: 8, bookTopic: 'programming', numberOfItems: 10, bookCost: 40, bookTitle: 'Node.js Complete Guide' },
    { id: 9, bookTopic: 'education', numberOfItems: 15, bookCost: 28, bookTitle: 'How to finish Project 3 on time' },
    { id: 10, bookTopic: 'education', numberOfItems: 12, bookCost: 32, bookTitle: 'Why theory classes are so hard' },
    { id: 11, bookTopic: 'nature', numberOfItems: 18, bookCost: 24, bookTitle: 'Spring in the Pioneer Valley' }
  ];
  
  database.run('DELETE FROM items', (err) => {
    if (err) {
      return response.status(500).json({ error: err.message });
    }
    
    const insertStmt = database.prepare(
      'INSERT INTO items (id, bookTopic, numberOfItems, bookCost, bookTitle) VALUES (?, ?, ?, ?, ?)'
    );
    
    sampleBooks.forEach(book => {
      insertStmt.run(book.id, book.bookTopic, book.numberOfItems, book.bookCost, book.bookTitle);
    });
    
    insertStmt.finalize(() => {
      response.json({ message: 'Database seeded successfully', count: sampleBooks.length });
    });
  });
});

application.get('/search/:bookTopic', async (request, response) => {
  let searchBookTopic = request.params.bookTopic.trim();
  console.log(searchBookTopic);
  
  try {
    const cachedBookData = await redisClient.get(`${searchBookTopic}`);
    console.log(cachedBookData,"---")
    if(cachedBookData){
      // Return cached data wrapped in {items: ...} format
      return response.json({items: JSON.parse(cachedBookData)})
    }
  } catch (err) {
    console.error('Cache read failed:', err);
    return response.status(500).json({ error: 'Cache service unavailable' });
  }
  
  database.serialize(() => {
    database.all(`SELECT * FROM items WHERE bookTopic="${searchBookTopic}"`, async (errorOnSearch, searchResultRows) => {
      if (errorOnSearch) {
        console.log(errorOnSearch);
        return response.status(500).json({ error: 'Database error' });
      }
      
      for (let rowIndex = 0; rowIndex < searchResultRows.length; rowIndex++) {
        console.log(
          searchResultRows[rowIndex].id,
          searchResultRows[rowIndex].numberOfItems,
          searchResultRows[rowIndex].bookCost,
          searchResultRows[rowIndex].bookTopic
        );
      }

      try {
        // Cache the results array (will be wrapped in {items: ...} when returned)
        await redisClient.set(`${searchBookTopic}`, JSON.stringify(searchResultRows));
      } catch (err) {
        console.error('Cache write failed:', err);
        return response.status(500).json({ error: 'Cache service unavailable' });
      }
      
      // Return wrapped in {items: ...} format
      response.json({items: searchResultRows});
    });
  });
});


application.get('/info/:id', async (request, response) => {
  let itemId = request.params.id;
  console.log(itemId);
  
  let cachedItemData = null;
  try {
    cachedItemData = await redisClient.get(`${itemId}`);
  } catch (err) {
    console.error('Cache read failed:', err);
    return response.status(500).json({ error: 'Cache service unavailable' });
  }
  
  database.serialize(() => {
    database.all(`SELECT id,numberOfItems,bookCost FROM items WHERE id=${itemId}`, async (errorOnInfo, infoResultRows) => {
      if (errorOnInfo) {
        console.log(errorOnInfo);
        return response.status(500).json({ error: 'Database error' });
      }
      
      if (!infoResultRows || infoResultRows.length === 0) {
        return response.status(404).json({ error: 'Book not found' });
      }
      
      if(cachedItemData){
        let parsedCachedItem = JSON.parse(cachedItemData)
        console.log(infoResultRows[0].numberOfItems,"--")
        console.log(parsedCachedItem.numberOfItems,"--")
        if(infoResultRows[0].numberOfItems == parsedCachedItem.numberOfItems)
          return response.json(JSON.parse(cachedItemData))
        else{
          try {
            await redisClient.del(`${itemId}`);
          } catch (err) {
            console.error('Cache delete failed:', err);
            return response.status(500).json({ error: 'Cache service unavailable' });
          }
          return response.json({Message:"Invalidate"})
        }
      }
      try {
        await redisClient.set(`${itemId}`, JSON.stringify(infoResultRows[0]));
      } catch (err) {
        console.error('Cache write failed:', err);
        return response.status(500).json({ error: 'Cache service unavailable' });
      }
      console.log(infoResultRows);
      // Return just the book object, not wrapped in {item: ...}
      response.json(infoResultRows[0]);
    });
  });
});
 

application.listen(serverPort, () => {
  console.log(`Server is running on http://localhost:${serverPort}`);
});