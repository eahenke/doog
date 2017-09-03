const unauthorizedError = require('./error').unauthorizedError;
const regularizeData = require('./regularize-data');

module.exports.tokenMiddleWare = function (app, options, req, res, next)
{
    if (options.exposed) return next();
    return isValidToken(app, req.query.access_token)
        .then(valid =>
        {
            if (!valid) return next(unauthorizedError());
            //Clear token from query to prevent being used as a search term
            delete req.query.access_token;
            return next();
        })
        .catch(next);
};

function isValidToken(app, tokenId)
{
    if (!tokenId || !isValidTokenFormat(app, tokenId)) return Promise.resolve(false);
    return app.models.AccessToken.findById(tokenId).then(token =>
    {
        return token ? token.isAlive() : false;
    });
}

function isValidTokenFormat(app, tokenId)
{
    let query = {
        id: tokenId
    };
    query = regularizeData(app.models.AccessToken.modelProperties, query);
    if (app.adapter.hasValidId) return app.adapter.hasValidId(query);
    else return true;
}