// ref -- jQuery.
// jQuery.freezeTable 1.1
// latest updated: 05/2013
// DEMO: http://weij-7w:8066/examples.html
(function ($, undefined) {

    var viewsContainerTemplate = '<div class="table-container" style="overflow: hidden; position: absolute; z-index: 4;"></div>',
        freezeCornerContainerTemplate = '<div style="background-color: white; overflow: hidden; position: absolute; z-index: 3;"></div>',
        freezeSideContainerTemplate = '<div style="background-color: white; overflow: hidden; position: absolute; z-index: 2;"></div>',
        freezeHeaderContainerTemplate = '<div style="background-color: white; overflow: hidden; position: absolute; z-index: 1;"></div>',
        freezeFullContainerTemplate = '<div style="background-color: white; position: absolute; z-index: 0; overflow: auto;"></div>',
        resizeBarTemplate = '<div class="freeze-column-resize-bar" style="width: 5px; position: absolute; z-index: 10; display: none;"></div>',
        resizeLineTemplate = '<div class="columns-resize-line" style="position: absolute; z-index: 10; display: none;"></div>',
        tooltipTemplate = '<div class="freezetable-tooltip" style="position: absolute; z-index: 9999; display: none; "></div>';

    // global var.
    var primaryMouseButton = 1,
        pluginsDelayInit = 200;

    function isDefined(obj) {
        return typeof obj !== 'undefined' && obj != null;
    }
    function isFunction(func) {
        return typeof func === 'function';
    }
    function isArray(arr) {
        return isDefined(arr) && arr instanceof Array;
    }

    function log(msg) {
        if (isDefined(console)) {
            console.log(msg);
        }
    }

    function object(obj) {
        function F() { }
        F.prototype = obj;
        return new F();
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

    function inherit(sub, base) {
        var prototype = object(base.prototype);
        prototype.constructor = sub;
        sub.prototype = prototype;
    }

    function EventsModule() {
        this.handlers = {};
    }

    extend(EventsModule.prototype, {
        bind: function (event, callback, thisArg) {
            if (isDefined(this.handlers[event]) == false) {
                this.handlers[event] = [];
            }

            this.handlers[event].push({ callback: callback, arg: thisArg });

            return this;
        },
        trigger: function (event, obj) {
            if (isDefined(this.handlers[event]) == false) {
                this.handlers[event] = [];
            }

            var handlers = this.handlers[event],
                i = handlers.length - 1;

            for (; i >= 0; i--) {
                try {
                    var h = handlers[i];
                    if (isFunction(h.callback)) {
                        h.callback.call(h.arg, this, obj);
                    }
                } catch (ex) {
                    log(ex);
                }
            }

            return this;
        },
        remove: function (event) {
            if (isDefined(this.handlers[event])) {
                this.handlers[event] = [];
            }
        }
    });

    // FreezeTable ------------------------------- GO
    /*
    * defined events: sizeChanged, scroll, click, columnResized
    */
    function FreezeTable(option) {
        EventsModule.call(this);
        // default option for freeze table.
        extend(this, {
            container: $(option.container),

            header: {
                freezed: true,
                click: undefined,
                formatter: undefined
            },

            columns: {
                resizable: true,
                click: undefined,
                formatter: undefined,
                initWidth: 120,
                tooltip: {
                    enabled: false,
                    htmlLabel: true,
                    formatter: undefined
                },
                frozenColumns: {
                    /*
                    * frozen columns count，>=0
                    */
                    count: 1,
                    /*
                    * set up initial width for every frozen columns, def: [260]
                    */
                    widths: [260], // not null
                    resizable: true,
                    tooltip: {
                        enabled: true,
                        htmlLabel: true,
                        formatter: undefined
                    }
                }
            },

            layout: {
                tableClass: 'separate content-table',
                theadClass: 'table-thead',
                tbodyClass: 'table-tbody',

                width: 1024, // auto, base on its parent's width.
                height: 600,  // auto, base on its parent's height.
                minWidth: 500,
                minHeight: 300,
                maxWidth: undefined,
                maxHeight: undefined,

                /*
                * fixed | fill | portrait | landscape | extend
                * fixed: spec width，height，and it will ignore minWidth，minHeight，maxWidth，maxHeight
                * fill: auto fill to the browser, minWidth, minHeight, maxWidth, maxHeight works，options: maxWidth，maxHeight
                * landscape: landscape auto fill to the browser, minWidth, maxWidth works, options: maxWidth
                * portrait: portrait auto fill to the browser, minHeight, maxHeight works, options: maxHeight
                * extend: extend
                */
                stretch: 'fixed'
            },

            scrollbar: {
                enhanced: true,
                style: 'system'
            },

            delay: {
                enabled: true,
                size: 200
            },

            dataSource: {
                columns: [],
                rows: []
            }
        });

        // remove container
        if (typeof option.container !== 'undefined') {
            delete option.container;
        }

        // extend from user settings.
        extend(this, option);

        this.views = {};
        this.mainview = undefined;
        this.viewsContainer = $(viewsContainerTemplate);
        this.mousemover = new Mousemover();
        this.tooltip = new Tooltip(this.tooltipTemplate, this.mousemover);

        // init layout.
        initializeLayout(this);

        // init.
        drawTable(this);

        this.columnsResizer = new ColumnsResizer(this);

        initailizeClickHandlers(this);

        // plugins, delay to initialize.
        (function (table) {
            setTimeout(function () {
                initializePlugins(table);
            }, pluginsDelayInit);
        })(this);
    }

    inherit(FreezeTable, EventsModule);

    extend(FreezeTable.prototype, {
        plugins: {},

        redraw: function (dataSource) {
            this.dataSource = dataSource || this.dataSource;
            drawTable(this);

            this.trigger('redraw');
        },

        width: function (width) {
            var mainview = this.mainview,
                freezeWidth = 0;

            this.layout.width = width;
            this.container.width(width);
            this.viewsContainer.width(width);

            if (this.columns.frozenColumns.count > 0) {
                freezeWidth = this.views['side'].container.width();
            }

            mainview.container.width(width - freezeWidth);

            this.trigger('sizeChanged', { width: width, height: this.layout.height });
        },

        height: function (height) {
            var mainview = this.mainview,
                theadHeight = 0;

            this.layout.height = height;
            this.container.height(height);
            this.viewsContainer.height(height);

            if (this.header.freezed) {
                theadHeight = mainview.theadHeight();
            }

            mainview.container.height(height - theadHeight);

            this.trigger('sizeChanged', { height: height, width: this.layout.width });
        },

        scrollLeft: function (left) {
            if (isDefined(left)) {
                this.mainview.container.scrollLeft(left);
                return this;
            }

            return this.mainview.container.scrollLeft();
        },

        scrollTop: function (top) {
            if (isDefined(top)) {
                this.mainview.container.scrollTop(top);
                return this;
            }

            return this.mainview.container.scrollTop();
        }
    });

    function drawTable(table) {
        // fisrt of all.
        var viewsContainer = table.viewsContainer;
        var container = table.container;
        var layout = table.layout;

        container.html(viewsContainer);
        container.width(layout.width).height(layout.height);
        viewsContainer.width(layout.width).height(layout.height);

        var dataSource = { columns: table.dataSource.columns, rows: table.dataSource.rows };
        if (table.delay.enabled) {
            dataSource.rows = table.dataSource.rows.slice(0, table.delay.size);
        }

        table.mainview = new MainView(table);
        table.mainview.render(dataSource);

        table.views['corner'] = new CornerView(table);
        table.views['side'] = new SideView(table);
        table.views['top'] = new TopView(table);
        for (var t in table.views) {
            table.views[t].render(dataSource);
        }
    }

    function initializeLayout(table) {
        var layout = table.layout,
            stretchpattern = /^(fixed|fill|portrait|landscape|extend)$/g;
        if (stretchpattern.test(layout.stretch) == false) {
            layout.stretch = 'fixed';
        }

        function portraitSize(win) {
            var resizeHeight,
                windowHeight = $(win).height() - 30,
                containerOffsetTop = table.container.offset().top;

            resizeHeight = windowHeight - containerOffsetTop;
            if (resizeHeight < layout.minHeight) {
                resizeHeight = layout.minHeight;
            } else if (typeof layout.maxHeight === 'number' && resizeHeight > layout.maxHeight) {
                resizeHeight = layout.maxHeight;
            }
            return resizeHeight;
        }

        function landscapeSize(win) {
            var resizeWidth = $(win).width() - 50;

            if (resizeWidth < layout.minWidth) {
                resizeWidth = layout.minWidth;
            } else if (typeof layout.maxWidth === 'number' && resizeWidth > layout.maxWidth) {
                resizeWidth = layout.maxWidth;
            }

            return resizeWidth;
        }

        if (layout.stretch == 'portrait' || layout.stretch == 'fill') {
            layout.height = portraitSize(window);
            $(window).bind('resize', function () {
                table.height(portraitSize(this/*window*/));
            });
        }

        if (layout.stretch == 'landscape' || layout.stretch == 'fill') {
            layout.width = landscapeSize(window);
            $(window).bind('resize', function () {
                table.width(landscapeSize(this/*window*/));
            });
        }
    }

    function initailizeClickHandlers(table) {
        function headerClickHandler(event) {
            try {
                // find data-sequence
                var $th = $(event.target);
                if (event.target.nodeName != 'TH') {
                    var pth = $th.parents('th:first');
                    if (pth.length != 0) {
                        $th = pth;
                    } else {
                        // not found
                        $th = undefined;
                    }
                }

                if ($th) {
                    var index = parseInt($th.attr('data-sequence'));
                    table.header.click.call(table, table.dataSource.columns[index], index);

                    return false;
                }
            } catch (ex) { /*ignore.*/ }

            return true;
        }

        function contentClickHandler(event) {
            try {
                // find data-sequence
                var $td = $(event.target);
                if (event.target.nodeName != 'TD') {
                    var ptd = $td.parents('td:first');
                    if (ptd.length != 0) {
                        $td = ptd;
                    } else {
                        // not found
                        $td = undefined;
                    }
                }

                if ($td) {
                    var pstr = $td.attr('pos'),
                        pos = pstr.split(',');
                    if (pos.length == 2) {
                        var row = table.dataSource.rows[pos[0]],
                            cell = row[pos[1]];

                        return table.columns.click.call(event.target, row, cell, pstr);
                    }
                }
            } catch (ex) { /*ignore.*/ }

            return true;
        }

        if (isFunction(table.header.click)) {
            table.container.bind('click', headerClickHandler);
        }

        if (isFunction(table.columns.click)) {
            table.container.bind('click', contentClickHandler);
        }
    }

    /*
    * call from FreezeTable.
    * this is instance of FreezeTable.
    */
    function initializePlugins(table) {
        var plugins = table.plugins,
            name = undefined;
        for (name in plugins) {
            try {
                var plugin = plugins[name];
                if (isFunction(plugin)) {
                    plugin = new plugin(table);
                }

                if (isFunction(plugin.initialize)) {
                    plugin.initialize.call(plugin, table);
                }
            } catch (ex) {
            }
        }
    }

    // views
    function BaseView(freeze, type, template) {
        this.freeze = freeze;

        this.type = type || 'main'; // ps: mian / side / corner / top
        this.tableClass = freeze.layout.tableClass || '';
        this.theadClass = freeze.layout.theadClass || '';
        this.tbodyClass = freeze.layout.tbodyClass || '';
        this.container = $(template);
        this.table = {};
        this.spec = undefined;
    }
    extend(BaseView.prototype, {
        find: function (selector) {
            return this.table.find(selector);
        },

        theadHeight: function () {
            return this.find('thead').height();
        },
        /*
        * gets th real width
        */
        thCellsWidth: function () {
            var widths = [0],
                realwidths = [],
                i = 0,
                len = 0;
            if (this.table) {
                var cells = this.find('th');
                cells.each(function (index, value) {
                    widths[index] = $(value).offset().left;
                });

                widths[widths.length] = this.table.width() + this.table.offset().left;
                len = widths.length - 1;
                for (i = 0; i < len; i++) {
                    realwidths.push(widths[i + 1] - widths[i]);
                }
            }

            return realwidths;
        },
        /*
        * frozenCount
        * freezeWidth
        * headerHeight
        * tableHeight
        * hiddenWidth
        */
        getSpec: function () {
            if (isDefined(this.spec) == false) {
                var full = this.freeze.mainview,
                    columns = this.freeze.columns,
                    fullcellswidth = full.thCellsWidth(),
                    headercells = full.find('th'),
                    fwidths = columns.frozenColumns.widths,
                    frozenCount = columns.frozenColumns.count,
                    freezeWidth = 0,
                    hiddenWidth = 0,
                    i = 0;

                for (i = frozenCount - 1; i >= 0; i--) {
                    hiddenWidth += fullcellswidth[i];
                    freezeWidth += (fwidths[i] || fwidths[0]);
                }

                this.spec = {
                    frozenCount: frozenCount,
                    freezeWidth: freezeWidth,
                    theadHeight: full.theadHeight(),
                    headerHeight: headercells.height(),
                    tableHeight: full.table.height(),
                    tableWidth: full.table.width(),
                    hiddenWidth: hiddenWidth
                };
            }

            return this.spec;
        }
    });

    function MainView(freeze) {
        BaseView.call(this, freeze, 'main', freezeFullContainerTemplate);
        this.loadingIndex = 0;
        this.isDelayLoading = false;

        // scroll
        freeze.remove('scroll');
        var scroll = new Scroller(this.container);
        scroll.bind('horizontal-bar', function (pos) {
            this.trigger('scroll', { position: pos, direction: 'horizontal' });
            this.columnsResizer.reset();
        }, freeze);
        scroll.bind('vertical-bar', function (pos) {
            this.trigger('scroll', { position: pos, direction: 'vertical' });
        }, freeze);

        this.container
            .bind('mouseover', function (event) {
                var tp = freeze.columns.tooltip;
                if (tp.enabled) {
                    if (event.target.nodeName == 'TD') {
                        if (isFunction(tp.formatter) == false) {
                            tp.formatter = function (target) {
                                return $(target).text();
                            };
                        }
                        freeze.tooltip.show(tp.formatter(event.target), tp.htmlLabel);
                    }
                    return false;
                }
                return true;
            }).bind('mouseleave', function (event) {
                if (freeze.columns.tooltip.enabled) {
                    freeze.tooltip.hide();
                    return false;
                }
                return true;
            });

        if (freeze.delay.enabled) {
            var delayHandler = function (index, size, total) {
                // add 10/9
                var s = Math.floor(Math.pow((10 / 9), (index - 2)) * size),
                    e = Math.floor(Math.pow((10 / 9), (index - 1)) * size);

                if (e >= total) {
                    return;
                }

                var source = this.dataSource.rows.slice(s, e);
                this.mainview.append(source);
                if (this.columns.frozenColumns.count > 0) {
                    this.views['side'].append(source, this.columns.frozenColumns.count);
                }
            };

            freeze.bind('scroll', function (table, obj) {
                if (obj.direction == 'vertical') {
                    var container = this.container;
                    var thisHeight = container.height();
                    var offsetlimit = Math.floor(thisHeight / 4);
                    var topOffset = container[0].scrollHeight - container.scrollTop() - thisHeight;
                    if (!this.isDelayLoading && topOffset <= offsetlimit) {
                        this.isDelayLoading = true;

                        try {
                            delayHandler.call(table, ++this.loadingIndex, table.delay.size, table.dataSource.rows.length);
                        } catch (ex) {
                            /*ignore*/
                            log(ex);
                        }
                        this.isDelayLoading = false;
                    }
                }
            }, this);
        }

        freeze.bind('column-resize-complete', this.columnsResizedHandler, this);
    }
    inherit(MainView, BaseView);
    extend(MainView.prototype, {
        render: function (dataSource) {
            var layout = this.freeze.layout,
                columns = this.freeze.columns,
                header = this.freeze.header,
                initWidth = columns.initWidth,
                layoutWidth = layout.width,
                frozenCount = columns.frozenColumns.count,
                frozenWidths = columns.frozenColumns.widths,
                headerFormatter = header.formatter,
                contentFormatter = columns.formatter,
                tableHtml = ['<table class="' + layout.tableClass + '">'],
                theadHtml = ['<thead class="' + layout.theadClass + '">'],
                tbodyHtml = ['<tbody class="' + layout.tbodyClass + '">'];

            if (this.freeze.columns.resizable) {
                // cal width.
                var totalWidth = initWidth * dataSource.columns.length,
                    mainWidth = initWidth * (dataSource.columns.length - frozenCount),
                    i = 0,
                    fwidths = 0;

                for (i = 0; i < frozenCount; i++) {
                    if (frozenWidths[i]) {
                        fwidths += frozenWidths[i];
                    } else {
                        fwidths += frozenWidths[0];
                    }
                }

                if (mainWidth < (layoutWidth - fwidths)) {
                    initWidth = Math.floor((layoutWidth - fwidths) / (dataSource.columns.length - frozenCount));
                    totalWidth = initWidth * dataSource.columns.length;
                }

                /*importent!*/
                tableHtml = ['<table class="' + layout.tableClass + '" style="table-layout: fixed; width: ' + totalWidth + 'px;">'];
            }

            // build thead
            theadHtml[theadHtml.length] = buildHeaderRows(dataSource.columns, headerFormatter);
            theadHtml[theadHtml.length] = '</thead>';

            // build tbody
            tbodyHtml[tbodyHtml.length] = buildContentRows(dataSource.rows, contentFormatter);
            tbodyHtml[tbodyHtml.length] = '</tbody>';

            // build table
            tableHtml[tableHtml.length] = theadHtml.join('');
            tableHtml[tableHtml.length] = tbodyHtml.join('');
            tableHtml[tableHtml.length] = '</table>';

            this.container.html(tableHtml.join(''));
            this.table = this.container.children('table');

            this.freeze.viewsContainer.html(this.container);
            this.container.height(layout.height).width(layout.width);

            /* importent!! set height to style */
            var cells = this.find('th');
            cells.height(cells.height());
        },
        append: function (rows) {
            this.find('tbody:first').append(buildContentRows(rows, this.contentFormatter));
        },
        /*
        * position: {start : 0, offset : 0}
        * freezetable: table
        */
        columnsResizedHandler: function (freezetable, position/*{start, offset}*/) {
            var thistable = this.table,
                gap = undefined,
                cells = this.find('th'),
                i = 0,
                len = cells.length;

            var tableleft = thistable.offset().left + thistable.width();
            if (position.start <= tableleft + 10 && position.start >= tableleft - 10) {
                gap = cells.last(); // 
            } else {
                // others
                for (i = freezetable.columns.frozenColumns.count + 1; i < len; i++) {
                    var c = $(cells[i]),
                        left = c.offset().left;

                    if (position.start <= left + 10 && position.start >= left - 10) {
                        gap = $(cells[i - 1]); // 
                        break;
                    }
                }
            }

            if (isDefined(gap)) {
                var finalGapWidth = 0,
                    finalViewWidth = 0;
                if (freezetable.header.freezed) {
                    var topview = freezetable.views['top'].table,
                        topviewwidth = topview.width(),
                        topviewGap = topview.find('th[data-sequence="' + gap.attr('data-sequence') + '"]:first'),
                        topviewGapWidth = topviewGap.width();

                    if (topviewGapWidth + position.offset < 50) {
                        position.offset = 50 - topviewGapWidth;
                    }

                    topview.width(topviewwidth + position.offset);
                    topviewGap.width(topviewGapWidth + position.offset);

                    finalViewWidth = topview.width();
                    finalGapWidth = topviewGap.width();
                } else {
                    finalGapWidth = gap.width();
                    finalViewWidth = thistable.width();
                    if (finalGapWidth + position.offset < 50) {
                        position.offset = 50 - finalGapWidth;
                    }

                    finalGapWidth += position.offset;
                    finalViewWidth += position.offset;
                }

                thistable.width(finalViewWidth);
                gap.width(finalGapWidth);

                freezetable.trigger('mainViewChanged');
                return true;
            }

            return false;
        }
    });

    function CornerView(freeze) {
        BaseView.call(this, freeze, 'corner', freezeCornerContainerTemplate);
    }
    inherit(CornerView, BaseView);
    extend(CornerView.prototype, {
        render: function (dataSource) {
            if (this.freeze.header.freezed && this.freeze.columns.frozenColumns.count > 0) {

                var spec = this.getSpec(),
                    layout = this.freeze.layout,
                    header = this.freeze.header,
                    columns = this.freeze.columns,
                    fwidths = columns.frozenColumns.widths,
                    i = 0;

                var tableHtml = ['<table class="' + layout.tableClass + '" style="table-layout: fixed; width: ' + spec.freezeWidth + 'px; height: ' + spec.headerHeight + 'px;"><thead class="' + layout.theadClass + '">'];
                tableHtml[tableHtml.length] = buildHeaderRows(dataSource.columns.slice(0, spec.frozenCount), header.formatter, spec.headerHeight);
                tableHtml[tableHtml.length] = '</thead></table>';

                this.container.width(spec.freezeWidth).html(tableHtml.join(''));
                this.table = this.container.children('table');

                this.freeze.viewsContainer.append(this.container);

                // set up columns width
                if (spec.frozenCount > 1 && fwidths.length > 1) {
                    var columnHeaders = this.find('th'),
                        baseWidth = 0,
                        len = columnHeaders.length;

                    for (i = 0; i < len; i++) {
                        baseWidth += $(columnHeaders[i]).width();
                    }

                    len = fwidths.length;
                    var times = baseWidth / spec.freezeWidth;
                    for (i = 0; i < len; i++) {
                        $(columnHeaders[i]).width(fwidths[i] * times);
                    }
                }
            }
        }
    });

    function TopView(freeze) {
        BaseView.call(this, freeze, 'top', freezeHeaderContainerTemplate);

        if (freeze.header.freezed) {
            var marginOffset = 0;
            freeze.bind('scroll', function (ftable, obj) {
                if (obj.direction == 'horizontal') {
                    var left = parseInt(this.container.css('margin-left'));
                    if (marginOffset != 0) {
                        left += marginOffset;
                        marginOffset = 0;
                    }
                    this.container.scrollLeft(obj.position);
                    var realScrollLeft = this.container.scrollLeft();
                    if (obj.position > realScrollLeft) {
                        marginOffset = obj.position - realScrollLeft;
                        this.container.css('margin-left', left - marginOffset);
                    } else {
                        this.container.css('margin-left', left);
                    }
                }
            }, this);

            freeze.bind('sizeChanged', this.resize, this);
        }
    }
    inherit(TopView, BaseView);
    extend(TopView.prototype, {
        render: function (dataSource) {
            if (this.freeze.header.freezed == false) {
                return;
            }

            var spec = this.getSpec(),
                full = this.freeze.mainview,
                layout = this.freeze.layout,
                header = this.freeze.header,
                columns = this.freeze.columns,
                headercells = full.find('th'),
                columnsWidth = [];

            headercells.each(function (index, value) {
                columnsWidth[columnsWidth.length] = $(value).width();
            });

            full.container.css('margin-top', spec.theadHeight).height(layout.height - spec.theadHeight);
            full.table.css('margin-top', -spec.theadHeight);

            var tableHtml = ['<table class="' + layout.tableClass + '" style="table-layout: fixed; width: ' + spec.tableWidth + 'px; height: ' + spec.headerHeight + 'px;"><thead class="' + layout.theadClass + '">'];
            tableHtml[tableHtml.length] = buildHeaderRows(dataSource.columns, header.formatter, spec.headerHeight, columnsWidth);
            tableHtml[tableHtml.length] = '</thead></table>';

            this.container.html(tableHtml.join(''));
            this.table = this.container.children('table');

            this.freeze.viewsContainer.append(this.container);

            // after append.
            if (spec.frozenCount > 0) {
                var fullcellswidth = full.thCellsWidth(),
                    freezeWidth = 0,
                    thswidth = 0,
                    fwidths = columns.frozenColumns.widths;

                for (var i = columns.frozenColumns.count - 1; i >= 0; i--) {
                    thswidth += fullcellswidth[i];
                    freezeWidth += (fwidths[i] || fwidths[0]);
                }

                this.container
                    .css('margin-left', freezeWidth)
                    .width(layout.width - freezeWidth);

                this.table.css('margin-left', -thswidth);
            } else {
                this.container.width(layout.width);
            }
        },
        resize: function (table, size) {
            var height = this.table.height(),
                width = size.width,
                freezeWidth = 0;

            if (this.freeze.columns.frozenColumns.count > 0) {
                freezeWidth = this.freeze.views['side'].container.width();
            }

            this.container.width(width - freezeWidth).height(height);
        }
    });

    function SideView(freeze) {
        BaseView.call(this, freeze, 'side', freezeSideContainerTemplate);
        this.columnsCount = freeze.columns.frozenColumns.count;

        if (this.columnsCount > 0) {
            var marginOffset = 0;
            freeze.bind('scroll', function (ftable, obj) {
                if (obj.direction == 'vertical') {
                    var top = parseInt(this.container.css('margin-top'));

                    if (marginOffset != 0) {
                        top += marginOffset;
                        marginOffset = 0;
                    }

                    this.container.scrollTop(obj.position);
                    var realScrollTop = this.container.scrollTop();
                    if (obj.position > realScrollTop) {
                        marginOffset = obj.position - realScrollTop;
                        this.container.css('margin-top', top - marginOffset);
                    } else {
                        this.container.css('margin-top', top);
                    }
                }
            }, this);

            this.container
                .bind('mouseover', function (event) {
                    var tp = freeze.columns.frozenColumns.tooltip;
                    if (tp.enabled) {
                        if (event.target.nodeName == 'TD') {
                            if (isFunction(tp.formatter) == false) {
                                tp.formatter = function (target) {
                                    return $(target).text();
                                };
                            }
                            freeze.tooltip.show(tp.formatter(event.target), tp.htmlLabel);
                        }
                        return false;
                    }
                    return true;
                }).bind('mouseleave', function (event) {
                    if (freeze.columns.frozenColumns.tooltip.enabled) {
                        freeze.tooltip.hide();
                        return false;
                    }
                    return true;
                });
            freeze.bind('column-resize-complete', this.columnsResizedHandler, this);
            freeze.bind('sizeChanged', this.resize, this);
        }
    }
    inherit(SideView, BaseView);
    extend(SideView.prototype, {
        render: function (dataSource) {
            if (this.columnsCount <= 0) {
                return;
            }
            var spec = this.getSpec(),
                full = this.freeze.mainview,
                layout = this.freeze.layout,
                header = this.freeze.header,
                columns = this.freeze.columns,
                fwidths = columns.frozenColumns.widths,
                i = 0;

            full.container.css('margin-left', spec.freezeWidth).width(layout.width - spec.freezeWidth);
            full.table.css('margin-left', -spec.hiddenWidth);

            // build html
            var tableHtml = ['<table class="' + layout.tableClass + '" style="table-layout: fixed; width: ' + spec.freezeWidth + 'px; height: ' + spec.tableHeight + 'px;">'],
                theadHtml = ['<thead class="' + layout.theadClass + '">'],
                tbodyHtml = ['<tbody class="' + layout.tbodyClass + '">'];

            var columnsData = dataSource.columns.slice(0, spec.frozenCount);
            // build thead
            theadHtml[theadHtml.length] = buildHeaderRows(columnsData, header.formatter, spec.headerHeight);
            theadHtml[theadHtml.length] = '</thead>';

            // build tbody
            tbodyHtml[tbodyHtml.length] = buildContentRows(dataSource.rows, columns.formatter, columnsData.length);
            tbodyHtml[tbodyHtml.length] = '</tbody>';

            // build table
            tableHtml[tableHtml.length] = theadHtml.join('');
            tableHtml[tableHtml.length] = tbodyHtml.join('');
            tableHtml[tableHtml.length] = '</table>';

            this.container.width(spec.freezeWidth).html(tableHtml.join(''));
            this.table = this.container.children('table');

            this.freeze.viewsContainer.append(this.container);

            // set up columns width
            if (spec.frozenCount > 1 && fwidths.length > 1) {
                var columnHeaders = this.find('th'),
                    baseWidth = 0,
                    len = columnHeaders.length;

                for (i = 0; i < len; i++) {
                    baseWidth += $(columnHeaders[i]).width();
                }

                len = fwidths.length;
                var times = baseWidth / spec.freezeWidth;
                for (i = 0; i < len; i++) {
                    $(columnHeaders[i]).width(fwidths[i] * times);
                }
            }

            if (header.freezed) {
                var theadheight = full.theadHeight();
                this.container.css('margin-top', theadheight).height(layout.height - theadheight);
                this.table.css('margin-top', -theadheight);
            } else {
                this.container.height(layout.height);
            }
        },
        append: function (rows) {
            if (this.freeze.columns.frozenColumns.count > 0) {
                this.find('tbody:first').append(buildContentRows(rows, this.freeze.columns.formatter, this.freeze.columns.frozenColumns.count));
            }
        },
        resize: function (table, size) {
            var height = size.height,
                width = size.width;

            if (this.freeze.header.freezed) {
                height -= this.theadHeight();
            }

            this.container.height(height);
            this.table.height(height);
        },
        /*
    * position: {start : 0, offset : 0}
    * freezetable: table
    */
        columnsResizedHandler: function (freezetable, position/*{start, offset}*/) {
            var sidetable = this.table,
                gap = undefined,
                cells = this.find('th'),
                i = 0,
                len = cells.length;

            var tableleft = sidetable.offset().left + sidetable.width();
            if (position.start <= tableleft + 10 && position.start >= tableleft - 10) {
                gap = cells.last(); // 
            } else {
                for (i = 1; i < len; i++) {
                    var c = $(cells[i]),
                        left = c.offset().left;

                    if (position.start <= left + 10 && position.start >= left - 10) {
                        gap = $(cells[i - 1]); // 
                        break;
                    }
                }
            }

            if (isDefined(gap)) {
                var sideWidth = 0,
                    sideGapWidth = 0,
                    mainview = freezetable.mainview,
                    mainviewmargin = parseInt(mainview.container.css('margin-left')),
                    basewidth = mainview.container.width();

                if (freezetable.header.freezed) {
                    // corner view
                    var corner = freezetable.views['corner'],
                    cornertable = corner.table,
                    cornerwidth = cornertable.width(),
                    cornerGap = cornertable.find('th[data-sequence="' + gap.attr('data-sequence') + '"]:first'),
                    cornerGapWidth = cornerGap.width();

                    if (cornerGapWidth + position.offset < 50) {
                        position.offset = 50 - cornerGapWidth;
                    }
                    var tablewidth = cornerwidth + position.offset;
                    corner.container.width(tablewidth);
                    cornertable.width(tablewidth);
                    cornerGap.width(cornerGapWidth + position.offset);

                    sideWidth = corner.container.width();
                    sideGapWidth = cornerGap.width();

                    // top view
                    var topview = freezetable.views['top'],
                        topviewmargin = parseInt(topview.container.css('margin-left'));

                    topview.container.width(basewidth - position.offset);
                    topview.container.css('margin-left', topviewmargin + position.offset);

                } else {
                    sideWidth = sidetable.width();
                    sideGapWidth = gap.width();
                    if (sideGapWidth + position.offset < 50) {
                        position.offset = 50 - sideGapWidth;
                    }

                    sideWidth += position.offset;
                    sideGapWidth += position.offset;
                }

                this.container.width(sideWidth);
                sidetable.width(sideWidth);
                gap.width(sideGapWidth);

                // mainview
                mainview.container.width(basewidth - position.offset);
                mainview.container.css('margin-left', mainviewmargin + position.offset);

                freezetable.trigger('sideViewChanged');
                return true;
            }

            return false;
        }
    });
    // views

    // FreezeTable ------------------------------- END

    // mouse event ---------------------------------------- GO

    function Mousemover() {
        this.eventHandlers = {};

        (function (mover) {
            $(document).bind('mousemove', function (event) {
                for (var e in mover.eventHandlers) {
                    try {
                        mover.eventHandlers[e].call(this, event, mover.mouseCoords(event));
                    } catch (ex) {
                    }
                }
            });
        })(this);
    }

    Mousemover.prototype = {
        constructor: Mousemover,
        bind: function (name, callback) {
            if (isFunction(callback)) {
                this.eventHandlers[name] = callback;
            }

            return this;
        },
        unbind: function (name) {
            if (isDefined(this.eventHandlers[name]) == false) {
                delete this.eventHandlers[name];
            }

            return this;
        },
        mouseCoords: function (ev) {
            if (ev.pageX || ev.pageY) {
                return { x: ev.pageX, y: ev.pageY };
            }
            return {
                x: ev.clientX + document.body.scrollLeft - document.body.clientLeft,
                y: ev.clientY + document.body.scrollTop - document.body.clientTop
            };
        }
    };
    // mouse event ---------------------------------------- END

    // Tooltip ------------------------------- GO

    function Tooltip(template, mousemover) {
        this.isVisible = false;
        this.layout = $(template || tooltipTemplate).hide();

        $('body').append(this.layout);

        (function (tip) {
            (mousemover || new Mousemover())
                .bind('tooltip-mousemove', function (ev, pos) {
                    tip.move(pos);
                });
        })(this);
    }

    Tooltip.prototype = {
        constructor: Tooltip,
        show: function (message, htmlLabel) {
            message = $.trim(message);
            if (typeof message === 'string' && message != '') {
                if (htmlLabel) {
                    this.layout.html(message);
                } else {
                    this.layout.text(message);
                }

                this.isVisible = true;
                this.layout.show();
            } else {
                this.hide();
            }
        },
        hide: function () {
            this.layout.hide();
            this.isVisible = false;
        },
        move: function (pos) {
            if (this.isVisible) {
                var xOffset = -this.layout.width() / 4.0;
                this.layout.css({ 'top': pos.y + 10, 'left': pos.x + xOffset });
            }
        }
    };
    // Tooltip ------------------------------- END

    function Scroller(selector) {
        this.bar = $(selector);
        this.left = 0;
        this.top = 0;

        this.handlers = {
            "horizontal-bar": [],
            "vertical-bar": []
        };

        (function (scroller) {
            var bar = scroller.bar;
            scroller.left = bar.scrollLeft();
            scroller.top = bar.scrollTop();

            bar.bind('scroll', function () {
                var i = 0,
                    handlers = scroller.handlers;
                if (scroller.left != bar.scrollLeft()) {
                    scroller.left = bar.scrollLeft();
                    for (i = handlers['horizontal-bar'].length - 1; i >= 0; i--) {
                        try {
                            var hb = handlers['horizontal-bar'][i];
                            hb.callback.call(hb.arg, scroller.left);
                        } catch (ex) {
                        }
                    }
                } else if (scroller.top != bar.scrollTop()) {
                    scroller.top = bar.scrollTop();
                    for (i = handlers['vertical-bar'].length - 1; i >= 0; i--) {
                        try {
                            var vb = handlers['vertical-bar'][i];
                            vb.callback.call(vb.arg, scroller.top);
                        } catch (ex) {
                        }
                    }
                }
            });

        })(this);
    }

    Scroller.prototype = {
        constructor: Scroller,

        /*
        * bar: horizontal-bar, vertical-bar
        * callback: function (position) { ... }
        * thisArg: this of callback
        */
        bind: function (bar, callback, thisArg) {
            thisArg = thisArg || this;
            if (isFunction(callback) && isDefined(this.handlers[bar])) {
                this.handlers[bar].push({ callback: callback, arg: thisArg });
            }

            return this;
        }
    };

    /*
    * columns resizer
    */
    function ColumnsResizer(freeze) {
        this.freeze = freeze;
        this.eventmodule = freeze;
        this.container = freeze.container;
        this.line = $(resizeLineTemplate);
        this.barsPool = [];

        (function (resizebar) {

            var isMoving = false,
                startOffset = 0,
                endOffset = 0,
                mousemover = new Mousemover(),
                baseLeft = 0,
                basecontainer = resizebar.container,
                layout = resizebar.freeze.layout,
                line = resizebar.line;

            // setup line to container
            basecontainer.append(line);

            // init DOM
            basecontainer.bind('mousedown', function (event) {
                if (isMoving == false) {
                    var isTarget = $(event.target).hasClass('freeze-column-resize-bar');
                    if (isTarget == true && event.button <= primaryMouseButton) {
                        isMoving = true;
                        startOffset = mousemover.mouseCoords(event).x;
                        endOffset = startOffset;

                        baseLeft = basecontainer.offset().left;
                        // setup line state.
                        line.height(layout.height)
                            .css('margin-left', startOffset - baseLeft)
                            .show();

                        // begin
                        trigger('column-resize-begin');

                        return false;
                    }
                }

                return true;
            });

            $(document).bind('mouseup', function (event) {
                if (isMoving) {
                    isMoving = false;
                    endOffset = mousemover.mouseCoords(event).x;

                    // trigger complate
                    trigger('column-resize-complete', { start: startOffset, offset: endOffset - startOffset });

                    line.hide();
                }

                return true;
            });

            mousemover.bind('resize-line', function (ev, pos) {
                if (isMoving) {
                    line.css('margin-left', pos.x - baseLeft);
                }
            });

            function trigger(event, arg) {
                resizebar.eventmodule.trigger(event, arg);
            }

            // no text selected for IE
            basecontainer.bind('selectstart', function () {
                return !isMoving;
            });

        })(this);

        // events binding
        this.eventmodule
            .bind('sizeChanged', function () {
                this.reset();
            }, this)
            .bind('sideViewChanged', function () {
                this.reset();
            }, this)
            .bind('mainViewChanged', function () {
                this.reset();
            }, this)
            .bind('redraw', function () {
                this.container.append(this.line);
                this.barsPool = [];
                this.reset();
            }, this);

        this.reset();
    }

    ColumnsResizer.prototype = {
        constructor: ColumnsResizer,
        reset: function () {
            var table = this.freeze,
                layout = table.layout,
                height = layout.height,
                freezedCount = table.columns.frozenColumns.count,
                cOffset = this.container.offset(),
                range = {
                    x1: cOffset.left + 10,
                    x2: cOffset.left + layout.width,
                    y1: cOffset.top + 5,
                    y2: cOffset.top + height - 10
                },
                points = [];

            if (table.columns.resizable) {
                var full = table.mainview,
                    fullCells = full.find('th');

                fullCells.each(function (index) {
                    if (index > freezedCount) {
                        var left = $(fullCells[index]).offset().left;
                        if (left <= range.x2 && left >= range.x1) {
                            points[points.length] = left;
                        }
                    }
                });
                var tableleft = full.table.offset().left + full.table.width();
                if (tableleft <= range.x2 && tableleft >= range.x1) {
                    points[points.length] = tableleft;
                }
            }

            if (freezedCount > 0 && table.columns.frozenColumns.resizable) {
                var side = table.views['side'],
                    sideThCells = side.find('th');

                sideThCells.each(function (index) {
                    if (index >= 1) {
                        var left = $(sideThCells[index]).offset().left;
                        if (left <= range.x2 && left >= range.x1) {
                            points[points.length] = left;
                        }
                    }
                });

                var columnsleft = side.table.offset().left + side.table.width();
                if (columnsleft <= range.x2 && columnsleft >= range.x1) {
                    points[points.length] = columnsleft;
                }
            }

            var i = 0,
                plen = points.length,
                bars = this.barsPool,
                barslen = bars.length,
                container = this.container,
                pOffset = container.offset().left,
                bar;

            // if this.barsPool.length < points.length
            if (barslen < plen) {
                for (i = barslen; i < plen; i++) {
                    bar = new ResizeBar(container);
                    bars[bars.length] = bar;
                }

                barslen = this.barsPool.length;
            }

            for (i = 0; i < barslen; i++) {
                bar = bars[i];
                bar.hide();
                if (i < plen) {
                    bar.position(points[i] - 4 - pOffset);
                    bar.show(height - 18);
                }
            }
        }
    };
    // ResizeBar ------------------------------- GO

    function ResizeBar(container) {
        this.display = false;
        this.bar = $(resizeBarTemplate);
        container.append(this.bar);
    }

    ResizeBar.prototype = {
        constructor: ResizeBar,
        show: function (height) {
            this.bar.height(height);
            this.display = true;
            this.bar.show();
        },
        hide: function () {
            this.display = false;
            this.bar.hide();
        },
        position: function (left) {
            this.bar.css('margin-left', left);
        }
    };

    // ResizeBar ------------------------------- END

    function buildHeaderRows(dataSource, formatter, height, columnsWidthList) {
        var i = 0,
            columns = dataSource || [],
            count = dataSource.length;

        columnsWidthList = columnsWidthList || [];

        if (isFunction(formatter) == false) {
            formatter = function (d) {
                var val = '&nbsp;';
                if (typeof d === 'object') {
                    if (d.displayValue != '') {
                        val = d.displayValue;
                    }
                } else if (d != '') {
                    val = d;
                }

                return val;
            };
        }

        var thStarttag = '<th style="';
        if (typeof height === 'number') {
            thStarttag = '<th style="height: ' + height + 'px;';
        }

        // build header
        var trHtml = ['<tr>'];
        for (i = 0; i < count; i++) {
            var thWidth = '';
            if (typeof (columnsWidthList[i]) === 'number') {
                thWidth = 'width: ' + columnsWidthList[i] + 'px;';
            }
            trHtml[trHtml.length] = thStarttag + thWidth + '" data-sequence="' + i + '">' + formatter(columns[i]) + '</th>';
        }
        trHtml[trHtml.length] = '</tr>';

        return trHtml.join('');
    }

    function buildContentRows(dataSource, formatter, columnsCount) {
        var rows = dataSource || [],
            i = 0,
            j = 0,
            html = [],
            rowsCount = dataSource.length;

        if (rows.length > 0) {
            columnsCount = columnsCount || rows[0].length;
            columnsCount = Math.min(columnsCount, rows[0].length);
        } else {
            columnsCount = 0;
        }

        if (isFunction(formatter) == false) {
            formatter = function (d) {
                var val = '&nbsp;';
                if (typeof d === 'object') {
                    if (d.displayValue != '') {
                        val = d.displayValue;
                    }
                    if (isDefined(d.hyperlink) && d.hyperlink != '') {
                        val = '<a href="' + d.hyperlink + '">' + val + '</a>';
                    }
                } else if (d != '') {
                    val = d;
                }

                return val;
            };
        }

        // build rows
        for (i = 0; i < rowsCount; i++) {
            var trHtml = ['<tr>'];
            var row = rows[i];
            for (j = 0; j < columnsCount; j++) {
                trHtml[trHtml.length] = '<td pos="' + i + ',' + j + '">' + formatter(row[j]) + '</td>';
            }
            trHtml[trHtml.length] = '</tr>';
            html[html.length] = trHtml.join('');
        }

        return html.join('');
    }

    if (!$.fn.freezeTable) {
        $.fn.freezeTable = function (option) {
            option = option || {};
            option.container = this.selector;
            return new FreezeTable(option);
        };
    }

    window.freezeTable = FreezeTable.prototype;

})(jQuery);

// freezeTable arrow plugin
(function ($, freezeTable, undefined) {
    var leftTemplate = '<div class="horizontal-scroll-bar-left" style="width: 16px; position: absolute; z-index: 9;">' +
        '<div class="icon" style="position: absolute; display: none; cursor: pointer;"></div>' +
        '</div>',
        rightTemplate = '<div class="horizontal-scroll-bar-right" style="width: 16px; position: absolute; z-index: 9;">' +
            '<div class="icon" style="position: absolute; display: none; cursor: pointer;"></div>' +
            '</div>';

    var leftMarginOffset = -18,
        imageMarginMouseOffset = -10;

    function ArrowScrollBar(table) {
        this.table = table;
        this.freezeWidth = 0;
        if (table.scrollbar && table.scrollbar.enhanced) {
            this.leftBar = $(leftTemplate);
            this.rightBar = $(rightTemplate);
            this.leftIcon = this.leftBar.find('.icon:first');
            this.rightIcon = this.rightBar.find('.icon:first');
            table.container.append(this.leftBar);
            table.container.append(this.rightBar);

            // ...
            table.container.width(table.container.width() - leftMarginOffset);
        }
    }

    $.extend(ArrowScrollBar.prototype, {
        initialize: function () {
            var __this = this,
                table = this.table;

            var lefticon = this.leftIcon,
                righticon = this.rightIcon,
                leftBar = this.leftBar,
                rightBar = this.rightBar,
                isLeftBarVisiable = false,
                isRightBarVisiable = false;
            leftBar
                .bind('mouseover', function (event) {
                    isLeftBarVisiable = true;
                    lefticon.show();
                    return false;
                })
                .bind('mouseout', function () {
                    lefticon.hide();
                    isLeftBarVisiable = false;
                    return false;
                });

            lefticon.bind('click', function () {
                // var offset = __this.freezeWidth;
                table.mainview.container.animate({ scrollLeft: '-=' + 120 }, 300);
            });

            rightBar
                .bind('mouseover', function (event) {
                    isRightBarVisiable = true;
                    righticon.show();
                    return false;
                })
                .bind('mouseout', function () {
                    righticon.hide();
                    isRightBarVisiable = false;
                    return false;
                });

            righticon.bind('click', function () {
                table.mainview.container.animate({ scrollLeft: '+=' + 120 }, 300);
            });

            table.mousemover.bind('arrow-scrollbar-mousemoving', function (event, pos) {
                if (isLeftBarVisiable) {
                    var leftOffset = leftBar.offset().top;
                    lefticon.css('margin-top', pos.y - leftOffset + imageMarginMouseOffset);
                }
                if (isRightBarVisiable) {
                    var rightOffset = rightBar.offset().top;
                    righticon.css('margin-top', pos.y - rightOffset + imageMarginMouseOffset);
                }
            });

            table.bind('column-resize-begin', function () {
                this.hide();
            }, this.leftBar);
            table.bind('column-resize-complete', function () {
                this.show();
            }, this.leftBar);

            table.bind('sizeChanged', this.reset, this);
            table.bind('sideViewChanged', this.reset, this);
            table.bind('redraw', this.onRedraw, this);

            this.reset();
        },

        reset: function () {
            var table = this.table,
                layout = table.layout;

            if (table.columns.frozenColumns.count > 0) {
                this.freezeWidth = table.views['side'].container.width();
            }

            this.leftBar.css({ 'margin-left': this.freezeWidth + leftMarginOffset, 'height': layout.height });
            this.rightBar.css({ 'margin-left': layout.width, 'height': layout.height });
        },

        onRedraw: function () {
            table.container.append(this.leftBar);
            table.container.append(this.rightBar);
            // ...
            table.container.width(table.container.width() - leftMarginOffset);

            this.reset();
        }
    });

    // register plugins
    freezeTable.plugins.arrow = ArrowScrollBar;
})(jQuery, freezeTable);