const fs = require('fs');
const path = require('path');

/**
 * Try to find a database config file
 * First check the project root for a 'database.js'
 * Second, check 'root/config/database.js'
 */
module.exports = function (app)
{
    let dbConfig;

    let rootDBPath = `${app.projectRoot}/database.js`;
    let rootConfigDBPath = `${app.projectRoot}/config/database.js`;
    if (fs.existsSync(rootDBPath)) dbConfig = require(rootDBPath);
    else if (fs.existsSync(rootConfigDBPath)) dbConfig = require(rootConfigDBPath);
    else
        throw new Error(
            'You must provide a database config file in project-root/database.js, or project-root/config/database.js'
        );

    if (!dbConfig.host) throw new Error('Database config host property is required');
    if (!dbConfig.database) throw new Error('Database config database property is required');
    if (!dbConfig.adapter) throw new Error('Database config adapter property is required');

    const builtInAdapters = {
        'mongoose': require('../adapters/mongoose-adapter'),
        'memory': require('../adapters/memory-adapter'),
        //'file': require('../adapters/file-adapter'),
    };

    let adapter;
    if (builtInAdapters[dbConfig.adapter]) adapter = builtInAdapters[dbConfig.adapter];
    else adapter = getCustomAdapter(app.projectRoot, dbConfig.adapter);

    if (!adapter) throw new Error(`Unable to load custom database adapter ${dbConfig.adapter}. Did you install the module or include the correct file path?`);

    app.adapter = new adapter(dbConfig);
    app.adapter.addConnection();
};


//Try to get an adapter defined in a node_module or in a local, provided path
function getCustomAdapter(projectRoot, adapterName)
{
    let adapter, adapterFile;

    if (adapterName.match(path.sep))
    {
        try
        {
            return require(path.resolve(`${projectRoot}/${adapterName}`));
        }
        catch (e)
        {}
    }
    else
    {
        try
        {
            return require(adapterName);
        }
        catch (e)
        {}
    }
}