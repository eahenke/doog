const getType = require('../utils/get-type');
const regularizeData = require('../utils/regularize-data');


module.exports = class MemoryAdapter
{
    constructor(dbConfig)
    {
        this.name = 'Memory';
        this.config = dbConfig;
        this.idType = 'number';
        this.idPathRegex = '\\d+';
        this.modelDefinitions = {};
    }

    /* Connections */
    addConnection()
    {
        this.database = this.database ||
        {};
    }

    closeConnection()
    {
        this.database = {};
        this.connection = null;
    }

    dropDatabase()
    {
        this.database = {};
        return Promise.resolve();
    }

    hasValidId(query)
    {
        if (query.hasOwnProperty('id')) return /\d+/.test(query.id);
        return true;
    }

    addModel(modelName, schemaDef)
    {
        schemaDef.id = this.idType;
        this.modelDefinitions[modelName] = schemaDef;
        this.database[modelName] = {
            data: [],
            idIterator: 0
        };
    }

    methods(collectionName)
    {
        const dbModel = this.database[collectionName];
        if (!dbModel) throw new Error(`Unable to find model ${collectionName} in database config`);

        return {
            /* Crud */
            find: (query) =>
            {
                query = regularizeData(this.modelDefinitions[collectionName], query);
                const dbModelData = this.database[collectionName].data;
                const found = searchCollection(dbModelData, query);
                return Promise.resolve(found);
            },

            findOne: (query) =>
            {
                query = regularizeData(this.modelDefinitions[collectionName], query);
                const dbModelData = this.database[collectionName].data;
                const found = searchCollection(dbModelData, query, true);
                return Promise.resolve(found);
            },

            findById: (id) =>
            {
                const dbModelData = this.database[collectionName].data;
                let query = {
                    id: id
                };
                query = regularizeData(this.modelDefinitions[collectionName], query);
                const found = searchCollection(dbModelData, query, true);
                return Promise.resolve(found);
            },

            create: (data) =>
            {
                const dbModelData = this.database[collectionName].data;
                let postData = regularizeData(this.modelDefinitions[collectionName], data, true);

                if (!postData || !Object.keys(postData).length) return Promise.reject('Must provide at least one valid property');
                postData = assignId(dbModel, postData);

                //Move this to inherited BaseModel hook
                postData.created = new Date();

                postData = processPost(this.modelDefinitions[collectionName], postData);
                checkUniqueness(this.modelDefinitions[collectionName], postData, dbModelData);

                dbModelData.push(postData);
                return Promise.resolve(postData);
            },

            update: (id, data) =>
            {
                const dbModelData = this.database[collectionName].data;
                let query = {
                    id: id
                };
                query = regularizeData(this.modelDefinitions[collectionName], query);
                const badQueryError = new Error('Model.updateMany requires query object argument');
                if (getType(query) !== 'Object') throw badQueryError;
                if (!Object.keys(query) || !Object.keys(query).length) throw badQueryError;

                let found = searchCollection(dbModelData, query, true);
                if (!found)
                {
                    let err = new Error(`Resource "${collectionName}" with id ${id} not found.`);
                    err.code = 404;
                    err.statusCode = 404;
                    throw err;
                }

                const postData = regularizeData(this.modelDefinitions[collectionName], data, true);
                postData.modified = new Date();

                checkUniqueness(this.modelDefinitions[collectionName], postData, dbModelData);

                found = Object.assign(found, postData);
                return Promise.resolve(found);
            },

            updateMany: (query, data) =>
            {
                query = regularizeData(this.modelDefinitions[collectionName], query);

                const dbModelData = this.database[collectionName].data;
                const badQueryError = new Error('Model.updateMany requires query object argument');
                if (getType(query) !== 'Object') throw badQueryError;
                if (!Object.keys(query) || !Object.keys(query).length) throw badQueryError;

                const found = searchCollection(dbModelData, query);
                const postData = regularizeData(this.modelDefinitions[collectionName], data, true);
                postData.modified = new Date();

                checkUniqueness(this.modelDefinitions[collectionName], postData, dbModelData);

                found.map(item =>
                {
                    Object.assign(item, postData);
                });

                return Promise.resolve(
                {
                    count: found.length
                });
            },

            delete: (id) =>
            {
                let query = {
                    id: id
                };

                query = regularizeData(this.modelDefinitions[collectionName], query);

                let dbModelData = this.database[collectionName].data;
                const originalLength = dbModelData.length;
                dbModelData = dbModelData.filter(item =>
                {
                    return item.id !== query.id;
                });

                this.database[collectionName].data = dbModelData;

                return {
                    count: originalLength - dbModelData.length,
                };
            },

            deleteMany: (query) =>
            {
                query = regularizeData(this.modelDefinitions[collectionName], query);

                const dbModelData = this.database[collectionName].data;
                const badQueryError = new Error('Model.deleteMany requires query object argument');
                if (getType(query) !== 'Object') throw badQueryError;
                if (!Object.keys(query) || !Object.keys(query).length) throw badQueryError;

                let count = 0;

                this.database[collectionName].data = dbModelData.filter(item =>
                {
                    if (!matchItem(item, query)) return true;
                    else count++;
                });

                return Promise.resolve(
                {
                    count: count
                });
            }
        };
    }

    test()
    {
        return {
            randomId: () =>
            {
                const maxRange = 100;
                let highestId = 0;
                for (let key in this.database)
                {
                    if (this.database[key].idIterator > highestId) highestId = this.database[key].idIterator;
                }
                const max = highestId + maxRange;
                return Math.floor(Math.random() * (max - highestId)) + highestId + 1;
            }
        };
    }
};


