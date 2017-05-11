{
    'use strict';



    const log = require('ee-log');







    // comparator whitelist
    const comparators = new Map();

    comparators.set('>', 'gt');
    comparators.set('<', 'lt');
    comparators.set('>=', 'gte');
    comparators.set('<=', 'lte');
    comparators.set('!=', 'notEqual');
    comparators.set('=', 'equal');

    comparators.set('like', 'like');
    comparators.set('notLike', 'notLike');
    comparators.set('in', 'in');
    comparators.set('notIn', 'notIn');
    comparators.set('notNull', 'notNull');
    comparators.set('isNull', 'isNull');
    comparators.set('equal', 'equal');
    comparators.set('not', 'not');
    comparators.set('is', 'is');








    module.exports = class FilterBuilder {



        constructor(queryBuilder) {
            this.queryBuilder = queryBuilder;
            this.Related = require('../');
        }





        build(filter) {
            return this._build(filter, this.queryBuilder);
        }





        _build(filter, queryBuilder, container, property) {
            let processChildren = true;

            // if the children of a comparator are functions,
            // we can safely ignore the comparator and process
            // the filter instead
            if (filter.type === 'comparator' && 
                filter.comparator === '=' && 
                filter.children.length === 1 && 
                filter.children[0].type === 'function') {
                filter = filter.children[0];
            }



            switch (filter.type) {
                case 'root':
                    if (!container) {
                        container = [];
                        container.mode = 'and';
                    }


                case 'and':
                case 'or':
                    const newContainer = [];
                    newContainer.mode = filter.type;
                    container.push(newContainer);

                    // overwrite pointer, so that it can be passed to 
                    // the children
                    container = newContainer;
                    break;


                case 'entity':

                    // get the next level of queryBuilders
                    queryBuilder = queryBuilder.leftJoin(filter.entityName, true);
                    break;


                case 'property':

                    // set the property so that it can be used later
                    property = filter.propertyName;
                    break;


                case 'comparator':
                case 'function':

                    // build the filter object
                    const alias = queryBuilder.getresource().getAliasName();
                    const filterObject = {};
                    filterObject[alias] = {};
                    filterObject[alias][property] = this.getFilterValues(filter.comparator || filter.functionName, filter.children);
                    container.push(filterObject);
                    processChildren = false;
                    break;



                default: 
                    throw new Error(`Unexpected filter node '${filter.type}'. Did you specify the property & comparator to filter with?`);
            }



            if (processChildren && filter.children && filter.children.length) {
                for (const child of filter.children) {
                    this._build(child, queryBuilder, container, property);
                }
            }


            return container;
        }







        getFilterValues(comparator, children) {
            if (!comparators.has(comparator)) throw new Error(`The comparator or function '${comparator}' is not supported!`);
            else {
                if (children.length === 0) return null;
                else {
                    const values = [];

                    for (const node of children) {
                        if (node.type === 'value') {
                            values.push(node.nodeValue);
                        }
                        else throw new Error(`Expected a value filter node, got ${node.type} instead!`);
                    }

                    return this.Related[comparators.get(comparator)](...values);
                }
            }
        }
    }
}