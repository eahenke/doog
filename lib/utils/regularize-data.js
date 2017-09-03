const getType = require('./get-type');

module.exports = function (typeDefinition, obj, strict)
{
    let o = {};
    for (let key in obj)
    {
        if (!typeDefinition.hasOwnProperty(key)) continue;

        let type = getType(typeDefinition[key]) === 'Object' ? typeDefinition[key].type : typeDefinition[key];
        type = type.toLowerCase();

        if (getType(obj[key]).toLowerCase() === type) o[key] = obj[key];
        else
        {
            let castValue = castToType(obj[key], type);
            if (castValue === -1)
            {
                if (strict) continue;
                o[key] = obj[key];
            }
            else o[key] = castValue;
        }
    }
    return o;
};

function castToType(value, type)
{
    switch (type)
    {
    case 'number':
        const num = Number(value);
        return num !== num ? -1 : num;
    case 'string':
        return String(value);
    case 'boolean':
        if (value === 'false') return false;
        return !!value;
    case 'date':
        const isoRegex = /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/;
        if (!isoRegex.test(value)) return -1;
        return new Date(value);
    default:
        return -1;
    }
}