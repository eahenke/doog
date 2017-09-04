# Doog

## What is Doog?
 * A simple REST API builder built on top of Express.
 * Allows customized models
 * Currently supports MongoDB and memory databases

## Usage

### Database Config

In your project root, or a folder named `config` include a file named `database.js` or `database.json`. It should export an object with the format:
```
host: DATABASE_HOST,
database: DATABASE_NAME,
adapter: 'mongoose'
```

### Adding Models

#### Models list

In your project root, or a folder named `config` include a file named `models.js` or `models.json`.  It should export an array with the format:
```
[{
	modelName: YOUR_MODEL_NAME,
	public: true/false
}]
```
Public models will be exposed to the REST API.

#### Model definitions

In your project root, include a folder named `models`.  For each model included in `models.json`, include a `YOUR_MODEL_NAME.json` with the format:
```
{
	modelName: YOUR_MODEL_NAME,
	properties: {
		"PROPERTY_NAME" : {
			"type": String/Number/Boolean/Date/Array/Object,
			"default": DEFAULT_VALUE, (optional)
			"required": true/false, (optional)
			"hidden": true/false (optional)
		}
	}
}
```

#### Model logic
If you wish to include custom model logic, include a `YOUR_MODEL_NAME.js` in the `models` folder. Export a function with the following format:
```
module.exports = function(YOUR_MODEL) {
	
}
```

Model objects have the following methods:
* `hook(hookName, context)` - Runs hooks before/after certain database operations. Supported hook names are 'before save', 'after save', 'before find', 'after find', 'before delete', 'after delete'.
* `registerEndpoint(fn, options)` - Adds a custom method and endpoint to the YOUR_MODEL class.
* `addInstanceMethod(name, fn)` - Adds a method to instances of YOUR_MODEL


### Starting the app
In your main file, include doog as usual
`const app = include('doog')();`

Then start your app like any Express app.

`app.listen(PORT);`