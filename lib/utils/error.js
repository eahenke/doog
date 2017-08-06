/* Error Handlers */
module.exports.errorLogger = function(err, req, res, next)
{
	if (process.env.NODE_ENV !== 'production') console.error(err.stack);
	next(err);
};

module.exports.clientErrorHandler = function(err, req, res, next)
{
	res.status(err.status || 500).send({
		error: {
			status: err.status,
			message: err.message
		}
	});
};

/* Common Errors */

module.exports.badRequestError = function(message)
{
	message = message || 'Bad request';
	const error = new Error(message);
	error.status = 400;
	return error;
};

module.exports.unauthorizedError = function(message)
{
	message = message || 'Unauthorized';
	const error = new Error(message);
	error.status = 401;
	return error;
};

module.exports.notFoundError = function(message)
{
	message = message || 'Not found';
	const error = new Error(message);
	error.status = 404;
	return error;
};
