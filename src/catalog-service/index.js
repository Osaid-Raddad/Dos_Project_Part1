const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const database = new sqlite3.Database('database.db');
const axios = require("axios")
const path = require('path');
const cors = require("cors")
const redis = require('redis');
const util = require("util")

const redisClient = redis.createClient(6379,"redis");
redisClient.set = util.promisify(redisClient.set);
redisClient.get = util.promisify(redisClient.get);

redisClient.on("error", (errorMessage) => {
  console.error(`Redis Error: ${errorMessage}`);
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
  )`
  );
});

application.get('/search/:bookTopic', async (request, response) => {
  let searchBookTopic = request.params.bookTopic.trim();
  console.log(searchBookTopic);
  const cachedBookData = await redisClient.get(`${searchBookTopic}`)
  console.log(cachedBookData,"---")
  if(cachedBookData){
    return response.json(JSON.parse(cachedBookData))
  }
  database.serialize(() => {
    database.all(`SELECT * FROM items WHERE bookTopic="${searchBookTopic}"`, (errorOnSearch, searchResultRows) => {
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

      redisClient.set(`${searchBookTopic}`, JSON.stringify(searchResultRows))
      response.send({items: searchResultRows});
    });
  });
});


application.get('/info/:id', async (request, response) => {
  let itemId = request.params.id;
  console.log(itemId);
  const cachedItemData = await redisClient.get(`${itemId}`)
  
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
          redisClient.del(`${itemId}`)
          return response.json({Message:"Invalidate"})
        }
      }
      redisClient.set(`${itemId}`, JSON.stringify(infoResultRows[0]))
      console.log(infoResultRows);
      response.json({item: infoResultRows});
    });
  });
});
 

application.listen(serverPort, () => {
  console.log(`Server is running on http://localhost:${serverPort}`);
});