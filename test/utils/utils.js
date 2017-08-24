const getType = require('../../lib/utils/get-type');
const regularizeData = require('../../lib/utils/regularize-data');

describe('Utilities testing suite', () =>
{
    describe('getType utility', () =>
    {
        const typeDict = {
            "Null": null,
            "Undefined": undefined,
            "String": 'string',
            "Number": 1,
            "Boolean": true,
            "Array": [],
            "Object":
            {},
            "Function": function () {}
        };

        it('should return correct type', done =>
        {
            for (let key in typeDict)
            {
                expect(getType(typeDict[key])).to.equal(key)
            }
            done();
        });
    });

    describe('regularizeData', () =>
    {
        //Incastables should be excluded from result
        describe('regularizeData, strict', () =>
        {
            describe('string', () =>
            {
                const defObj = {
                    string:
                    {
                        type: 'string'
                    }
                };
                const defString = {
                    string: 'string'
                };

                const defs = [defObj, defString];

                defs.forEach(def =>
                {
                    it(getPrefix(def.string) + 'should cast to string', done =>
                    {
                        const regular = regularizeData(def,
                        {
                            string: 1
                        }, true);
                        checkTypeCast('string', regular.string, 'string');
                        done();
                    });
                });
            });

            describe('number', () =>
            {
                const defObj = {
                    number:
                    {
                        type: 'number'
                    }
                };
                const defString = {
                    number: 'number'
                };

                const defs = [defObj, defString];

                defs.forEach(def =>
                {
                    it(getPrefix(def.number) + 'should cast to number', done =>
                    {
                        const regular = regularizeData(def,
                        {
                            number: '1'
                        }, true);
                        checkTypeCast('number', regular.number, 'number');
                        done();
                    });
                });
            });

            describe('boolean', () =>
            {
                const defObj = {
                    boolean:
                    {
                        type: 'boolean'
                    }
                };
                const defString = {
                    boolean: 'boolean'
                };

                const defs = [defObj, defString];

                defs.forEach(def =>
                {
                    it(getPrefix(def.boolean) + 'should cast to boolean', done =>
                    {
                        const regular = regularizeData(def,
                        {
                            boolean: 'false'
                        }, true);
                        checkTypeCast('boolean', regular.boolean, 'boolean');
                        done();
                    });
                });
            });

            describe('date', () =>
            {
                const defObj = {
                    date:
                    {
                        type: 'date'
                    }
                };
                const defString = {
                    date: 'date'
                };

                const defs = [defObj, defString];

                defs.forEach(def =>
                {
                    it(getPrefix(def.date) + 'should cast to date', done =>
                    {
                        const regular = regularizeData(def,
                        {
                            date: '2001-01-01T00:00:00+00:00'
                        }, true);
                        checkTypeCast('date', regular.date, 'date');
                        done();
                    });

                    it(getPrefix(def.date) + 'should NOT cast to date and discard', done =>
                    {
                        const regular = regularizeData(def,
                        {
                            date: '01/01/2001'
                        }, true);
                        checkTypeNotIncluded('date', regular.date, 'date');
                        done();
                    });
                });
            });

            describe('array', () =>
            {
                const defObj = {
                    array:
                    {
                        type: 'array'
                    }
                };
                const defString = {
                    array: 'array'
                };

                const defs = [defObj, defString];

                defs.forEach(def =>
                {
                    it(getPrefix(def.array) + 'should NOT cast to array and discard', done =>
                    {
                        const regular = regularizeData(def,
                        {
                            array: '["stringified array"]'
                        }, true);
                        checkTypeNotIncluded('array', regular.array, 'array');
                        done();
                    });
                });
            });

            describe('object', () =>
            {
                const defObj = {
                    object:
                    {
                        type: 'object'
                    }
                };
                const defString = {
                    object: 'object'
                };

                const defs = [defObj, defString];

                defs.forEach(def =>
                {
                    it(getPrefix(def.object) + 'should NOT cast to object and discard', done =>
                    {
                        const regular = regularizeData(def,
                        {
                            object: '{"stringified": "object"}'
                        }, true);
                        checkTypeNotIncluded('object', regular.object, 'object');
                        done();
                    });
                });
            });
        });

        //Incastables should be included in result
        describe('regularizeData, non-strict', () =>
        {
            describe('string', () =>
            {
                const defObj = {
                    string:
                    {
                        type: 'string'
                    }
                };
                const defString = {
                    string: 'string'
                };

                const defs = [defObj, defString];

                defs.forEach(def =>
                {
                    it(getPrefix(def.string) + 'should cast to string', done =>
                    {
                        const regular = regularizeData(def,
                        {
                            string: 1
                        }, false);
                        checkTypeCast('string', regular.string, 'string');
                        done();
                    });
                });
            });

            describe('number', () =>
            {
                const defObj = {
                    number:
                    {
                        type: 'number'
                    }
                };
                const defString = {
                    number: 'number'
                };

                const defs = [defObj, defString];

                defs.forEach(def =>
                {
                    it(getPrefix(def.number) + 'should cast to number', done =>
                    {
                        const regular = regularizeData(def,
                        {
                            number: '1'
                        }, false);
                        checkTypeCast('number', regular.number, 'number');
                        done();
                    });
                });
            });

            describe('boolean', () =>
            {
                const defObj = {
                    boolean:
                    {
                        type: 'boolean'
                    }
                };
                const defString = {
                    boolean: 'boolean'
                };

                const defs = [defObj, defString];

                defs.forEach(def =>
                {
                    it(getPrefix(def.boolean) + 'should cast to boolean', done =>
                    {
                        const regular = regularizeData(def,
                        {
                            boolean: 'false'
                        }, false);
                        checkTypeCast('boolean', regular.boolean, 'boolean');
                        done();
                    });
                });
            });

            describe('date', () =>
            {
                const defObj = {
                    date:
                    {
                        type: 'date'
                    }
                };
                const defString = {
                    date: 'date'
                };

                const defs = [defObj, defString];

                defs.forEach(def =>
                {
                    it(getPrefix(def.date) + 'should cast to date', done =>
                    {
                        const regular = regularizeData(def,
                        {
                            date: '2001-01-01T00:00:00+00:00'
                        }, false);
                        checkTypeCast('date', regular.date, 'date');
                        done();
                    });

                    it(getPrefix(def.date) + 'should NOT cast to date or discard', done =>
                    {
                        const regular = regularizeData(def,
                        {
                            date: '01/01/2001'
                        }, false);
                        checkTypeNotCast('date', regular.date, 'date');
                        done();
                    });
                });
            });

            describe('array', () =>
            {
                const defObj = {
                    array:
                    {
                        type: 'array'
                    }
                };
                const defString = {
                    array: 'array'
                };

                const defs = [defObj, defString];

                defs.forEach(def =>
                {
                    it(getPrefix(def.array) + 'should NOT cast to array or discard', done =>
                    {
                        const regular = regularizeData(def,
                        {
                            array: '["stringified array"]'
                        }, false);
                        checkTypeNotCast('array', regular.array, 'array');
                        done();
                    });
                });
            });

            describe('object', () =>
            {
                const defObj = {
                    object:
                    {
                        type: 'object'
                    }
                };
                const defString = {
                    object: 'object'
                };

                const defs = [defObj, defString];

                defs.forEach(def =>
                {
                    it(getPrefix(def.object) + 'should NOT cast to object or discard', done =>
                    {
                        const regular = regularizeData(def,
                        {
                            object: '{"stringified": "object"}'
                        }, false);
                        checkTypeNotCast('object', regular.object, 'object');
                        done();
                    });
                });
            });
        });

        function getPrefix(prop)
        {
            return prop.type ? 'object format - ' : 'string format - ';
        }

        function checkTypeCast(name, value, type)
        {
            expect(value, `regular.${name} was not cast to ${type}`).to.exist;
            expect(getType(value).toLowerCase(), `regular.${name} was not cast to ${type}`).to.equal(type);
        }

        function checkTypeNotCast(name, value, type)
        {
            expect(value, `regular.${name} was incorrectly excluded from regularizeData`).to.exist;
            expect(getType(value).toLowerCase(), `regular.${name} was incorrectly cast to ${type}`).to.not.equal(type);
        }

        function checkTypeNotIncluded(name, value, type)
        {
            expect(value, `invalid typed regular.${name} was not excluded from regularized data`).to.not.exist;
        }
    });

});