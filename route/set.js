// patch: 局部更新
// update对象都是对属性的局部更新(传入残缺对象)
// 一般直接返回用户发来的残版,而添加和删除都返回数据库得到的对象

const express = require('express');
const router = express.Router();
const assert = require('assert');
const bodyParser = require("body-parser");





// 单独的覆盖更新一个human
// _id：查询键
// 传入一个要覆盖更新的human对象
router.patch('/human', bodyParser.json(), async (req, res, next) => {
    try {



        const user = req.session.user;
        const db = cfg.DBs[req.session.user._db];
        const human = req.body || {}




        assert(user, 'login first');

        // 对每一个字段校验
        if (human._role) {
        }
        if (human._capacity) {
            assert(user._lv === 'root', 'permission denied: u r not root user')
        }
        if (human._roleList || human._typeList || human._pwd) {
            assert(user._id === human._id, 'setting others is forbidden')
            assert(cfg.levelMap[user._lv] >= cfg.levelMap['hyper'], 'permission denied, ur level aint high enough');
        }
        if (human._pwd) {
            human._pwd = global.cfg.sha1(human._pwd);
        }



        const human2drop = await db.human_findOne({ _id: human._id }, { projection: { _id: true, _role: true, _lv: true } });



        human._owner = user._id;
        // 拥有他的_role或者更新对象是自己
        assert(user._roleList.includes(human2drop._role) || user._id === human._id, `permission denied, u haven't included ${human._role} in ur roleList yet`);




        await db.human_updateOne({
            _id: human._id,
        }, { $set: human });

        await db.log_insertOne({
            ip: req.ip,
            human: human._id,
            user: user._id,
            method: req.method,
        })

        await res.status(200).json(human);
    } catch (err) {

        res.status(400).json(err.message);
    }
});





// apply another's _roleList & _typeList to the user
// 本质是account setting的快捷通道
// common user无法account setting
router.patch('/copyAccount', bodyParser.json(), (req, res) => {
    new Promise((res, rej) => {
        const user = req.body;
        assert(req.session.user && req.session.user._lv !== 'locked', 'permission denied');
        res(user);
    }).then(user => cfg.DBs[req.session.user._db].human_findOne({
        _id: user._id || null
    }, {
        projection: {
            _roleList: true,
            _typeList: true
        }
    })).then(({
        _roleList = [],
        _typeList = []
    }) => cfg.DBs[req.session.user._db].human_updateOne({
        _id: req.session.user._id
    }, {
        $set: {
            _roleList,
            _typeList
        }
    })).then(user => res.status(200).json(user))
        .catch(err => res.status(400).json(err.message));
});


router.patch('/skill', bodyParser.json(), async (req, res, next) => {

    try {
        const user = req.session.user;
        const db = cfg.DBs[req.session.user._db];
        const skill = req.body || {};

        assert(user, 'login first');

        if (skill._type) {
            assert(user._typeList.includes(skill._type), `permission denied, u haven't included ${skill._type} in ur typeList yet`);
        }
        if (skill._info) {
        }

        skill._owner = user._id;

        await db.skill_updateOne({
            _id: skill._id
        }, {
            $set: skill.filter((v, k) => k[0] === '_' || (typeof v) === 'number')
        });

        // 删掉值不是number类型的role键，比如null的role-target
        const $unset = skill.filter((v, k) => k[0] !== '_' && (typeof v) !== 'number')
        if (Object.keys($unset).length > 0) {
            await db.skill_updateOne({
                _id: skill._id
            }, {
                $unset
            });
        }

        await db.log_insertOne({
            ip: req.ip,
            user: user._id,
            skill: skill._id,
            method: req.method,
        })

        await res.status(200).json(skill);
    } catch (err) {

        res.status(400).json(err.message);
    }

});



module.exports = router;