module.exports = function (ctx, hooks)
{
    let count = -1;
    return new Promise((resolve, reject) =>
    {
        function runNext(err)
        {
            if (err) return reject(err);
            count++;
            if (count === hooks.length) return resolve(ctx);
            hooks[count](ctx, runNext);
        }
        runNext();
    });
};