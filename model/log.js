// 重要指数: 不重要
// model层主要封装一些复杂操作比如aggregation

module.exports = {

    // getAllStream: () => this.log.find({}, {
    //     projection: {
    //         _id: false
    //     }
    // }).stream(),


    // 获取最新的若干条log
    async log_getRecent_stream($limit = cfg.log.$limit) {
        _this = this;
        // cursor继承了Readable，666
        // 这一步是同步的？为了保险，也可以写return await 。。。
        return _this.log.aggregate([{
            $sort: {
                _id: -1
            }
        }, {
            $limit
        }])
    },




    log_insertOne(log) {
        //添加一个时间戳
        const _id = Date.now();
        cfg.log._id = log._id = (_id > cfg.log._id) ? (_id) : (cfg.log._id + 1);
        return new Promise((res, rej) => {
            this.log.insertOne(log, (err, result) => {
                if (err) rej(err);
                else res(result.ops[0]);
            });
        });
    },



    // 删除旧的log以保持max个log
    // clearByNumber: ($skip = cfg.log.max) => new Promise((res, rej) => {
    //     this.log.aggregate([{
    //         $sort: {
    //             date: -1
    //         }
    //     }, {
    //         $skip
    //     }], (err, cursor) => {
    //         Promise.all(cursor.map(log => this.log.deleteOne(log))).then(() => {
    //             res()
    //         }).catch(err => {
    //             rej(err);
    //         });
    //     });
    // }),


    // 删除过时(小于deadTime)的log
    log_clearByTtl(ttl = cfg.log.ttl) {
        return new Promise((res, rej) => {
            const deadTime = Date.now() - ttl;
            this.log.deleteMany({
                date: {
                    $lt: deadTime
                }
            }, (err, result) => {
                if (err) rej(err);
                // http://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#~deleteWriteOpResult
                else res(result);
            });
        })
    },

};