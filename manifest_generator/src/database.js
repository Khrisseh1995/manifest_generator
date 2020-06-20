const sqlite3 = require('sqlite3').verbose();
const moment = require('moment');

const db = new sqlite3.Database('../db/manifest_info.db',(err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the manifest database.');
});

const insertIntoDatabase = (insertValues) => {

    db.run('INSERT INTO manifest_information(EXTINFO, TIME, LOCATION, FILENAME) VALUES(?, ?, ?, ?)',insertValues,(err) => {
        if (err) {
            return console.error(err.message);
        }
        // console.log(`Rows inserted ${insertValues[2]}`);
    });
}

const readValuesForManifest = () => new Promise((res,rej) => {
    const sql = "select * from (select * from manifest_information order by id DESC limit 3) order by id ASC";

    db.all(sql,[],(err,rows) => {
        res(rows);
        rej(err);
    });
});

const getLastRecords = (first, last) => new Promise((res, rej) => {
    console.log("First", first);
    console.log("Last", parseInt(last) + 1);
    const sql = `select * from manifest_information where id between ${first} and ${last}`;

    db.all(sql,[],(err,rows) => {
        res(rows);
        rej(err);
    });
});



module.exports = {
    insertIntoDatabase,
    readValuesForManifest,
    getLastRecords
}