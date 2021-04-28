(async () => {

    dbName = '_PCP';


    const client = await require('mongodb').MongoClient.connect(cfg.mongo.url, {
        useNewUrlParser: true,
        poolSize: cfg.mongo.poolSize,
        useUnifiedTopology: true
    });





    await client.db(dbName).command({
        collMod: "human",
        validator: {},
        validationLevel: "strict",
        validationAction: "error",
    });

    const humanList = await cfg.DBs[dbName].human.find({
        $or: [{
            _roleList: { $exists: true }
        }, {
            _typeList: { $exists: true }
        }]
    }).toArray();


    need2updateHumanCount = 0;

    await humanList.reduce(async (chain, human) => {


        await chain;

        need2update = false;

        if (human._roleList) {

            newRoleList = [...new Set(human._roleList)];
            if (human._roleList.length !== newRoleList.length) {
                human._roleList = newRoleList;
                need2update = true;
            }

            human._roleList.forEach(role => {
                if (/(^_)|(\.)|(\$)|(^$)/g.test(role)) {
                    human._roleList[human._roleList.indexOf(role)] = role.replace(/(^_)|(\.)|(\$)|(^$)/g, '-');
                    need2update = true;
                }
            })



        }

        if (human._typeList) {
            newTypeList = [...new Set(human._typeList)];
            if (human._typeList.length !== newTypeList.length) {
                human._typeList = newRoleList;
                need2update = true;
            }
        }


        if (need2update) {
            await cfg.DBs[dbName].human.replaceOne({ _id: human._id }, human);
            need2updateHumanCount++;
        }

        return;

    }, Promise.resolve());

    return 'human updated: ' + need2updateHumanCount;

})();