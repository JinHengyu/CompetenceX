// http method: DELETE

const express = require('express');
const assert = require('assert');
const router = express.Router();
const bodyParser = require("body-parser");








router.all('/logout', bodyParser.json(), (req, res, next) => {
    // logout
    req.session.user = null;
    res.redirect('/');
});









router.delete('/human', bodyParser.json(), async (req, res, next) => {

    try {

        const user = req.session.user;
        const db = cfg.DBs[req.session.user._db];
        const human = req.body;


        assert(user, 'login first');

        const human2drop = await db.human_findOne({ _id: human._id }, { projection: { _id: true, _role: true, _lv: true } });

        // 用了>而不是>=所以，root用户无法被删
        assert(cfg.levelMap[user._lv] > cfg.levelMap[human2drop._lv], 'u cannot drop a higher-level person')
        assert(user._roleList.includes(human2drop._role), `${human._id}'s role（${human2drop._role}） ain't in ur role list`)

        const [dropedHuman] = await Promise.all([db.human_deleteOne({
            _id: human._id,

        }), db.unit_deleteMany({
            _human: human._id
        })]);

        await Promise.all([db.human_updateOne({
            _id: user._id
        }, {
            $inc: {
                _capacity: +1
            }
        }), db.log_insertOne({
            ip: req.ip,
            human: human._id,
            user: user._id,
            method: req.method
        })])

        await res.status(200).json(dropedHuman);

    } catch (err) {

        res.status(400).json(err.message);
    }



});



router.delete('/skill', bodyParser.json(), async (req, res, next) => {
    try {

        const user = req.session.user;
        const db = cfg.DBs[req.session.user._db];

        const skill = req.body;

        assert(user, 'Login first');

        // 因为有些用户能看到的skill不在自己的typelist里面（由于human带过来的skill）
        // const skill2drop = await db.skill_findOne({ _id: skill._id }, { projection: { _id: true, _type: true } });


        // assert(user._typeList.includes(skill2drop._type), `${skill._id}'s type（${skill2drop._type}） ain't in ur type list`)


        const [dropedSkill] = await Promise.all([db.skill_deleteOne({
            _id: skill._id,

        }), db.unit_deleteMany({
            _skill: skill._id
        })]);




        await Promise.all([db.human_updateOne({
            _id: user._id
        }, {
            $inc: {
                _capacity: +1
            }
        }), db.log_insertOne({
            ip: req.ip,
            skill: skill._id,
            user: req.session.user._id,
            method: req.method
        })])

        await res.status(200).json(dropedSkill)


    } catch (err) {

        res.status(400).json(err.message);
    }



});


router.delete('/unit', bodyParser.json(), async (req, res, next) => {

    try {
        const user = req.session.user;
        const db = cfg.DBs[user._db];
        const unit = req.body;

        assert(user, 'login first');


        // 寻找这个human是否在user的_roleList下
        // await db.human_findOne({
        //     _id: unit._human, _role: {
        //         $in: user._roleList
        //     }
        // });

        await db.human_exist({
            _id: unit._human,
            _role: {
                $in: user._roleList
            }
        })


        await res.json(await db.unit_deleteOne(unit));




    } catch (err) {

        res.status(400).json(err.message);
    }



});





module.exports = router;