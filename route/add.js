// 首字符为'_'统一预留给特殊使用, 不管现在是否用得到

const express = require('express');
const assert = require('assert');
const router = express.Router();
const bodyParser = require("body-parser");













// 返回user完整对象
router.post('/login', bodyParser.json(), (req, res, next) => {

    // login的本质就是刷新服务端的session
    if (req.session.user) {
        const _db = req.session.user._db;
        cfg.DBs[_db].human_findOne({
            _id: req.session.user._id
        }).then(user => {
            // refresh session.user
            req.session.user = Object.keys(user).filter(key => key[0] === '_').reduce((digestUser, key) => {
                digestUser[key] = user[key];
                return digestUser;
            }, { _db });
            res.json(user);
        }).catch(err => {
            res.status(400).json(err.message);
        });


        // 如果没有登录
    } else {
        let {
            _id,
            _pwd,
            _db
        } = req.body;

        // login得到的新user对象
        let u = null;
        new Promise((res, rej) => {
            _id = String(_id).toLowerCase();
            _pwd = String(_pwd);
            res();
        }).then(() => cfg.DBs[_db].human_login({
            // 大小写敏感
            _id,
            _pwd: global.cfg.sha1(_pwd),
            // 登录成功
        })).then(user => {
            Object.assign(u = user, { _db });
            // 只保留user对象的特殊字段'_'
            req.session.user = Object.keys(user).filter(key => key[0] === '_').reduce((digestUser, key) => {
                digestUser[key] = user[key];
                return digestUser;
            }, {});
            return cfg.DBs[req.session.user._db].log_insertOne({
                ip: req.ip,
                info: 'LOGIN',
                user: user._id,
            });
        }).then(() => res.status(200).json(u))
            .catch(err => res.status(400).json(err.message))


    }
});










// human必须要有_id和_role
router.post('/human', bodyParser.json(), async (req, res, next) => {
    try {


        const user = req.session.user;
        const db = cfg.DBs[req.session.user._db];
        const human = (req.body || {});

        assert(user, 'session expired, login first');
        assert(user._capacity-- > 0, `Sorry, ask admin to expand ur capacity :(`)
        assert((user._roleList || []).includes(human._role), `permission denied, u haven\'t included ${human._role} in ur roleList yet`);
        human._id = human._id.trim().toLowerCase();
        human._owner = user._id;



        await db.human_insertOne(human);

        await Promise.all([db.human_updateOne({
            _id: user._id
        }, {
                $inc: {
                    _capacity: -1
                }
            }), db.log_insertOne({
                ip: req.ip,
                user: user._id,
                human: human._id,
                method: req.method
            })]);


        await res.status(200).json(human);
    } catch (err) {




        res.status(400).json(err.message || err);
    }



});





// skill必须有_id和_type
router.post('/skill', bodyParser.json(), async (req, res, next) => {

    try {

        const user = req.session.user;
        const db = cfg.DBs[req.session.user._db];
        const skill = req.body || {};

        assert(user, 'login first');
        assert(user._capacity-- > 0, `Sorry, ask admin to expand ur capacity :(`);
        assert((user._typeList || []).includes(skill._type), `permission denied, u haven't included ${skill._type} in ur typeList yet`);
        skill._id = skill._id.trim();
        skill._owner = user._id;



        await db.skill_insertOne(skill);


        await Promise.all([db.human_updateOne({
            _id: user._id
        }, {
                $inc: {
                    _capacity: -1
                }
            }), db.log_insertOne({
                ip: req.ip,
                user: user._id,
                skill: skill._id,
                method: req.method
            })]);


        await res.status(200).json(skill);

    } catch (err) {

        res.status(400).json(err.message || err);
    }

});





module.exports = router;