// model层和业务逻辑层的责任边界比较模糊


// 异步编程的思想:
// 此处看似里入口(index.js)好远(两次跳转), 但仍然属于同步流, 执行先于较早定义的异步函数


// this 是DB对象

module.exports = {

    async human_exist($match = {}) {
        const result = await this.human.aggregate([
            { $match },
            { $limit: 1 },
            { $count: 'count' }
        ]).toArray();

        if (result.length === 0) throw `Person ${$match._id || $match} does not exist`
        else return true;

    },


    async   human_login(user) {

        result = await this.human.findOne(user)

        // 否则返回null
        if (result) return (result);
        else throw (new Error(`Login failed: 
            username or password incorrect`));



    },

    human_findMany(filter, options = {}) {
        return new Promise((res, rej) => {
            this.human.find(filter, options).toArray((err, list) => {
                if (err) rej(err);
                else res(list);
            });
        })
    },


    human_findOne(filter, options = {}) {
        return new Promise((resolve, reject) => {
            this.human.findOne(filter, options, (err, human) => {
                if (err) reject(err);
                else if (human) resolve(human);
                else reject(new Error(`Person ${filter._id || ''} not found`));
            })
        })
    },



    human_updateOne(user, update) {
        return new Promise((resolve, reject) => {
            this.human.updateOne(user, update, (err, log) => {
                if (err) reject(err);
                else if (log.modifiedCount !== 1) reject(new Error(`Oops, ${log.modifiedCount} person(s) modefied.`))
                else resolve(user);
            });
        })
    },

    // human_updateMany(filter, update) {
    //     return new Promise((res, rej) => {
    //         this.human.updateMany(filter, update, (err, log) => {
    //             if (err) rej(err);
    //             else res();
    //         });
    //     })
    // },


    human_insertOne(user) {
        return new Promise((resolve, reject) => {
            this.human.insertOne(user, (err, log) => {
                if (err) reject(err);
                else if (log.insertedCount !== 1) reject(new Error(`Error ${log.insertedCount} person added.`))
                else resolve();
            });
        })
    },


    async  human_deleteOne(human) {
        const dropedHuman = (await this.human.findOneAndDelete(human)).value;
        // else if (result.deletedCount !== 1) rej(new Error(`Error, ${result.deletedCount} person(s) deleted.`));
        if (!dropedHuman) throw new Error(`Error,【${human._id}】not found`);
        else return dropedHuman;
    },


    human_getAllStream() {
        return this.human.find({}).stream()
    },


}