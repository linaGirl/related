{
    'use strict';

    const log = require('ee-log');
    const assert = require('assert');
    const FilterBuilder = require('../lib/FilterBuilder');




    class QueryBuilder {

        constructor(entity, id = 0) {
            this.id = id;
            this.entity = entity;
        }


        leftJoin(entity) {
            return new QueryBuilder(entity, ++this.id);
        }



        getresource() {
            const context = this;

            return {
                getAliasName() {
                    return `${context.entity}-${context.id}`;
                }
            }
        }
    }






    const filter = {
          type: "root"
        , children:[
            {
                  type: "and"
                , children:[
                      {
                          type: "entity"
                        , children:[
                            {
                                  type: "and"
                                , children:[
                                      {
                                          type: "property"
                                        , children:[
                                            {
                                                  type: "comparator"
                                                , children:[
                                                    {
                                                          type: "value"
                                                        , children:[]
                                                        , nodeValue: "2017-05-11T11:26:05.926Z"
                                                    }
                                                ]
                                                , comparator: "<="
                                            }
                                        ]
                                        , propertyName: "issueDate"
                                    }
                                    , {
                                          type: "property"
                                        , children:[
                                            {
                                                  type: "comparator"
                                                , children:[
                                                    {
                                                          type: "value"
                                                        , children:[]
                                                        , nodeValue: false
                                                    }
                                                ]
                                                , comparator: "="
                                            }
                                        ]
                                        , propertyName: "hidden"
                                    }
                                ]
                            }
                        ]
                        , entityName: "issue"
                    }
                    , {
                          type: "entity"
                        , children:[
                            {
                                  type: "property"
                                , children:[
                                    {
                                          type: "comparator"
                                        , children:[
                                            {
                                                  type: "value"
                                                , children:[]
                                                , nodeValue: "moments"
                                            }
                                        ]
                                        , comparator: "="
                                    }
                                ]
                                , propertyName: "identifier"
                            }
                        ]
                        , entityName: "blog"
                    }
                    , {
                          type: "property"
                        , children:[
                            {
                                  type: "comparator"
                                , children:[
                                    {
                                          type: "value"
                                        , children:[]
                                        , nodeValue: false
                                    }
                                ]
                                , comparator: "="
                            }
                        ]
                        , propertyName: "hidden"
                    }
                    , {
                          type: "property"
                        , children:[
                            {
                                  type: "comparator"
                                , children:[
                                    {
                                          type: "value"
                                        , children:[]
                                        , nodeValue: false
                                    }
                                ]
                                , comparator: "="
                            }
                        ]
                        , propertyName: "private"
                    }
                ]
            }
        ]
    }





    describe(`FilterBuilder`, () => {
        it('should not crash when instantiated', () => {
            new FilterBuilder();
        });


        it('should render filter objects correctly', () => {
            const builder = new FilterBuilder(new QueryBuilder('post'));
            const relatedFilter = builder.build(filter);
            assert.equal(JSON.stringify(relatedFilter), '[[[{"issue-1":{}},{"issue-1":{}}],{"blog-2":{}},{"post-2":{}},{"post-2":{}}]]');
        });
    });
}