// unfinished
const fs = require('fs');
const lineReader = require('./lineReader.js')
const path = require('path');
const MongoClient = require('mongodb').MongoClient;


// fs.createReadStream('./backlog.txt', { encoding: 'utf8' }).pipe(new lineReader()).on('data', line => {
//     console.log('------new line------       ', line)
// })



let client;
async function backup() {


    dbName2import = '_GED_2019-11';

    client = await MongoClient.connect('mongodb://127.0.0.1:27017/', {
        useNewUrlParser: true,
        poolSize: 10,
        useUnifiedTopology: true
    })

    db = client.db(dbName2import);

    await Promise.all([
        { coll: db.collection('human'), filePath: path.join(__dirname, '../mongo_backup/human.json') },
        { coll: db.collection('skill'), filePath: path.join(__dirname, '../mongo_backup/skill.json') },
        { coll: db.collection('unit'), filePath: path.join(__dirname, '../mongo_backup/unit.json') }]
        .map(async ({ coll, filePath }) => {



            await coll.deleteMany({})

            r = fs.createReadStream(filePath).pipe(new lineReader())

            return new Promise((res, rej) => {


                r.on('data', (line) => {
                    if (!line.trim()) return;
                    // reader.pause();
                    // console.log(line)
                    coll.insertOne(JSON.parse(line))
                    // reader.resume();
                })
                // 可有可无，因为监听data事件时就会resume
                r.resume();

                r.on('end', () => {
                    res();
                    // console.log('resolved')
                });

                r.on('error', err => {
                    rej(err)
                });
            })
        })

    );

    console.log('finished')


    client.close();

};

backup().catch(err => {
    console.log(err.message || err)
    client.close();
});