// 主程序的入口
const fs = require("fs");
const path = require('path');
const mongodb = require('mongodb');
const https = require("https");
// const http2 = require("http2");
const express = require('express');
const session = require('express-session');
// const mongoStore = require('connect-mongo')(session);
const FileStore = require('session-file-store')(session);






global.cfg = {}
Promise.all([initGlobal(), initExpress(), initMongo()])
    .then(() => {
        // console.log('【init OK】');
        console.log(`   ${cfg.app.protocol}://${cfg.server.domain || cfg.server.ip}:${cfg.app.port}`);
    }).catch(err => {
        console.log(err.message || err || '有内鬼，终止交易');
        process.exit(0);
    });




async function initMongo() {
    const client = await mongodb.MongoClient.connect(cfg.mongo.url, {
        useNewUrlParser: true,
        poolSize: cfg.mongo.poolSize,
        useUnifiedTopology: true
    });


    class DB {
        constructor(dbName) {
            (async (_this) => {



                const db = client.db(dbName);
                const colls = await db.collections();


                const collectionName = colls.map(coll => coll.collectionName);
                const collList = await Promise.all(['human', 'unit', 'skill', 'log',]
                    .filter(name => !collectionName.includes(name))
                    .map(name => db.createCollection(name)));


                collList.forEach(coll => console.log(`Collection 【${coll.collectionName}】 in Database 【${dbName}】 Created`));

                this.human = db.collection('human');
                this.unit = db.collection('unit');
                this.skill = db.collection('skill');
                this.log = db.collection('log');

                await Promise.all([
                    this.human.createIndex({ _role: -1 }),
                    this.skill.createIndex({ _type: -1 }),
                    this.unit.createIndex({ _human: 1, _skill: 1 }, { unique: true })
                ]);


                // 覆盖validator
                await Promise.all([
                    db.command({
                        collMod: "human",
                        validator: {
                            $jsonSchema: require(path.join(__dirname, './jsonSchema/human.json')),
                        },
                        validationLevel: "strict",
                        validationAction: "error",
                    }),
                    db.command({
                        collMod: "skill",
                        validator: {
                            $jsonSchema: require(path.join(__dirname, './jsonSchema/skill.json')),
                        },
                        validationLevel: "strict",
                        validationAction: "error",
                    }),
                    db.command({
                        collMod: "unit",
                        validator: {
                            $jsonSchema: require(path.join(__dirname, './jsonSchema/unit.json')),
                        },
                        validationLevel: "strict",
                        validationAction: "error",
                    })
                ]);


                //    const admin = db.admin();

                await Promise.all([
                    db.command({ validate: "human", full: true }),
                    db.command({ validate: "skill" }),
                    db.command({ validate: "unit", full: true }),
                ]);
                // console.log(results.map(r=>r.ok).join(' '))
                console.log(`【validated】 ${dbName}`);
                // console.log('hello',result[0])

                // admin.validateCollection('log',{full:true},(err,result)=>{
                //     if(err)console.log(err)
                //     console.log('hello\n',result)
                // })

                // admin.validateCollection('skill', { full: true }),
                // admin.validateCollection('unit', { full: true }),
                // ]);




            })(this).catch(err => {
                console.log(err);
                process.exit(0);
            });
        }
    }
    Object.assign(DB.prototype,
        require(path.join(__dirname, './model/human.js')),
        require(path.join(__dirname, './model/log.js')),
        require(path.join(__dirname, './model/unit.js')),
        require(path.join(__dirname, './model/skill.js')));

    // console.log((await client.db('test').admin().listDatabases()).databases)
    return (global.cfg.app.DBs = Object.keys(global.cfg.DBs = (await client.db('test').admin().listDatabases()).databases.filter(db => db.name[0] === '_').reduce((DBs, database) => Object.assign(DBs, { [database.name]: new DB(database.name) }), {}))) && console.log('【loaded】 MongoDB');


    // return cfg.DBs;










}



// Express.JS
async function initExpress() {
    const app = express();
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, './view/'));

    // 开始路由
    // 放在session中间件之前, 因为public资源不需要session
    app.use('/get/public', express.static(path.join(__dirname, './public/'), {
        // 30 day cache
        maxAge: cfg.session.ttl * 365
    }));
    // app.use('/', express.static(path.join(__dirname, './public/node_modules/')));
    app.use(session({
        name: cfg.session.key, // 设置 cookie 中保存 session id 的字段名称
        // Required option
        secret: cfg.session.secret, // 通过设置 secret 来计算 hash 值并放在 cookie 中(但每次的值不同)，使产生的 signedCookie 防篡改
        saveUninitialized: false,
        resave: false,
        path: '/',
        cookie: {
            // 取消设置http层面的cookie(无法通过document.cookie访问)
            // httpOnly的cookie将http于js安全分离
            httpOnly: false,
            maxAge: cfg.session.ttl * 30
        },
        // https://www.npmjs.com/package/session-file-store
        store: new FileStore({
            path: path.join(__dirname, './sessions/'),
            ttl: cfg.session.ttl * 30,
            retries: 0
        })
    }));
    // 入口
    app.get('/', (req, res, next) => {
        res.render('main.ejs', {
            req,
        })
    });
    app.use('/get', require(path.join(__dirname, './route/get.js')));
    app.use('/set', require(path.join(__dirname, './route/set.js')));
    app.use('/add', require(path.join(__dirname, './route/add.js')));
    app.use('/exe', require(path.join(__dirname, './route/exe.js')));
    app.use('/drop', require(path.join(__dirname, './route/drop.js')));
    app.use('/replace', require(path.join(__dirname, './route/replace.js')));
    // 404
    app.use('/', (req, res, next) => res.status(400).render('error.ejs', {
        msg: `Resource ${req.path} Not Found.`
    }));
    // 结束路由

    // http
    // http.createServer({}, app).listen(cfg.app.port, resolve);

    // https
    // expressjs框架与标准库的最终接口: 构造app方法


    return new Promise((resolve, reject) => {

        const server = https.createServer({
            // 私钥和证书
            key: fs.readFileSync(cfg.app.key),
            cert: fs.readFileSync(cfg.app.cert)
        }, app);
        server.on('error', err => {
            server.close();
            reject(err);
        });
        server.listen(cfg.app.port, () => {
            resolve();
            console.log('【loaded】 ExpressJS');
        });


        // http2.createSecureServer({
        //     key: fs.readFileSync(cfg.app.key),
        //     cert: fs.readFileSync(cfg.app.cert)
        // }, app).listen(cfg.app.port, resolve);




    });
}







// initial global functions, Objects, prototypes...
async function initGlobal() {
    // 所有全局对象
    Object.assign(global.cfg, require(path.join(__dirname, './cfg.js')))

    // never used
    // RegExp.escape = string => string.replace(/[.*+?^${}()|[\]\\]/g, match => `\\${match}`);

    Date.prototype.toJSON = function () {
        return this.getTime();
    }

    Function.prototype.toJSON = function () {
        return this.toString();
    }

    RegExp.prototype.toJSON = function () {
        return this.toString();
    }

    // 仿照Array.prototype.filter
    Object.defineProperty(Object.prototype, 'filter', {
        enumerable: false,
        writable: true,
        value: function (check = ((v, k, o) => undefined), this4check = undefined) {
            const oldObj = this;
            const newObj = {};
            Object.entries(oldObj).forEach(([key, value]) => {
                if (check.bind(this4check)(value, key, oldObj))
                    newObj[key] = value;
            })
            return newObj;
        },
    });

    console.log('【loaded】 Node.JS');
    return;
}