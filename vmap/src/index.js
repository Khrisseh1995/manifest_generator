const express = require('express');

const app = express();

app.get('/', (req, res) => {            
    res.send("It worked!");
});

app.listen(80, () => console.log("Listneing on port 80"));