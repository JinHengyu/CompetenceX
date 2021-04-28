const express = require('express');
const assert = require('assert');
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const archiver = require('archiver');
const router = express.Router();
const Transform = require('stream').Transform;


// 关系选择
// for main.ejs
router.all('/filteredAll', bodyParser.json(), async (req, res, next) => {
    try {




        const user = req.session.user;
        const db = cfg.DBs[user._db];

        assert(user, 'Login first');

        const humanList = await db.human_findMany({
            _role: {
                $in: user._roleList || []
            }
        }, {})


        const unitList = await db.unit_findMany({
            _human: {
                $in: humanList.map(human => human._id)
            }
        })


        const skillList = await db.skill_findMany({
            $or: [{
                _type: {
                    $in: user._typeList || []
                }
            }, {
                _id: {
                    $in: [...new Set(unitList.map(unit => unit._skill))]
                }
            }]
        }, {
            projection: (user._roleList || []).reduce((projection, roleName) => {
                projection[roleName] = 1;
                return projection;
            }, {
                _id: 1,
                _type: 1,
                _sub_type: 1,
                _info: 1,
                _owner: 1,
            })
        })



        return await res.status(200).json({
            humanList,
            skillList,
            unitList,
            cfg: global.cfg.filter((v, k) => ['app', 'radar'].includes(k))
        });


    } catch (err) {
        res.status(400).json(err.message);
    }
});






// 关系投影
// get all projected humans, skills
// for setting.ejs
router.all('/projectedAll', bodyParser.json(), async (req, res, next) => {

    try {


        const user = req.session.user;
        const db = cfg.DBs[user._db];

        assert(user && user._lv !== 'locked', 'permission denied, hyper user and above required');


        const [humanList, skillList] = await Promise.all([db.human_findMany({}, {
            projection: {
                _id: true,
                _role: true,
                _lv: true,
                _owner: true,
                _info: true,
            }
        }), db.skill_findMany({}, {
            projection: {
                _id: true,
                _type: true,
                _owner: true,
                _info: true,
            }
        })]);

        await res.status(200).json({
            humanList,
            skillList,
            cfg: global.cfg.filter((v, k) => ['app'].includes(k))
        });


    } catch (err) {

        res.status(400).json(err.message);
    }

});




// get recent logs
// 返回body：ndjson或文本
router.get('/log', async (req, res, next) => {

    try {
        const user = req.session.user || '';
        assert(user, 'login first');
        const db = cfg.DBs[user._db];


        // mongodb流的chunk是js对象，转化成string
        class Stringifier extends Transform {
            constructor() {
                super({
                    // 允许写入方向的chunk为js对象而非string或buffer
                    writableObjectMode: true,
                    // 读出方向随便
                    readableObjectMode: false,
                })
            }
            _transform(chunk, encoding, next) {
                // this.push或next二选一传递chunk
                this.push(JSON.stringify(chunk) + '\n');
                next();
            }
        }

        reader = await db.log_getRecent_stream(cfg.log.$limit);
        await new Promise((resolve, reject) => {
            res.set('Content-Type', `application/x-ndjson; charset=utf-8`);
            // 封装ndjson
            reader.pipe(new Stringifier()).pipe(res);
            reader.on('end', (chunk) => {
                res.status(200)
                // 最后一个chunk
                resolve(chunk);
            });
            reader.on('error', err => {
                reject(err)
            })
        })

        await db.log_clearByTtl();

        // console.log('ojbk')



    } catch (err) {
        res.set('Content-Type', `text/plain; charset=utf-8`);
        res.status(500).send(err.message || err);
    }

});



// error page
router.get('/error_page', (req, res, next) => {
    res.status(+req.query.status || 400).render('error.ejs', {
        msg: req.query.msg || '(missing error message)'
    });
});


// setting page
router.get('/setting', (req, res, next) => {
    if (!req.session.user || req.session.user._lv === 'locked')
        res.render('error.ejs', {
            msg: 'permission denied, ask admin for authorization'
        });
    else res.render('setting.ejs');
});


