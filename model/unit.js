






module.exports = {

    // 根据_human和_skill来寻找
    async unit_replaceOne(unit) {
        return (await this.unit.findOneAndReplace({
            _human: unit._human,
            _skill: unit._skill
        }, unit, {
            upsert: true,
            returnOriginal: false,
            projection: {
                _id: false
            }
        })).value;
    },


    async unit_findMany(filter) {

        list = await this.unit.find(filter, {
            projection: {
                _id: false
            }
        }).toArray()

        return list;
    },


    unit_insertOne(unit) {
        return new Promise((resolve, reject) => {
            this.unit.insertOne(unit, (err, log) => {
                if (err) reject(err);
                else if (log.insertedCount !== 1) reject(new Error(`Error ${log.insertedCount} unit added.`));
                else resolve();
            });
        })
    },

    // upsert
    unit_updateOne(unit, update) {
        return new Promise((resolve, reject) => {
            this.unit.updateOne(unit, update, {
                upsert: true
            }, (err, log) => {
                global.temp = log;
                if (err) reject(err);
                else if (log.modifiedCount === 1 || log.upsertedCount === 1) resolve();
                else reject(new Error(`Oops, ${log.modifiedCount} unit(s) modefied; ${log.upsertedCount} unit(s) upserted`));
            });
        })
    },

    async unit_deleteOne(unit) {
        return (await this.unit.findOneAndDelete(unit)).value

    },

    async unit_deleteMany(filter) {
        return this.unit.deleteMany(filter);


    },


    unit_getAllStream() { return this.unit.find({}).stream() },



};