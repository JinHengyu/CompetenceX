// 因为没有合适的http方法，自定义一个“EXE”

const express = require('express');
const assert = require('assert');
const router = express.Router();
const bodyParser = require("body-parser");




// root用户only
// 接收string of code, 返回json或者错误msg
router.all('/debug', bodyParser.text(), async (req, res, next) => {
    try {



        const user = req.session.user;
        const db = cfg.DBs[user._db];

        assert(user && user._lv === 'root', 'Permission denied, root user required');
        await db.log_insertOne({
            ip: req.ip,
            user: user._id,
            method: 'EXE',
            info: req.body
        });

        res.set('Content-Type', `application/json`);
        // await的优先级是16，同typeof，delete
        await res.end(JSON.stringify(await eval(req.body)) || '"【OK, but JSON.stringify output is not a string】"');

    } catch (err) {
        res.status(400).json(err.message || err);

    }

});





module.exports = router;