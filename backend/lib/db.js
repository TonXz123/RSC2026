const {Pool} = require('pg');

const pool = new Pool({
    user:'postgres',
    host:'localhost',
    database:'rsc2026',
    password:'tonxz'
})

module.exports = pool;