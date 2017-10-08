const bcrypt = require('bcrypt');
const unauthorizedError = require('../utils/error').unauthorizedError;
const SALT_WORK_FACTOR = 10;

module.exports = function (User)
{
    User.hook('before save', function (ctx, next)
    {
        const user = ctx.data;
        if (!user || !user.password) return next();

        bcrypt.genSalt(SALT_WORK_FACTOR, (err, salt) =>
        {
            if (err) return next(err);
            bcrypt.hash(user.password, salt, (err, hash) =>
            {
                if (err) return next(err);
                user.password = hash;
                return next();
            });
        });
    });

    User.registerEndpoint(
        function (username, password)
        {
            let user;
            const AccessToken = User.app.models.AccessToken;

            return User.findOne(
                {
                    username: username
                })
                .then(function (theUser)
                {
                    user = theUser;
                    if (!user) throw unauthorizedError();

                    return comparePassword(user, password);
                })
                .then(isMatch =>
                {
                    if (!isMatch) throw unauthorizedError();

                    return AccessToken.find(
                    {
                        userId: user.id
                    });
                })
                .then(tokens =>
                {
                    let deadTokens = [];
                    const liveTokens = [];

                    tokens.forEach(t =>
                    {
                        t.isAlive() ? liveTokens.push(t) : deadTokens.push(t);
                    });

                    if (liveTokens && liveTokens.length)
                    {
                        //Clean up any extra unused tokens
                        deadTokens = deadTokens.concat(liveTokens.slice(1));
                        return liveTokens[0];
                    }

                    //Remove dead/unused tokens, non-blocking
                    deadTokens = deadTokens.map(t => t.id);
                    if (deadTokens && deadTokens.length)
                    {
                        AccessToken.delete(
                        {
                            id:
                            {
                                $in: deadTokens
                            }
                        }).catch(() =>
                        {});
                    }
                    return AccessToken.create(
                    {
                        userId: user.id
                    });
                })
                .then(token =>
                {
                    return token;
                });
        },
        {
            name: 'login',
            exposed: true,
            private: false,
            http:
            {
                verb: 'post',
                path: '/login'
            },
            args: [
            {
                arg: 'username',
                required: true,
                type: 'string'
            },
            {
                arg: 'password',
                required: true,
                type: 'string'
            }]
        }
    );
};

//Compare password
function comparePassword(user, candidate)
{
    return new Promise((resolve, reject) =>
    {
        bcrypt.compare(candidate, user.password, (err, isMatch) =>
        {
            if (err) return reject(err);
            return resolve(isMatch);
        });
    });
}