/* Search helpers */
function searchCollection(set, predicate, fast)
{
    const fn = fast ? 'find' : 'filter';
    return set[fn](item =>
    {
        return matchItem(item, predicate, fast);
    });
}

function matchItem(item, predicate)
{
    if (!predicate || !Object.keys(predicate).length) return true;
    return Object.keys(predicate).every(key =>
    {
        if (getType(predicate[key]) === 'Object')
        {
            return Object.keys(predicate[key]).every(subKey =>
            {
                return compare(item[key], predicate[key][subKey], subKey);
            });
        }
        return item[key] === predicate[key];
    });
}


//Add default fields and check required fields on POST
function processPost(modelDef, data)
{
    const target = Object.assign(
    {}, data);
    for (let key in modelDef)
    {
        if (getType(modelDef[key]) !== 'Object') continue;
        if (modelDef[key].hasOwnProperty('default') && !target.hasOwnProperty(key))
        {
            target[key] = modelDef[key].default;
        }
        if (modelDef[key].required === true && !target.hasOwnProperty(key))
        {
            throw new Error(`"${key}" property is required`);
        }
    }
    return target;
}

function checkUniqueness(modelDef, data, set)
{
    for (let key in modelDef)
    {
        if (!data.hasOwnProperty(key)) continue;
        if (getType(modelDef[key]) !== 'Object') continue;
        if (modelDef[key].hasOwnProperty('unqiue'))
        {
            const predicate = {
                key: data[key]
            };
            const found = searchCollection(set, predicate, true);
            if (found) throw new Error(`"${key}" property must be unique`);
        }
    }
}


function assignId(dbModel, data)
{
    dbModel.idIterator++;
    data.id = dbModel.idIterator;
    return data;
}

function compare(v1, v2, operator)
{
    switch (operator)
    {
    case '$gt':
        return v1 > v2;
    case '$gte':
        return v1 >= v2;
    case '$lt':
        return v1 < v2;
    case '$lte':
        return v1 <= v2;
    case '$in':
        return v2.indexOf(v1) >= 0;
    case '$nin':
        return v2.indexOf(v1) < 0;
    case '$ne':
        return v1 !== v2;
    case '$eq':
        return v1 === v2;
    default:
        return v1 === v2;
    }
}