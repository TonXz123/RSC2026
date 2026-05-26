const express = require('express');
const cors = require('cors');
const api = require('./routes/api');

const app = express();

app.use(express.json());
app.use(cors());

app.use('/api',api);

app.listen(8080,'0.0.0.0',()=>{console.log('backend run 8080')});