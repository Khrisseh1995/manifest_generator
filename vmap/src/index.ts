import express from 'express';
import transcodeAd from './vmap';
const app = express();

app.use(express.json());

app.get('/', (req, res) => {            
    res.send("It worked!");
});

app.post('/transcode_ad', async (req, res) => {
    const {creativeId, fileURL} = req.body;
    await transcodeAd(creativeId, fileURL);    
    return res.send({success: "Lmao"});
})

app.listen(80, () => console.log("Listneing on port 80"));