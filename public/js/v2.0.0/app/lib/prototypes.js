define([
    'app/lib/dataStore'
], (DataStore) => {
    'use strict';

    // DOM node data store ============================================================================================
    window.dataStore = new DataStore();

    /**
     * @param key
     * @param value
     * @returns {HTMLElement}
     */
    HTMLElement.prototype.setData = function(key, value){
        return window.dataStore.set(this, key, value);
    };

    /**
     * @param key
     * @returns {*}
     */
    HTMLElement.prototype.getData = function(key){
        return window.dataStore.get(this, key);
    };

    /**
     * @param key
     * @returns {*}
     */
    HTMLElement.prototype.hasData = function(key){
        return window.dataStore.has(this, key);
    };

    /**
     * @param key
     * @returns {*}
     */
    HTMLElement.prototype.removeData = function(key){
        return window.dataStore.remove(this, key);
    };

    /**
     * Array diff
     * [1,2,3,4,5].diff([4,5,6]) => [1,2,3]
     * @param a
     * @returns {*[]}
     */
    Array.prototype.diff = function(a){
        return this.filter(i => !a.includes(i));
    };

    /**
     * Array intersect
     * [1,2,3,4,5].intersect([4,5,6]) => [4,5]
     * @param a
     * @returns {*[]}
     */
    Array.prototype.intersect = function(a){
        return this.filter(i => a.includes(i));
    };

    /**
     * inverse of Array.filter(),
     * [1,2,3,4,5].not(val => val === 3)    => [1, 2, 4, 5]
     * [1,2,3,4,5].filter(val => val === 3) => [3]
     * @param callback
     * @returns {*[]}
     */
    Array.prototype.not = function(callback) {
        return this.filter((...args) => !callback(...args));
    };

    /**
     * compares two arrays if all elements in a are also in b
     * element order is ignored
     * @param a
     * @returns {boolean}
     */
    Array.prototype.equalValues = function(a){
        return this.diff(a).concat(a.diff(this)).length === 0;
    };

    /**
     * like Array.concat() + remove duplicate values
     * @see https://stackoverflow.com/a/38940354/4329969
     * @param a
     * @returns {*[]}
     */
    Array.prototype.concatFilter = function(a){
        return [...new Set([...this,...a])];
    };

    /**
     * sort array of objects by property name
     * @param p
     * @returns {Array.<T>}
     */
    Array.prototype.sortBy = function(p){
        return this.slice(0).sort((a,b) => {
            return (a[p] > b[p]) ? 1 : (a[p] < b[p]) ? -1 : 0;
        });
    };

    /**
     * capitalize first letter
     * @returns {string}
     */
    String.prototype.capitalize = function(){
        return this.charAt(0).toUpperCase() + this.slice(1);
    };

    /**
     * get hash from string
     * @returns {number}
     */
    String.prototype.hashCode = function(){
        let hash = this.split('').reduce((a,b) => (((a << 5) - a) + b.charCodeAt(0))|0, 0);
        // make positive
        return (hash + 2147483647) + 1;
    };

    String.prototype.trimLeftChars = function(charList){
        if(charList === undefined)
            charList = '\\s';
        return this.replace(new RegExp('^[' + charList + ']+'), '');
    };

    String.prototype.trimRightChars = function(charList){
        if(charList === undefined)
            charList = '\\s';
        return this.replace(new RegExp('[' + charList + ']+$'), '');
    };

    String.prototype.trimChars = function(charList){
        return this.trimLeftChars(charList).trimRightChars(charList);
    };

    return {};
});