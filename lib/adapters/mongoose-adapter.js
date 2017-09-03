const bluebird = require('bluebird');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const getType = require('../utils/get-type');

mongoose.Promise = bluebird;


module.exports = class MongooseAdapter
{
    constructor(dbConfig)
    {
        this.name = 'Mongoose';
        this.config = dbConfig;
        this.idType = 'string';
        this.idPathRegex = '[a-fA-F\\d]{24}';
    }

    /* Connections */
    addConnection()
    {
        let dbHostString = 'mongodb://' + this.config.host;
        if (this.config.port) dbHostString += ':' + this.config.port;
        dbHostString += '/' + this.config.database;

        this.dbHostString = dbHostString;

        this.connection = mongoose.connect(dbHostString,
        {
            useMongoClient: true,
            // sets how many times to try reconnecting
            reconnectTries: Number.MAX_VALUE,
            // sets the delay between every retry (milliseconds)
            reconnectInterval: 1000
        });
    }

    closeConnection()
    {
        mongoose.connection.close();
        this.connection = null;
    }

    dropDatabase()
    {
        return this.connection.db.dropDatabase();
    }

    hasValidId(query)
    {
        if (query.hasOwnProperty('_id')) return mongoose.Types.ObjectId.isValid(query._id);
        if (query.hasOwnProperty('id')) return mongoose.Types.ObjectId.isValid(query.id);
        return true;
    }

    addModel(modelName, schemaDef)
    {
        if (this.connection.base.models[modelName]) return;

        schemaDef.id = this.idType;
        const regularSchema = mapPropertiesToMongoose(modelName, schemaDef);
        const schema = new Schema(regularSchema,
        {
            id: true
        });

        //Add id, modified, created to all models
        schema.pre('save', function (next)
        {
            if (!this.id && this._id) this.id = this._id.toHexString();
            if (!this.created) this.created = new Date();
            this.modified = new Date();
            return next();
        });
        mongoose.model(modelName, schema);
    }

    methods(collectionName)
    {
        const dbModel = this.connection.models[collectionName];

        return {
            /* Crud */
            find: (query) =>
            {
                return dbModel.find(query).then(idReplace);

            },

            findOne: (query) =>
            {
                return dbModel.findOne(query).then(idReplace);
            },

            findById: (id) =>
            {
                return dbModel.findById(id).then(idReplace);
            },

            create: (data) =>
            {
                return dbModel.create(data).then(idReplace);
            },

            update: (id, data) =>
            {
                const query = {
                    id: id
                };
                const options = {
                    new: true,
                    upsert: false
                };
                return dbModel.findOneAndUpdate(query, data, options).then(idReplace);
            },

            updateMany: (query, data) =>
            {
                const badQueryError = new Error('Model.updateMany requires query object argument');
                if (getType(query) !== 'Object') throw badQueryError;
                if (!Object.keys(query) || !Object.keys(query).length) throw badQueryError;

                const options = {
                    multi: true
                };
                return dbModel.update(query, data, options).then(res =>
                {
                    let count = 0;
                    if (res && res.nModified) count = res.nModified;
                    return {
                        count: count
                    };

                });
            },

            delete: (id) =>
            {
                const query = {
                    id: id
                };
                return dbModel.remove(query).then(res =>
                {
                    let count = 0;
                    if (res.result && res.result.n) count = res.result.n;
                    return {
                        count: count
                    };
                });
            },

            deleteMany: (query) =>
            {
                const badQueryError = new Error('Model.deleteMany requires query object argument');
                if (getType(query) !== 'Object') throw badQueryError;
                if (!Object.keys(query) || !Object.keys(query).length) throw badQueryError;

                return dbModel.remove(query).then(res =>
                {
                    let count = 0;
                    if (res.result && res.result.n) count = res.result.n;
                    return {
                        count: count
                    };
                });
            }

        };
    }

    test()
    {
        return {
            randomId: () =>
            {
                return mongoose.Types.ObjectId();
            }
        };
    }
};

function mapPropertiesToMongoose(name, props)
{
    const typeDictionary = {
        string: String,
        number: Number,
        boolean: Boolean,
        object: Object,
        array: Array,
        date: Date,
    };

    let mongooseProperties = {};

    for (let key in props)
    {
        let topLevelProp = props[key];
        if (getType(topLevelProp) === 'String' && typeDictionary[topLevelProp.toLowerCase()])
        {
            mongooseProperties[key] = typeDictionary[topLevelProp];
            continue;
        }

        mongooseProperties[key] = {
            type: topLevelProp.type,
            required: topLevelProp.required || false,
            unique: topLevelProp.unique || false,
            // select: !topLevelProp.hidden,
        };
        if (topLevelProp.hasOwnProperty('default')) mongooseProperties[key].default = topLevelProp.default;

        if (!mongooseProperties[key].hasOwnProperty('type')) throw new Error(`Error creating model ${name}. Type is a required property of properties.${key}`);
    }
    return mongooseProperties;
}

function idReplace(collection)
{
    if (!collection) return collection;

    if (getType(collection) === 'Array')
    {
        return collection.map(idReplace);
    }

    collection = collection.toJSON();

    if (!collection.id && collection._id) collection.id = collection._id;
    delete collection._id;
    delete collection.__v;

    return collection;
}