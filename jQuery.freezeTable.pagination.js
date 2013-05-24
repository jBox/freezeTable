// ref -- jQuery.
// ref -- jQuery.freezeTable 1.1
// pagination plugin
(function ($, freezeTable, undefined) {

    function isDefined(obj) {
        return typeof obj !== 'undefined' && obj != null;
    }

    function isFunction(func) {
        return typeof func === 'function';
    }

    function log(msg) {
        if (isDefined(console)) {
            console.log(msg);
        }
    }

    function extend(obj, ext) {
        if (!obj) {
            obj = {};
        }

        var k = undefined,
            extObj = ext || {};
        for (k in extObj) {
            if (typeof (obj[k]) === 'object') {
                arguments.callee(obj[k], extObj[k]);
            } else {
                obj[k] = extObj[k];
            }
        }

        return obj;
    }

    function Pagination(table) {
        this.table = table;
        this.table.pagination = extend({
            enabled: false,
            size: 200,
            total: undefined
        }, this.table.pagination);
    }

    extend(Pagination.prototype, {
        initialize: function () {
            if (this.table.pagination.enabled == false) {
                return;
            }
        }
    });

    // register plugins
    freezeTable.plugins.pagination = Pagination;
})(jQuery, freezeTable);