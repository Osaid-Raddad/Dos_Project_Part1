const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');
const axios = require("axios")
const path = require('path');
const cors = require("cors")
const redis = require('redis');
const util = require("util")

const client = redis.createClient(6379,"redis");
client.set = util.promisify(client.set);
client.get = util.promisify(client.get);

client.on("error", (err) => {
  console.error(`Redis Error: ${err}`);
});

const app = express();
const port = 3005;

app.use(express.json());
app.use(cors())

let orderPrice =0;
let numberIt ;
let test;
let lastResult;
let lastText;
app.post("/order",(req,res)=>{
  const order = req.body
  const searchId = req.body.id
  const orderCost = req.body.orderCost
  
db.all(`SELECT * FROM items WHERE id = ?`, [searchId], (err, row) => {
    if (err) {
      console.error(err.message);
      return;
    }
    
    if (!!row[0]) {
      numberIt = row[0].numberOfItems;
      orderPrice = row[0].bookCost;
      let numberOfItems = row[0].numberOfItems-1;
      console.log(orderPrice)
      console.log(orderCost)
      
      if (orderCost >= orderPrice) {
        
        const remainingAmount = orderCost - orderPrice;
        db.run(
          `UPDATE items SET numberOfItems = ? WHERE id = ?`,
          [numberOfItems, searchId],
          function (err) {
            if (err) {
              console.error('Error updating record:', err.message);
              return;
            }
            
          }
          
        );
      }
      
      
    } 
    db.all(`SELECT * FROM items WHERE id = ?`, [searchId], (err, updatedRow) => {
      if (err) {
          console.error(err.message);
          return;
        }
      if(updatedRow){
        // console.log({ numberOfItemsBeforeUpdate:numberIt,data: updatedRow[0]})
        
        if(updatedRow.length != 0){
          // console.log(updatedRow[0],"eeee")
          test = { numberOfItemsBeforeUpdate:numberIt,data: updatedRow}
          if(numberIt === updatedRow[0].numberOfItems){
            lastResult = false
          }
          else{
            lastResult = true
          
          }
          lastText = `Bought book ${updatedRow[0].bookTitle}`
        }
        // console.log(test)
        if(lastResult)
          res.send({result:{status:"success",message:lastText}});
        else
          res.send({result:{status:"fail",message:"Failed to buy The book!!"}})
      }  
      
    })
    
  });
 

});


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});