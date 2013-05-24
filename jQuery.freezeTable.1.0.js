// ref -- jQuery.
// freezeTable
(function ($, undefined) {

    var tablesContainerTemplate = '<div class="table-container" style="overflow: hidden; position: absolute; z-index: 4;"></div>',
        freezeCornerContainerTemplate = '<div style="background-color: white; overflow: hidden; position: absolute; z-index: 3;"></div>',
        freezeColumnContainerTemplate = '<div style="background-color: white; overflow: hidden; position: absolute; z-index: 2;"></div>',
        freezeHeaderContainerTemplate = '<div style="background-color: white; overflow: hidden; position: absolute; z-index: 1;"></div>',
        freezeFullContainerTemplate = '<div style="background-color: white; position: absolute; z-index: 0; overflow: auto;"></div>',
        leftHorizontalScrollBarTemplate = '<div class="horizontal-scroll-bar-left" style="width: 16px; position: absolute; z-index: 9;">' +
            '<div class="icon" style="position: absolute; display: none; cursor: pointer;"></div>' +
            '</div>',
        rightHorizontalScrollBarTemplate = '<div class="horizontal-scroll-bar-right" style="width: 16px; position: absolute; z-index: 9;">' +
            '<div class="icon" style="position: absolute; display: none; cursor: pointer;"></div>' +
            '</div>',
        resizeBarTemplate = '<div class="freeze-column-resize-bar" style="width: 5px; position: absolute; z-index: 10; display: none;"></div>',
        resizeLineTemplate = '<div class="columns-resize-line" style="position: absolute; z-index: 10; display: none;"></div>',
        tooltipTemplate = '<div class="freezetable-tooltip" style="position: absolute; z-index: 9999; display: none; "></div>';

    // global var.
    var leftHorizontalScrollBarMarginOffset = -18,
        imageMarginMouseOffset = -10,
        primaryMouseButton = 1,

    // only once Tooltip in all cases.
        tooltip = null;

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

    function EventModel() {
        this.handlers = {};
    }

    EventModel.prototype = {
        constructor: EventModel,
        bind: function (event, callback, thisArg) {
            if (typeof this.handlers[event] === 'undefined') {
                this.handlers[event] = [];
            }

            this.handlers[event].push({ callback: callback, arg: thisArg });
        },
        trigger: function (event, obj) {
            if (typeof this.handlers[event] === 'undefined') {
                this.handlers[event] = [];
            }

            var handlers = this.handlers[event],
                i = handlers.length - 1;

            for (; i >= 0; i--) {
                try {
                    var h = handlers[i];
                    h.callback.call(h.arg, this, obj);
                } catch (ex) {
                    console.log(ex);
                }
            }
        }
    };

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
            if (typeof callback === 'function') {
                this.eventHandlers[name] = callback;
            }

            return this;
        },
        unbind: function (name) {
            if (typeof (this.eventHandlers[name]) !== 'undefined') {
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

    function Tooltip(template) {
        this.isVisible = false;
        this.mousemover = new Mousemover();

        this.layout = $(template).hide();
        $('body').append(this.layout);

        (function (tip) {
            tip.mousemover.bind('tooltip-mousemove', function (ev, pos) {
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

    // FreezeTable ------------------------------- GO

    function FreezeTable(option) {

        // default option for freeze table.
        extend(this, {
            container: $(option.container),

            header: {
                freezed: true,
                formatter: undefined,
                click: undefined,
                mouseover: undefined,
                mouseleave: undefined
            },

            columns: {
                resizable: true,
                formatter: undefined,
                initWidth: 120,
                click: undefined, // function(rowitem, cellitem, position){this is event target}
                mouseover: undefined,
                mouseleave: undefined,
                tooltip: {
                    enabled: true,
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

            // Scroll Bar
            scrollbar: {
                enhanced: true,
                style: 'system' // custom
            },

            // paging.
            paging: {
                enabled: true,
                style: 'listing', //ps: listing / pager
                size: 500,
                total: undefined,

                pager: {
                    index: 1,
                    wrapperClass: 'ks-pagination-links', // if setup pager, it use to build up HTML wrapper CLASS
                    handler: undefined // handler for pager paging.
                },
                listing: {
                    handler: undefined // loading for listing paging.
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

        this.tables = {
            full: undefined,
            header: undefined,
            columns: undefined,
            corner: undefined
        };

        this.eventHandlers = {};

        tooltip = new Tooltip(this.tooltipTemplate || tooltipTemplate);
        this.mousemover = new Mousemover();

        // [23, 34]
        this.points = [];
        this.availableRange = { x1: 0, x2: 2, y1: 0, y2: 0 };
        this.columnsResizer = null;

        freezeTableInitializer.call(this);
    }

    inherit(FreezeTable, EventModel);

    extend(FreezeTable.prototype, {
        constructor: FreezeTable,

        redraw: function (dataSource) {
            this.dataSource = dataSource || this.dataSource;
            freezeTableInitializer.call(this);
        },

        resize: function (offset) {
            this.fullTable.resize(offset, this.layout.width - offset);
            if (this.cornerTable) this.cornerTable.resize(offset);
            if (this.headerTable) this.headerTable.resize(offset, this.layout.width - offset);
            if (this.columnsTable) this.columnsTable.resize(offset);
        },

        width: function (width) {
            var full = this.tables['full'],
                header = this.tables['header'],
                columns = this.tables['columns'],
                freezeWidth = 0;

            this.layout.width = width;
            this.container.width(width);
            this.container.children('.table-container').width(width);

            if (columns && this.columns.frozenColumns.count > 0) {
                freezeWidth = columns.container.width();
            }

            var changedWidth = width - freezeWidth;
            full.container.width(changedWidth);
            header.container.width(changedWidth);

            var cOffset = this.container.offset();
            this.availableRange = {
                x1: cOffset.left + 10,
                x2: cOffset.left + this.layout.width,
                y1: cOffset.top + 5,
                y2: cOffset.top + this.layout.height - 10
            };

            this.refreshResizerInfos();
            this.trigger('sizechanged', { width: width, height: this.layout.height });
        },

        height: function (height) {
            var full = this.tables['full'],
                columns = this.tables['columns'],
                theadHeight = 0;

            this.layout.height = height;
            this.container.height(height);
            this.container.children('.table-container').height(height);

            if (this.header.freezed) {
                theadHeight = full.theadHeight();
            }

            var changedHeight = height - theadHeight;
            full.container.height(changedHeight);
            if (columns) {
                columns.container.height(changedHeight);
            }

            var cOffset = this.container.offset();
            this.availableRange = {
                x1: cOffset.left + 10,
                x2: cOffset.left + this.layout.width,
                y1: cOffset.top + 5,
                y2: cOffset.top + this.layout.height - 10
            };

            this.refreshResizerInfos();
            this.trigger('sizechanged', { height: height, width: this.layout.width });
        },

        refreshResizerInfos: function () {
            var available = this.availableRange,
                points = [];

            if (this.columns.resizable) {
                var fulltable = this.tables['full'],
                    fullCells = fulltable.find('th'),
                    freezedCount = this.columns.frozenColumns.count;

                fullCells.each(function (index) {
                    if (index > freezedCount) {
                        var left = $(fullCells[index]).offset().left;
                        if (left <= available.x2 && left >= available.x1) {
                            points[points.length] = left;
                        }
                    }
                });
                var tableleft = fulltable.table.offset().left + fulltable.table.width();
                if (tableleft <= available.x2 && tableleft >= available.x1) {
                    points[points.length] = tableleft;
                }
            }

            if (this.columns.frozenColumns.resizable && typeof this.tables['columns'] !== 'undefined') {
                var columnstable = this.tables['columns'],
                    columnsCells = columnstable.find('th');

                columnsCells.each(function (index) {
                    if (index >= 1) {
                        var left = $(columnsCells[index]).offset().left;
                        if (left <= available.x2 && left >= available.x1) {
                            points[points.length] = left;
                        }
                    }
                });

                var columnsleft = columnstable.table.offset().left + columnstable.table.width();
                if (columnsleft <= available.x2 && columnsleft >= available.x1) {
                    points[points.length] = columnsleft;
                }
            }

            this.columnsResizer.height = this.layout.height;
            this.columnsResizer.reset(points);
        }
    });

    function freezeTableInitializer() {
        // fisrt of all.
        var tablesContainer = $(tablesContainerTemplate);
        this.container.html(tablesContainer);

        // init columnsResizer
        this.columnsResizer = new ColumnsResizer(this.container);

        // init layout.
        initializeTableLayout(this);

        var layout = this.layout;

        // setup table
        this.container
            .width(layout.width)
            .height(layout.height);

        tablesContainer
            .width(layout.width)
            .height(layout.height);

        var listingPagingIndex = 1;
        var dataSource = { columns: this.dataSource.columns, rows: this.dataSource.rows };
        if (this.paging.enabled) {
            switch (this.paging.style) {
                case 'listing':
                    var start = listingPagingIndex - 1,
                        end = this.paging.size;

                    dataSource.rows = this.dataSource.rows.slice(0, end);
                    // setup  handler for listing
                    if (typeof (this.paging.listing.handler) !== 'function') {
                        this.paging.listing.handler = function (index, size, total) {

                            // add 10/9
                            var s = Math.floor(Math.pow((10 / 9), (index - 2)) * size),
                                e = Math.floor(Math.pow((10 / 9), (index - 1)) * size);

                            if (e >= total) {
                                return;
                            }

                            var source = this.dataSource.rows.slice(s, e);
                            this.tables['full'].append(source);
                            if (this.tables['columns']) this.tables['columns'].append(source, this.columns.frozenColumns.count);
                        };
                    }
                    break;

                case 'pager':
                    this.container.height(this.container.height() + 50);

                    var sPager = (this.paging.pager.index - 1) * this.paging.size,
                        ePager = this.paging.pager.index * this.paging.size;

                    dataSource.rows = this.dataSource.rows.slice(sPager, ePager);

                    if (typeof (this.paging.pager.handler) !== 'function') {
                        this.paging.pager.handler = function (index, size, total) {
                            this.redraw();
                        };
                    }
                    break;
            }

        }

        // init tables
        var initializedfull = initializeFullTable(dataSource, this.layout, this.header, this.columns, tablesContainer);
        var full = initializedfull.full,
            headercells = initializedfull.headercells,
            headerHeight = initializedfull.headerHeight,
            columnsWidth = [],
            count = this.columns.frozenColumns.count,
            fWidths = this.columns.frozenColumns.widths,
            freezeWidth = 0,
            i = 0;

        this.tables['full'] = full;

        headercells.each(function (index) {
            columnsWidth[columnsWidth.length] = $(this).width();
        });

        for (i = 0; i < count; i++) {
            if (fWidths[i]) {
                freezeWidth += fWidths[i];
            } else {
                freezeWidth += fWidths[0];
            }
        }

        if (this.header.freezed) {
            this.tables['header'] = initializeHeaderTable(
                dataSource,
                this.layout,
                this.header,
                this.columns,
                tablesContainer,
                full,
                headerHeight,
                freezeWidth);
        }
        if (this.columns.frozenColumns.count > 0) {
            this.tables['columns'] = initializeColumnsTable(
                dataSource,
                this.layout,
                this.header,
                this.columns,
                tablesContainer,
                full,
                headerHeight,
                freezeWidth);
        }
        if (this.header.freezed && this.columns.frozenColumns.count > 0) {
            this.tables['corner'] = initializeCornerTable(
                dataSource,
                this.layout,
                this.header,
                this.columns,
                tablesContainer,
                headerHeight,
                freezeWidth);
        }

        this.margintop = {
            top: full.theadHeight(),
            offset: 0
        };

        this.marginleft = {
            left: freezeWidth,
            offset: 0
        };

        // horizontal - enhanced
        if (this.scrollbar.enhanced) {

            var baseHeaderColumnOffset = $(headercells[0]).offset().left,
                leftHorizontalScrollBar = $(leftHorizontalScrollBarTemplate),
                rightHorizontalScrollBar = $(rightHorizontalScrollBarTemplate),
                isLeftBarVisiable = false,
                isRightBarVisiable = false;

            leftHorizontalScrollBar.css({ 'margin-left': freezeWidth + leftHorizontalScrollBarMarginOffset, 'height': this.layout.height });
            rightHorizontalScrollBar.css({ 'margin-left': this.layout.width, 'height': this.layout.height });

            this.container.append(leftHorizontalScrollBar);
            this.container.append(rightHorizontalScrollBar);

            (function (table) {
                leftHorizontalScrollBar
                    .unbind('mouseover')
                    .unbind('mouseout')
                    .bind('mouseover', function (event) {
                        isLeftBarVisiable = true;
                        $(this).children('.icon').show();
                        return false;
                    })
                    .bind('mouseout', function () {
                        $(this).children('.icon').hide();
                        isLeftBarVisiable = false;
                        return false;
                    })
                    .children('.icon').bind('click', function () {
                        var offset = baseHeaderColumnOffset;
                        headercells.each(function (index) {
                            var os = $(this).offset().left;
                            if (os < baseHeaderColumnOffset) {
                                offset = os;
                            }
                        });

                        var scrollOffset = baseHeaderColumnOffset - offset;
                        table.tables['full'].container.animate({ scrollLeft: '-=' + scrollOffset }, 300);
                    });

                rightHorizontalScrollBar
                    .unbind('mouseover')
                    .unbind('mouseout')
                    .bind('mouseover', function (event) {
                        isRightBarVisiable = true;
                        $(this).children('.icon').show();
                        return false;
                    })
                    .bind('mouseout', function () {
                        $(this).children('.icon').hide();
                        isRightBarVisiable = false;
                        return false;
                    })
                    .children('.icon').bind('click', function () {
                        var offset = baseHeaderColumnOffset;
                        headercells.each(function (index) {
                            var os = $(this).offset().left;
                            if (offset == baseHeaderColumnOffset && os > baseHeaderColumnOffset) {
                                offset = os;
                            }
                        });

                        var scrollOffset = offset - baseHeaderColumnOffset;
                        table.tables['full'].container.animate({ scrollLeft: '+=' + scrollOffset }, 300);
                    });

                table.mousemover.bind('horizontal-enhanced-mousemove', function (event, pos) {
                    if (isLeftBarVisiable) {
                        var leftOffset = leftHorizontalScrollBar.offset().top;
                        leftHorizontalScrollBar.children('.icon').css('margin-top', pos.y - leftOffset + imageMarginMouseOffset);
                    }

                    if (isRightBarVisiable) {
                        var rightOffset = rightHorizontalScrollBar.offset().top;
                        rightHorizontalScrollBar.children('.icon').css('margin-top', pos.y - rightOffset + imageMarginMouseOffset);
                    }
                });

                table.bind('sizechanged', function (szie) {
                    leftHorizontalScrollBar.css({ 'height': szie.height });
                    rightHorizontalScrollBar.css({ 'margin-left': szie.width, 'height': szie.height });
                });
            })(this);

            this.columnsResizer.bind('begin', function () {
                this.hide();
            }, leftHorizontalScrollBar);
            this.columnsResizer.bind('complete', function () {
                this.show();
            }, leftHorizontalScrollBar);

            if (this.tables['columns']) {
                this.tables['columns'].bind('sizechanged', function (size) {
                    leftHorizontalScrollBar.css({ 'margin-left': size.width + leftHorizontalScrollBarMarginOffset });
                });
            }
        }

        // ...tooltipHandler and pager
        (function (table) {// bind mouseover & mouseleave event.
            var fullContainer = table.tables['full'].container,
                columnsContainer = undefined,
                headerContainer = undefined,
                cornerContainer = undefined;

            if (table.tables['header']) {
                headerContainer = table.tables['header'].container;
            }

            if (table.tables['corner']) {
                cornerContainer = table.tables['corner'].container;
            }

            function tooltipHandler(event) {
                var tp = table.columns.tooltip;
                if (tp.enabled) {
                    if (event.target.nodeName == 'TD') {
                        if (typeof tp.formatter !== 'function') {
                            tp.formatter = function (target) {
                                return $(target).text();
                            };
                        }
                        tooltip.show(tp.formatter(event.target), tp.htmlLabel);
                    }
                    return false;
                }
                return true;
            }

            if (table.tables['columns']) {
                columnsContainer = table.tables['columns'].container;
                columnsContainer.unbind('mouseover')
                    .unbind('mouseleave')
                    .bind('mouseover', tooltipHandler)
                    .bind('mouseleave', function (event) {
                        if (table.columns.tooltip.enabled) {
                            tooltip.hide();
                            return false;
                        }
                        return true;
                    });
            } else {
                fullContainer.unbind('mouseover')
                    .unbind('mouseleave')
                    .bind('mouseover', tooltipHandler)
                    .bind('mouseleave', function (event) {
                        if (table.columns.tooltip.enabled) {
                            tooltip.hide();
                            return false;
                        }
                        return true;
                    });
            }

            if (table.paging.enabled) {
                table.paging.total = table.paging.total || table.dataSource.rows.length;
                var paging = table.paging,
                    isListingLoading = false;

                switch (paging.style) {
                    case 'listing':
                        fullContainer.bind('scroll', function () {
                            if (this.scrollHeight > 0) {
                                var $this = $(this);
                                var thisHeight = $this.height();
                                var offsetlimit = Math.floor(thisHeight / 4);
                                var topOffset = this.scrollHeight - $this.scrollTop() - thisHeight;
                                if (!isListingLoading && topOffset <= offsetlimit) {
                                    isListingLoading = true;

                                    try {
                                        paging.listing.handler.call(table, ++listingPagingIndex, paging.size, paging.total);
                                    } catch (ex) { /*ignore*/ }
                                    isListingLoading = false;
                                }
                            }
                        });
                        break;

                    case 'pager':
                        var pager = $(buildPager(paging.pager.index, paging.size, paging.total, paging.pager.wrapperClass));
                        table.container.append(pager);
                        pager.bind('click', function (event) {
                            if (event.target.nodeName == 'A') {
                                var pagecount = Math.ceil(paging.total / paging.size),
                                 a = event.target,
                                 index = a.hash.replace('#page-', ''),
                                     pager = paging.pager;

                                if (index == 'next') {
                                    pager.index++;

                                    if (pager.index > pagecount) {
                                        pager.index = pagecount;
                                        return;
                                    }
                                } else if (index == 'previous') {
                                    pager.index--;

                                    if (pager.index < 1) {
                                        pager.index = 1;
                                        return;
                                    }
                                } else {
                                    index = parseInt(index);
                                    if (index >= 1 && index <= pagecount) {
                                        pager.index = index;
                                    }
                                }

                                pager.handler.call(table, pager.index, paging.size, paging.total);

                                return false;
                            }
                        });
                        break;
                }
            }
        })(this);

        // setup points & availableRange
        var cOffset = this.container.offset();
        this.availableRange = {
            x1: cOffset.left + 10,
            x2: cOffset.left + this.layout.width,
            y1: cOffset.top + 5,
            y2: cOffset.top + this.layout.height - 10
        };
        this.refreshResizerInfos();

        initailizeClickEventsHandler(this);

        // bind scroll event.
        var scroller = new Scroller(full.container);
        if (this.columns.frozenColumns.count > 0) {
            scroller.bind('vertical-bar', verticalScrollBarChanged, this);
        }
        if (this.header.freezed) {
            scroller.bind('horizontal-bar', function (position) {
                horizontalScrollBarChanged.call(this, position);
                this.refreshResizerInfos();
            }, this);
        }

        // resize handler bind
        var reiszehandlers = [];
        if (this.columns.frozenColumns.count > 0 && this.columns.frozenColumns.resizable) {
            reiszehandlers.push(this.tables['columns']);
        }
        if (this.columns.resizable) {
            reiszehandlers.push(this.tables['full']);
        }
        this.columnsResizer.bind('complete', function (position/*{start, offset}*/) {
            var i = 0,
                len = reiszehandlers.length;
            for (i = 0; i < len; i++) {
                if (reiszehandlers[i].handleColumnsResized(position, this)) {
                    break;
                }
            }
        }, this);
    }

    function initializeTableLayout(table) {
        var layout = table.layout,
            stretchpattern = /^(fixed|fill|portrait|landscape|extend)$/;
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
                table.height(portraitSize(this));
            });
        }

        if (layout.stretch == 'landscape' || layout.stretch == 'fill') {
            layout.width = landscapeSize(window);
            $(window).bind('resize', function () {
                table.width(landscapeSize(this));
            });
        }
    }

    function initializeFullTable(dataSource, layout, header, columns, tablesContainer) {
        var fulltableOption = {
            tableClass: layout.tableClass,
            theadClass: layout.theadClass,
            tbodyClass: layout.tbodyClass,
            initWidth: columns.initWidth,
            layoutWidth: layout.width,
            frozenCount: columns.frozenColumns.count,
            frozenWidths: columns.frozenColumns.widths,
            headerFormatter: header.formatter,
            contentFormatter: columns.formatter
        };

        var full = new FullTable(fulltableOption);
        full.render(dataSource, columns.resizable);
        full.container
            .width(layout.width)
            .height(layout.height);

        tablesContainer.html(full.container);

        // setup base spec
        var cells = full.find('th');
        /* importent!! set height to style */
        var headerHeight = cells.height();
        cells.height(headerHeight);

        // TODO: not enough content !!

        return { full: full, headercells: cells, headerHeight: headerHeight };
    }

    function initializeHeaderTable(dataSource, layout, header, columns, tablesContainer, full, headerHeight, freezeWidth) {
        var theadheight = full.theadHeight(),
            headercells = full.find('th'),
            columnsWidth = [];

        headercells.each(function (index, value) {
            columnsWidth[columnsWidth.length] = $(value).width();
        });

        full.container
            .css('margin-top', theadheight)
            .height(layout.height - theadheight);
        full.table
            .css('margin-top', -theadheight);

        var tablewidth = full.table.width(),
            headertableOption = {
                tableClass: layout.tableClass,
                theadClass: layout.theadClass,
                tbodyClass: layout.tbodyClass,
                width: tablewidth,
                height: headerHeight,
                formatter: header.formatter,
                columnsWidth: columnsWidth
            };

        var headert = new HeaderTable(headertableOption);
        headert.render(dataSource.columns);
        tablesContainer.append(headert.container);

        if (columns.frozenColumns.count > 0) {
            var fullcellswidth = full.thCellsWidth(),
                thswidth = 0;
            for (var i = columns.frozenColumns.count - 1; i >= 0; i--) {
                thswidth += fullcellswidth[i];
            }

            headert.container
                .css('margin-left', freezeWidth)
                .width(layout.width - freezeWidth);

            headert.table.css('margin-left', -thswidth);
        } else {
            headert.container.width(layout.width);
        }

        return headert;
    }

    function initializeColumnsTable(dataSource, layout, header, columns, tablesContainer, full, headerHeight, freezeWidth) {
        var fullcellswidth = full.thCellsWidth(),
            tableHeight = full.table.height(),
            count = columns.frozenColumns.count,
            thswidth = 0;
        for (var i = count - 1; i >= 0; i--) {
            thswidth += fullcellswidth[i];
        }

        full.container.css('margin-left', freezeWidth)
                    .width(layout.width - freezeWidth);

        full.table.css('margin-left', -thswidth);

        var columnstableOption = {
            tableClass: layout.tableClass,
            theadClass: layout.theadClass,
            tbodyClass: layout.tbodyClass,
            width: freezeWidth,
            height: tableHeight,
            headerHeight: headerHeight,
            headerFormatter: header.formatter,
            contentFormatter: columns.formatter
        };

        var columnstable = new ColumnsTable(columnstableOption);
        columnstable.render({ columns: dataSource.columns.slice(0, count), rows: dataSource.rows });

        tablesContainer.append(columnstable.container);
        columnstable.container.width(freezeWidth);

        // set up columns width
        if (count > 1 && columns.frozenColumns.widths.length > 1) {
            var ws = columns.frozenColumns.widths,
                columnHeaders = columnstable.find('th'),
                baseWidth = 0,
                len = columnHeaders.length;

            for (i = 0; i < len; i++) {
                baseWidth += $(columnHeaders[i]).width();
            }

            len = ws.length;
            var times = baseWidth / freezeWidth;
            for (i = 0; i < len; i++) {
                $(columnHeaders[i]).width(ws[i] * times);
            }
        }

        if (header.freezed) {
            var theadheight = full.theadHeight();
            columnstable.container.css('margin-top', theadheight)
                .height(layout.height - theadheight);
            columnstable.table.css('margin-top', -theadheight);
        } else {
            columnstable.container.height(layout.height);
        }

        return columnstable;
    }

    function initializeCornerTable(dataSource, layout, header, columns, tablesContainer, headerHeight, freezeWidth) {
        var cornertableOption = {
            tableClass: layout.tableClass,
            theadClass: layout.theadClass,
            tbodyClass: layout.tbodyClass,
            width: freezeWidth,
            height: headerHeight,
            formatter: header.formatter
        };

        var corner = new CornerTable(cornertableOption),
            frozenColumnsCount = columns.frozenColumns.count;
        corner.render(dataSource.columns.slice(0, frozenColumnsCount));
        tablesContainer.append(corner.container);

        // set up columns width
        if (frozenColumnsCount > 1 && columns.frozenColumns.widths.length > 1) {
            var ws = columns.frozenColumns.widths,
                cornerHeaders = corner.find('th'),
                baseWidth = 0,
                len = cornerHeaders.length,
                i = 0;

            for (i = 0; i < len; i++) {
                baseWidth += $(cornerHeaders[i]).width();
            }

            len = ws.length;
            var times = baseWidth / freezeWidth;
            for (i = 0; i < len; i++) {
                $(cornerHeaders[i]).width(ws[i] * times);
            }
        }

        return corner;
    }

    function initailizeClickEventsHandler(table) {
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
                    table.header.click.call(table, table.dataSource.columns[index]);

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

        var full = table.tables['full'],
            columns = table.tables['columns'],
            header = table.tables['header'],
            corner = table.tables['corner'];

        if (typeof table.header.click === 'function') {
            full.container.unbind('click').bind('click', headerClickHandler);
            if (header) header.container.unbind('click').bind('click', headerClickHandler);
            if (columns) columns.container.unbind('click').bind('click', headerClickHandler);
            if (corner) corner.container.unbind('click').bind('click', headerClickHandler);
        }

        if (typeof table.columns.click === 'function') {
            full.container.unbind('click').bind('click', contentClickHandler);
            if (columns) columns.container.unbind('click').bind('click', contentClickHandler);
        }
    }

    /*
    * vertical scroll bar changed for table
    */
    function verticalScrollBarChanged(position) {
        var columnsContainer = this.tables['columns'].container,
            top = parseInt(columnsContainer.css('margin-top'));

        if (typeof this.margintop === 'undefined') {
            this.margintop = {
                top: top,
                offset: 0
            };
        }

        if (this.margintop.offset != 0) {
            top = parseInt(columnsContainer.css('margin-top')) + this.margintop.offset;
            this.margintop.top = top;
            this.margintop.offset = 0;
        }

        columnsContainer.scrollTop(position);
        var realScrollTop = columnsContainer.scrollTop();
        if (position > realScrollTop) {
            this.margintop.offset = position - realScrollTop;
            columnsContainer.css('margin-top', top - this.margintop.offset);
        } else {
            columnsContainer.css('margin-top', top);
        }
    }

    /*
    * horizontal ScrollBar Changed for table
    */
    function horizontalScrollBarChanged(position) {
        var headerContainer = this.tables['header'].container,
            left = parseInt(headerContainer.css('margin-left'));

        if (typeof this.marginleft === 'undefined') {
            this.marginleft = {
                left: left,
                offset: 0
            };
        }

        if (this.marginleft.offset != 0) {
            left = parseInt(headerContainer.css('margin-left')) + this.marginleft.offset;
            this.marginleft.left = left;
            this.marginleft.offset = 0;
        }

        headerContainer.scrollLeft(position);
        var realScrollLeft = headerContainer.scrollLeft();
        if (position > realScrollLeft) {
            this.marginleft.offset = position - realScrollLeft;
            headerContainer.css('margin-left', left - this.marginleft.offset);
        } else {
            headerContainer.css('margin-left', left);
        }
    }

    // FreezeTable ------------------------------- END

    function EnhancedScrollBar(container) {
        this.container = container;
    }
    EnhancedScrollBar.prototype = {
        constructor: EnhancedScrollBar
    };

    function Pagination(freezetable) {
    }

    Pagination.prototype = {
        constructor: Pagination,
        getDataSource: function (index) {
        }
    };


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
            if (typeof callback === 'function' && typeof this.handlers[bar] !== 'undefined') {
                this.handlers[bar].push({ callback: callback, arg: thisArg });
            }

            return this;
        }
    };

    // tables
    function TableBase(option) {
        // default option for freeze table.
        this.type = option.type || 'full'; // ps: full / header / corner / column
        this.tableClass = option.tableClass || '';
        this.theadClass = option.theadClass || '';
        this.tbodyClass = option.tbodyClass || '';
        this.width = option.width || 1024;
        this.height = option.height || 600;
        this.container = $(option.connainerTemplate);
        this.table = null;

        // events handlers
        this.handlers = {};
    }
    extend(TableBase.prototype, {
        find: function (selector) {
            return this.table.find(selector);
        },
        resize: function () { },
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
        bind: function (event, callback) {
            var handlers = this.handlers;
            if (typeof handlers[event] === 'undefined') {
                handlers[event] = [];
            }

            if (typeof callback === 'function') {
                handlers[event].push(callback);
            }
        },
        invoke: function (event, arg) {
            if (typeof this.handlers[event] !== 'undefined') {
                var h = this.handlers[event],
                    i = 0;
                for (i = h.length - 1; i >= 0; i--) {
                    try {
                        h[i].call(this, arg);
                    } catch (ex) {
                    }
                }
            }
        }
    });

    function FullTable(option) {
        option.connainerTemplate = freezeFullContainerTemplate;
        option.type = 'full';
        TableBase.call(this, option);
        this.headerFormatter = option.headerFormatter;
        this.contentFormatter = option.contentFormatter;
        this.initWidth = option.initWidth;
        this.layoutWidth = option.layoutWidth;
        this.frozenCount = option.frozenCount;
        this.frozenWidths = option.frozenWidths;
    }
    inherit(FullTable, TableBase);
    extend(FullTable.prototype, {
        render: function (dataSource, columnsResizable) {
            var initWidth = this.initWidth,
                layoutWidth = this.layoutWidth,
                columns = dataSource.columns || [],
                rows = dataSource.rows || [],
                tableHtml = ['<table class="' + this.tableClass + '">'],
                theadHtml = ['<thead class="' + this.theadClass + '">'],
                tbodyHtml = ['<tbody class="' + this.tbodyClass + '">'];

            if (columnsResizable) {
                // cal width.
                var totalWidth = initWidth * columns.length,
                    mainWidth = initWidth * (columns.length - this.frozenCount),
                    i = 0,
                    fwidths = 0;

                for (i = 0; i < this.frozenCount; i++) {
                    if (this.frozenWidths[i]) {
                        fwidths += this.frozenWidths[i];
                    } else {
                        fwidths += this.frozenWidths[0];
                    }
                }

                if (mainWidth < (layoutWidth - fwidths)) {
                    initWidth = Math.floor((layoutWidth - fwidths) / (columns.length - this.frozenCount));
                    totalWidth = initWidth * columns.length;
                }

                /*importent!*/
                tableHtml = ['<table class="' + this.tableClass + '" style="table-layout: fixed; width: ' + totalWidth + 'px;">'];
            }

            // build thead
            theadHtml[theadHtml.length] = buildHeaderRows(columns, this.headerFormatter);
            theadHtml[theadHtml.length] = '</thead>';

            // build tbody
            tbodyHtml[tbodyHtml.length] = buildContentRows(rows, this.contentFormatter);
            tbodyHtml[tbodyHtml.length] = '</tbody>';

            // build table
            tableHtml[tableHtml.length] = theadHtml.join('');
            tableHtml[tableHtml.length] = tbodyHtml.join('');
            tableHtml[tableHtml.length] = '</table>';

            this.container.html(tableHtml.join(''));
            this.table = this.container.children('table');
        },
        append: function (rows) {
            this.find('tbody:first').append(buildContentRows(rows, this.contentFormatter));
        },
        /*
        * position: {start : 0, offset : 0}
        * freezetable: table
        */
        handleColumnsResized: function (position/*{start, offset}*/, freezetable) {
            var fulltable = this.table,
                selected = undefined,
                cells = this.find('th'),
                i = 0,
                len = cells.length;

            var tableleft = fulltable.offset().left + fulltable.width();
            if (position.start <= tableleft + 10 && position.start >= tableleft - 10) {
                selected = cells.last(); // 
            } else {
                // others
                for (i = freezetable.columns.frozenColumns.count; i < len; i++) {
                    var c = $(cells[i]),
                        left = c.offset().left;

                    if (position.start <= left + 10 && position.start >= left - 10) {
                        selected = $(cells[i - 1]); // 
                        break;
                    }
                }
            }

            if (typeof selected !== 'undefined') {
                var headertable = freezetable.tables['header'].table,
                    headerwidth = headertable.width(),
                    headerSelected = headertable.find('th[data-sequence="' + selected.attr('data-sequence') + '"]:first'),
                    headerSelectedWidth = headerSelected.width();

                if (headerSelectedWidth + position.offset < 50) {
                    position.offset = 50 - headerSelectedWidth;
                }

                headertable.width(headerwidth + position.offset);
                headerSelected.width(headerSelectedWidth + position.offset);

                fulltable.width(headertable.width());
                selected.width(headerSelected.width());

                freezetable.refreshResizerInfos();
                return true;
            }

            return false;
        }
    });

    function CornerTable(option) {
        option.connainerTemplate = freezeCornerContainerTemplate;
        option.type = 'corner';
        TableBase.call(this, option);
        this.formatter = option.formatter;
    }
    inherit(CornerTable, TableBase);
    extend(CornerTable.prototype, {
        render: function (dataColumns) {
            var tableHtml = ['<table class="' + this.tableClass + '" style="table-layout: fixed; width: ' + this.width + 'px; height: ' + this.height + 'px;"><thead class="' + this.theadClass + '">'];
            tableHtml[tableHtml.length] = buildHeaderRows(dataColumns, this.formatter, this.height);
            tableHtml[tableHtml.length] = '</thead></table>';

            this.container.html(tableHtml.join(''));
            this.table = this.container.children('table');
        },
        resize: function (offset) {
            // corner
            var cornerWidth = offset;
            this.container.width(cornerWidth);
            this.find('th').width(cornerWidth);
        }
    });

    function HeaderTable(option) {
        option.connainerTemplate = freezeHeaderContainerTemplate;
        option.type = 'header';
        TableBase.call(this, option);
        this.formatter = option.formatter;
        this.columnsWidth = option.columnsWidth;
    }
    inherit(HeaderTable, TableBase);
    extend(HeaderTable.prototype, {
        render: function (dataColumns) {
            var tableHtml = ['<table class="' + this.tableClass + '" style="table-layout: fixed; width: ' + this.width + 'px; height: ' + this.height + 'px;"><thead class="' + this.theadClass + '">'];
            tableHtml[tableHtml.length] = buildHeaderRows(dataColumns, this.formatter, this.height, this.columnsWidth);
            tableHtml[tableHtml.length] = '</thead></table>';

            this.container.html(tableHtml.join(''));
            this.table = this.container.children('table');
        },
        fixed: function () { },
        resize: function (offset, viewWidth) {
            this.container.css('margin-left', offset).width(viewWidth);
        }
    });

    function ColumnsTable(option) {
        option.connainerTemplate = freezeColumnContainerTemplate;
        option.type = 'columns';
        TableBase.call(this, option);
        this.headerHeight = option.headerHeight;
        this.headerFormatter = option.headerFormatter;
        this.contentFormatter = option.contentFormatter;
    }
    inherit(ColumnsTable, TableBase);
    extend(ColumnsTable.prototype, {
        render: function (dataSource) {

            var tableHtml = ['<table class="' + this.tableClass + '" style="table-layout: fixed; width: ' + this.width + 'px; height: ' + this.height + 'px;">'],
                theadHtml = ['<thead class="' + this.theadClass + '">'],
                tbodyHtml = ['<tbody class="' + this.tbodyClass + '">'],
                columns = dataSource.columns,
                rows = dataSource.rows;

            // build thead
            theadHtml[theadHtml.length] = buildHeaderRows(columns, this.headerFormatter, this.headerHeight);
            theadHtml[theadHtml.length] = '</thead>';

            // build tbody
            tbodyHtml[tbodyHtml.length] = buildContentRows(rows, this.contentFormatter, columns.length);
            tbodyHtml[tbodyHtml.length] = '</tbody>';

            // build table
            tableHtml[tableHtml.length] = theadHtml.join('');
            tableHtml[tableHtml.length] = tbodyHtml.join('');
            tableHtml[tableHtml.length] = '</table>';

            this.container.html(tableHtml.join(''));
            this.table = this.container.children('table');
        },
        append: function (rows, columnCount) {
            this.find('tbody:first').append(buildContentRows(rows, this.contentFormatter, columnCount));
        },
        resize: function (offset) {
            // column
            this.container.width(offset);
            this.table.width(offset);
            this.find('th').width(offset);
            this.find('td').width(offset);
        },
        /*
        * position: {start : 0, offset : 0}
        * freezetable: table
        */
        handleColumnsResized: function (position/*{start, offset}*/, freezetable) {
            var columnstable = this.table,
                selected = undefined,
                cells = this.find('th'),
                i = 0,
                len = cells.length;

            var tableleft = columnstable.offset().left + columnstable.width();
            if (position.start <= tableleft + 10 && position.start >= tableleft - 10) {
                selected = cells.last(); // 
            } else {
                for (i = 1; i < len; i++) {
                    var c = $(cells[i]),
                        left = c.offset().left;

                    if (position.start <= left + 10 && position.start >= left - 10) {
                        selected = $(cells[i - 1]); // 
                        break;
                    }
                }
            }

            if (typeof selected !== 'undefined') {
                var cornertable = freezetable.tables['corner'].table,
                    cornerwidth = cornertable.width(),
                    cornerSelected = cornertable.find('th[data-sequence="' + selected.attr('data-sequence') + '"]:first'),
                    cornerSelectedWidth = cornerSelected.width();

                if (cornerSelectedWidth + position.offset < 50) {
                    position.offset = 50 - cornerSelectedWidth;
                }
                var tablewidth = cornerwidth + position.offset;

                freezetable.tables['corner'].container.width(tablewidth);
                cornertable.width(tablewidth);
                this.container.width(tablewidth);
                columnstable.width(tablewidth);

                cornerSelected.width(cornerSelectedWidth + position.offset);
                selected.width(cornerSelected.width());

                // events invoke
                this.invoke('sizechanged', { width: this.container.width(), height: this.container.height() });

                // others
                var header = freezetable.tables['header'],
                    full = freezetable.tables['full'],
                    basewidth = full.container.width(),
                    fullmargin = parseInt(full.container.css('margin-left')),
                    headermargin = parseInt(header.container.css('margin-left'));

                full.container.width(basewidth - position.offset);
                full.container.css('margin-left', fullmargin + position.offset);
                header.container.width(basewidth - position.offset);
                header.container.css('margin-left', headermargin + position.offset);

                freezetable.refreshResizerInfos();
                return true;
            }

            return false;
        }
    });
    // tables

    /*
    * columns resizer
    */
    function ColumnsResizer(container) {
        this.container = container;
        this.height = 800;
        this.barsPool = [];
        this.eventHandlers = {};

        (function (resizebar, line) {

            var isMoving = false,
                startOffset = 0,
                endOffset = 0,
                mousemover = new Mousemover(),
                baseLeft = 0,
                eventHandlers = resizebar.eventHandlers,
                basecontainer = resizebar.container;

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

                        baseLeft = container.offset().left;
                        // setup line state.
                        line.height(resizebar.height)
                            .css('margin-left', startOffset - baseLeft)
                            .show();

                        // begin
                        trigger('begin');

                        if (window.event) {
                            window.event.returnValue = false;
                            window.event.cancelBubble = true;
                        }

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
                    trigger('complete', { start: startOffset, offset: endOffset - startOffset });

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
                var handlers = eventHandlers[event];
                if (handlers instanceof Array) {
                    var i = 0,
                        len = handlers.length;

                    for (i = 0; i < len; i++) {
                        var h = handlers[i];
                        try {
                            h.callback.call(h.scope, arg);
                        } catch (ex) {
                        }
                    }
                }
            }

            // no text selected IE
            basecontainer.bind('selectstart', function () {
                return !isMoving;
            });

        })(this, $(resizeLineTemplate));
    }

    ColumnsResizer.prototype = {
        constructor: ColumnsResizer,
        reset: function (points) {
            var i = 0,
                plen = points.length,
                bars = this.barsPool,
                barslen = bars.length,
                container = this.container,
                pOffset = container.offset().left,
                height = this.height,
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
                    bar.show(height);
                }
            }
        },

        /*
        * event: 'begin', 'complete'
        * callback: function(offset of changed){},
        * thisArg: this of callback function
        */
        bind: function (event, callback, thisArg) {
            if (typeof callback === 'function') {
                if (typeof this.eventHandlers[event] === 'undefined') {
                    this.eventHandlers[event] = [];
                }

                this.eventHandlers[event].push({ callback: callback, scope: (thisArg || {}) });
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

    // build table ------------------------------ GO

    function buildHeaderRows(dataSource, formatter, height, columnsWidthList) {
        var i = 0,
            columns = dataSource || [],
            count = dataSource.length;

        columnsWidthList = columnsWidthList || [];

        if (!$.isFunction(formatter)) {
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

        if (!$.isFunction(formatter)) {
            formatter = function (d) {
                var val = '&nbsp;';
                if (typeof d === 'object') {
                    if (d.displayValue != '') {
                        val = d.displayValue;
                    }
                    if (d.hyperlink && d.hyperlink != '') {
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

    function buildPager(index, size, total, styleClasses) {
        styleClasses = styleClasses || 'ks-pagination-links';

        var showSize = 7,
            pagecount = Math.ceil(total / size),
            html = ['<div class="' + styleClasses + '" style="position: absolute;"><ul>'];

        var times = Math.ceil(index / showSize),
            i = (times - 1) * showSize + 1,
            end = Math.min(times * showSize, pagecount);

        if (index > 1) {

            html[html.length] = '<li class="previous"><a href="#page-previous">&lt; Previous</a></li>';
        }

        for (; i <= end; i++) {
            if (i != index) {
                html[html.length] = '<li><a href="#page-' + i + '">' + i + '</a></li>';
            }
            else {
                html[html.length] = '<li class="current">' + i + '</li>';
            }
        }

        if (index < pagecount) {
            html[html.length] = '<li class="next"><a href="#page-next">Next &gt;</a></li>';
        }

        html[html.length] = '</ul>';
        html[html.length] = ' <span class="total">(' + total + '&nbsp;results)</span>';
        html[html.length] = '</div>';

        return html.join('');
    }

    // build table ------------------------------ END

    if (!$.fn.freezeTable) {
        $.fn.freezeTable = function (option) {
            option = option || {};
            option.container = this.selector;
            return new FreezeTable(option);
        };
    }

})(jQuery);