// 可以考虑去掉skill无用的role属性
// mongo_backup
router.get('/mongo_backup', async (req, res, next) => {


    const user = req.session.user || '';
    const db = cfg.DBs[user._db] || '';
    try {

        let filename = '';
        assert(user && user._lv === 'root', 'Permission denied, root user only');
        // 还要等多长时间才能备份
        const wait = cfg.mongo.backup_last + cfg.mongo.backup_interval - Date.now();
        assert(wait <= 0, `Backup too frequently, wait for another ${~~(wait / 1000)} seconds`);
        const d = new Date();
        filename = `CompeX_${user._db}_${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;


        // 检测跨表数据完整性
        // 调用原生mongo方法，绕过model层也挺好
        // 并发取代顺序：提升性能
        const [humanIds, skillIds] = await Promise.all([
            db.human.find({}, { projection: { _id: 1 } }).map(h => h._id).toArray(),
            db.skill.find({}, { projection: { _id: 1 } }).map(s => s._id).toArray()
        ]);

        const lostHumanIds = (await db.unit.distinct('_human')).filter(_human => !humanIds.includes(_human));
        const lostSkillIds = (await db.unit.distinct('_skill')).filter(_skill => !skillIds.includes(_skill));



        await Promise.all([
            lostHumanIds.length > 0 ?
                db.human.insertMany(lostHumanIds.map(_human => ({
                    _id: _human,
                    _role: 'homeless person',
                    _lv: 'human',
                    _info: `${_human} was Mistakenly deleted, restored @ ${new Date().toString()} by bot`
                }))) : Promise.resolve(),
            lostSkillIds.length > 0 ?
                db.skill.insertMany(lostSkillIds.map(_skill => ({
                    _id: _skill,
                    _type: 'homeless skill',
                    _info: `${_skill} was Mistakenly deleted, restored @ ${new Date().toString()} by bot`
                }))) : Promise.resolve(),
        ]);

        // 应该是有意义的，机器不会给你去猜
        delete humanIds;
        delete skillIds;
        delete lostHumanIds;
        delete lostSkillIds;


        // 写入4个文件
        await Promise.all([new Promise((resolve, reject) => {
            fs.writeFile(path.join(cfg.mongo.backup_path, 'INFO.JSON'), JSON.stringify({
                app: cfg.app.name,
                version: cfg.app.version,
                date: (new Date()).toString(),
                server: cfg.server.domain || cfg.server.ip,
                'database（work group）': user._db,
                author: cfg.app.author_blog || cfg.app.author,
                url: `${cfg.app.protocol}://${cfg.server.domain || cfg.server.ip}:${cfg.app.port}`,
            }, undefined, '\t'), 'utf8', err => {
                if (err) reject(err);
                else resolve();
            });
        }), new Promise((resolve, reject) => {
            const r = db.human_getAllStream();
            const w = fs.createWriteStream(path.join(cfg.mongo.backup_path, 'human.json'));
            // hack (deprecated)
            // w.write('[');
            r.on('data', human => {
                w.write(JSON.stringify(human));
                // w.write(',');
                w.write('\n');
            });
            r.on('error', err => reject(err));
            r.on('end', () => {
                // w.write('{}]');
                w.end();
                resolve();
            });
        }), new Promise((resolve, reject) => {
            const r = db.unit_getAllStream();
            const w = fs.createWriteStream(path.join(cfg.mongo.backup_path, 'unit.json'));
            r.on('data', unit => {
                w.write(JSON.stringify(unit) + '\n');
            });
            r.on('error', err => reject(err));
            r.on('end', () => {
                w.end();
                resolve();
            });
        }), new Promise(async (resolve, reject) => {
            // 检查每个skill的role键是否要删
            const allRoles = await db.human.distinct('_role');

            const r = db.skill_getAllStream();
            const w = fs.createWriteStream(path.join(cfg.mongo.backup_path, 'skill.json'));
            r.on('data', skill => {
                Object.keys(skill).filter(k => k[0] !== '_' && !allRoles.includes(k)).forEach(role => {
                    delete skill[role];
                    // 开了一个异步分支，应该没事吧。。
                    db.skill.updateOne({ _id: skill._id }, {
                        $unset: {
                            [role]: ''
                        }
                    });
                });
                w.write(JSON.stringify(skill) + '\n');
            });
            r.on('error', err => reject(err));
            r.on('end', () => {
                w.end();
                resolve();
            });

        })]);




        // stream封装成一个promise
        await new Promise((resolve, reject) => {



            const zip = archiver('zip');
            zip.on('error', err => reject(err));
            // zip & name it
            zip.directory(cfg.mongo.backup_path, filename);
            res.set('Content-Disposition', `attachment; filename="${filename}.zip"`);
            // run
            zip.pipe(res);
            zip.finalize();
            res.on('finish', () => {
                resolve();
            })
            cfg.mongo.backup_last = Date.now();
        });


        await db.log_insertOne({
            ip: req.ip,
            user: user._id,
            info: 'mongodb backup'

            // archive
        })

    } catch (err) {


        if (db)
            await db.log_insertOne({
                ip: req.ip,
                user: user._id,
                info: err.message
            });


        // 可否使用http2的推送？
        await res.status(400).render('error.ejs', {
            msg: err.message
        });

        // res.redirect(`data:text/html;utf8, <h1>${err.message}</h1>`,400)

    }

});





module.exports = router;