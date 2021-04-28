

module.exports = {


    async skill_findOne(filter, options = {}) {
        const skill = await this.human.findOne(filter, options)

        if (skill) return skill;
        else throw new Error(`Person ${filter._id || ''} not found`);


    },


    skill_findMany(filter,option={}) {
        return new Promise((res, rej) => {
            this.skill.find(filter,option).toArray((err, list) => {
                if (err) rej(err);
                else res(list);
            });
        })
    },

    async skill_updateOne(where, update) {
        const skill = (await this.skill.findOneAndUpdate(where, update, {
            projection: {
                _id: true,
            }
        })).value;

        if (!skill) throw new Error(`skill【${where._id}】not found`)
        else return skill;
        // else if (log.modifiedCount !== 1) reject(new Error(`Oops, ${log.modifiedCount} skill(s) modefied.`))

    },



    skill_insertOne(skill) {
        return new Promise((resolve, reject) => {
            this.skill.insertOne(skill, (err, log) => {
                if (err) reject(err);
                else if (log.insertedCount !== 1) reject(new Error(`Error ${log.insertedCount} skill added.`));
                else resolve();
            });
        })
    },


    async skill_deleteOne(skill) {
        const dropedSkill = (await this.skill.findOneAndDelete(skill)).value;



        if (!dropedSkill) throw new Error(`Error,【${skill._id}】not found`);
        // else if (result.deletedCount !== 1) rej(new Error(`Error, ${result.deletedCount} skill(s) deleted.`));
        else return dropedSkill;


    },




    // 获取所有distinct的_type名字列表
    // skill_getTypes() {
    //     return new Promise((res, rej) => {
    //         this.skill.distinct('_type', (err, list) => {
    //             if (err) rej(err);
    //             else res(list);
    //         })
    //     })
    // },



    skill_getAllStream() { return this.skill.find({}).stream() },

}