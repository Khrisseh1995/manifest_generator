import express from 'express';

const handler = express();

handler.get('/', (req, res) => {
    res.send("It works!");
});


export default handler;
