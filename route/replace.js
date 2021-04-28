// PUT：替换

const express = require('express');
const assert = require('assert');
const router = express.Router();
const bodyParser = require("body-parser");



router.put('/unit', bodyParser.json(), async (req, res, next) => {

    try {
        const user = req.session.user;
        const db = cfg.DBs[user._db];
        const unit = req.body;

        assert(user, 'login first');


        // 寻找这个human是否在user的_roleList下
        await db.human_exist({
            _id: unit._human,
            _role: {
                $in: user._roleList
            }
        })

// upsert
        await res.json(await db.unit_replaceOne(unit));




    } catch (err) {

        res.status(400).json(err.message || err);
    }



});




module.exports = router;