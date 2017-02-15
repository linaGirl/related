(function() {
    'use strict';



    const log = require('ee-log');



    module.exports = class FullTextQueryBuilder {


        constructor(language, nodeType, parent) {
            if (!nodeType) {
                this.type = 'fulltext';
                if (language) this.language = language;
            }
            else {
                this.type = nodeType;
                this.children = [];
            }


            Object.defineProperty(this, 'isFulltext', {value: true});
            Object.defineProperty(this, 'parent', {value: parent});
        }




        not() {
            this.lastValue.isNot = true;
            return this;
        }




        wildcardAfter() {
            this.lastValue.hasWildcardAfter = true;
            return this;
        }




        wildcardBefore() {
            this.lastValue.hasWildcardBefore = true;
            return this;
        }





        value(value) {
            const node = new FullTextQueryBuilder(null, 'value', this);

            node.value = value;

            if (this.type === 'fulltext') this.value = node;
            else this.children.push(node);


            Object.defineProperty(this, 'lastValue', {value: node, configurable: true});

            return this;
        }



        and() {
            const node = new FullTextQueryBuilder(null, 'and', this);

            if (this.type === 'fulltext') this.value = node;
            else this.children.push(node);


            return node;
        }



        or() {
            const node = new FullTextQueryBuilder(null, 'or', this);

            if (this.type === 'fulltext') this.value = node;
            else this.children.push(node);


            return node;
        }



        up() {
            return this.parent;
        }




        getRoot() {
            return this.parent ? this.parent.getRoot() : this;
        }
    }
})();
