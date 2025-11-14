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
  console.error('Redis is required for this service. Exiting...');
  process.exit(1);
});

redisClient.on("connect", () => {
  console.log("Redis connected successfully");
});

const application = express();
const serverPort = 3000;

application.use(express.json());
application.use(cors())

let calculatedOrderPrice = 0;
let previousNumberOfItems;
let updateTestResult;
let wasOrderSuccessful;
let orderResultMessage;

application.post("/order",(request, response) => {
  const incomingOrder = request.body
  const bookSearchId = request.body.id
  const customerOrderCost = request.body.orderCost
  
  database.all(`SELECT * FROM items WHERE id = ?`, [bookSearchId], (errorOnSelect, selectedRows) => {
    if (errorOnSelect) {
      console.error(errorOnSelect.message);
      return;
    }
    
    if (!!selectedRows[0]) {
      previousNumberOfItems = selectedRows[0].numberOfItems;
      calculatedOrderPrice = selectedRows[0].bookCost;
      let updatedNumberOfItems = selectedRows[0].numberOfItems - 1;
      console.log(calculatedOrderPrice)
      console.log(customerOrderCost)
      
      if (customerOrderCost >= calculatedOrderPrice) {
        
        const customerRemainingAmount = customerOrderCost - calculatedOrderPrice;
        database.run(
          `UPDATE items SET numberOfItems = ? WHERE id = ?`,
          [updatedNumberOfItems, bookSearchId],
          function (errorOnUpdate) {
            if (errorOnUpdate) {
              console.error('Error updating record:', errorOnUpdate.message);
              return;
            }
            
          }
          
        );
      }
      
      
    } 
    database.all(`SELECT * FROM items WHERE id = ?`, [bookSearchId], (errorOnSecondSelect, updatedSelectedRow) => {
      if (errorOnSecondSelect) {
          console.error(errorOnSecondSelect.message);
          return;
        }
      if(updatedSelectedRow){
        
        if(updatedSelectedRow.length != 0){
          updateTestResult = { numberOfItemsBeforeUpdate: previousNumberOfItems, data: updatedSelectedRow}
          if(previousNumberOfItems === updatedSelectedRow[0].numberOfItems){
            wasOrderSuccessful = false
          }
          else{
            wasOrderSuccessful = true
          
          }
          orderResultMessage = `Bought book ${updatedSelectedRow[0].bookTitle}`
        }
        
        if(wasOrderSuccessful)
          response.send({result:{status:"success", message: orderResultMessage}});
        else
          response.send({result:{status:"fail", message:"Failed to buy The book!!"}})
      }  
      
    })
    
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
            { id: 8, bookTopic: 'programming', numberOfItems: 10, bookCost: 40, bookTitle: 'Node.js Complete Guide' }
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
    { id: 8, bookTopic: 'programming', numberOfItems: 10, bookCost: 40, bookTitle: 'Node.js Complete Guide' }
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
      return response.json(JSON.parse(cachedBookData))
    }
  } catch (err) {
    console.error('Cache read failed:', err);
    return response.status(500).json({ error: 'Cache service unavailable' });
  }
  
  database.serialize(() => {
    database.all(`SELECT * FROM items WHERE bookTopic="${searchBookTopic}"`, async (errorOnSearch, searchResultRows) => {
      if (errorOnSearch) {
        console.log(errorOnSearch);
        return;
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
        await redisClient.set(`${searchBookTopic}`, JSON.stringify(searchResultRows));
      } catch (err) {
        console.error('Cache write failed:', err);
        return response.status(500).json({ error: 'Cache service unavailable' });
      }
      response.send({items: searchResultRows});
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
        return;
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
      response.json({item: infoResultRows});
    });
  });
});
 

application.listen(serverPort, () => {
  console.log(`Server is running on http://localhost:${serverPort}`);
});