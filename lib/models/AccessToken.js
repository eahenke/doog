module.exports = function (AccessToken)
{
    AccessToken.addInstanceMethod('isAlive', function ()
    {
        const now = Math.floor(new Date().getTime() / 1000);
        const tokenCreated = Math.floor(new Date(this.created).getTime() / 1000);
        return tokenCreated + this.ttl > now;
    });
};