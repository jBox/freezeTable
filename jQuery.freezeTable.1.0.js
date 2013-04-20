// ref -- jQuery.
// freezeTable
(function ($, undefined) {

    var tableContainerTemplate = '<div class="table-container" style="overflow: hidden; position: absolute; z-index: 4;"></div>',
        freezeCornerContainerTemplate = '<div style="background-color: white; overflow: hidden; position: absolute; z-index: 3;"></div>',
        freezeColumnContainerTemplate = '<div style="background-color: white; overflow: hidden; position: absolute; z-index: 2;"></div>',
        freezeHeaderContainerTemplate = '<div style="background-color: white; overflow: hidden; position: absolute; z-index: 1;"></div>',
        freezeFullContainerTemplate = '<div style="background-color: white; position: absolute; z-index: 0; overflow: auto;"></div>',
        contentContainerTemplate = '<div style="background-color: white; position: absolute; z-index: 0; overflow: auto;"></div>',
        leftHorizontalScrollBarTemplate = '<div class="horizontal-scroll-bar" style="width: 16px; position: absolute; z-index: 9; border-right: 2px solid #bdbdbd; -webkit-box-shadow: 5px 0 5px #DDD; box-shadow: 5px 0 5px #DDD;"><img src="images/Icon_Left.png" style="position: absolute; display: none; cursor: pointer;"/></div>',
        rightHorizontalScrollBarTemplate = '<div class="horizontal-scroll-bar" style="width: 16px; position: absolute; z-index: 9;"><img src="images/Icon_Right.png" style="position: absolute; display: none; cursor: pointer;"/></div>',
        resizeBarTemplate = '<div class="freeze-column-resize-bar" style="border-left: 0px dashed #bdbdbd; width: 5px; cursor: col-resize; position: absolute; z-index: 10;"></div>',
        tooltipTemplate = '<div style="background-color: #dfe0e4; position: absolute; z-index: 999; border: 1px solid #f90; white-space: nowrap; padding: 3px 5px; display: none; font-size: 11px;"></div>';

    // global var.
    var tableHeaderHeightOffset = $.browser.msie ? 0 : 7,
        freezeColumnsWidthOffset = 20,
        freezeCornerContainerWidthOffset = 1,
        freezeColumnContainerWidthOffset = 18,
        freezeColumnContainerHeightOffset = 0,
        resizeBarWidthOffset = -2,
        leftHorizontalScrollBarMarginOffset = -18,
        imageMarginMouseOffset = -10,
        primaryMouseButton = 1,

        // 所以实例的Table将共用一个Tooltip
        tooltip = null;

    function extend(obj, ext) {
        if (!obj) {
            obj = {};
        }

        var k = null;
        for (k in ext) {
            if (typeof (obj[k]) === 'object') {
                arguments.callee(obj[k], ext[k]);
            } else {
                obj[k] = ext[k];
            }
        }

        return obj;
    }

    function inherit(sub, base) {

        function object(obj) {
            function F() { }
            F.prototype = obj;
            return new F();
        }

        var prototype = object(base.prototype);
        prototype.constructor = sub;
        sub.prototype = prototype;
    }

    // mouse event ---------------------------------------- GO

    function Mousemover() {
        this.eventHandlers = {};

        var __this = this;
        $(document).bind('mousemove', function (event) {
            for (var e in __this.eventHandlers) {
                try {
                    __this.eventHandlers[e].call(this, event, __this.mouseCoords(event));
                } catch (ex) {
                }
            }
        });
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

        var __this__ = this;
        this.mousemover.bind('tooltip-mousemove', function (ev, pos) {
            __this__.move(pos);
        });
    }

    Tooltip.prototype = {
        constructor: Tooltip,
        show: function (message, htmlLabel) {
            message = message.trim();
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
            container: null,

            header: {
                freezed: true,
                formatter: undefined,
                click: undefined,
                mouseover: undefined,
                mouseleave: undefined
            },

            columns: {
                freezed: true, // only support true. so far.
                freezedCount: 1, // only support 1 so far.
                defaultFreezedWidth: 280,
                resizable: true,
                formatter: undefined,
                click: undefined,
                tooltip: {
                    enabled: true,
                    htmlLabel: true,
                    formatter: undefined
                }
            },

            // 增强横向 ScrollBar
            horizontalEnhanced: true,

            // paging.
            paging: {
                enabled: true,
                style: 'listing', //ps: listing / traditional
                size: 500,
                total: undefined,
                listingLoading: undefined
            },

            layout: {
                tableClass: 'separate content-table',
                theadClass: 'table-thead',
                tbodyClass: 'table-tbody',

                width: 1024,
                height: 600
            },

            // 最小定义的数据集
            dataSource: {
                columns: [],
                rows: []
            }
        });

        this.container = $(option.container);
        this.tables = [];
        this.resizeBar = {};
        // remove container
        delete option.container;

        extend(this, option);

        // init. DOM            
        this.fullTable = undefined;
        this.cornerTable = undefined;
        this.headerTable = undefined;
        this.columnsTable = undefined;

        this.contentContainer = $(contentContainerTemplate);
        this.freezeHeaderContainer = $(freezeHeaderContainerTemplate);
        this.freezeColumnContainer = $(freezeColumnContainerTemplate);
        this.freezeCornerContainer = $(freezeCornerContainerTemplate);

        tooltip = new Tooltip(this.tooltipTemplate || tooltipTemplate);
        this.mousemover = new Mousemover();

        this.init();
    }

    FreezeTable.prototype = {
        constructor: FreezeTable,

        init: function () {
            // setup table
            this.container
                .width(this.layout.width)
                .css('overflow', 'hidden');

            var pagingIndex = 1;
            var dataSource = { columns: this.dataSource.columns, rows: this.dataSource.rows };
            if (this.paging.enabled) {
                var start = pagingIndex - 1,
                    end = this.paging.size;

                dataSource.rows = this.dataSource.rows.slice(0, end);
                // setup listingLoading handler
                if (typeof (this.paging.listingLoading) !== 'function') {
                    this.paging.listingLoading = function (index, size, total) {

                        // add 10/9
                        var s = Math.floor(Math.pow((10 / 9), (index - 2)) * size),
                            e = Math.floor(Math.pow((10 / 9), (index - 1)) * size);

                        if (e >= total) {
                            return;
                        }

                        var source = this.dataSource.rows.slice(s, e);
                        this.fullTable.append(source);
                        if (this.columnsTable) this.columnsTable.append(source, this.columns.freezeCount);
                    };
                }
            }

            var baseOption = {
                tableClass: this.layout.tableClass,
                theadClass: this.layout.theadClass,
                tbodyClass: this.layout.tbodyClass
            };

            // 初始化 FullTable
            var fulltableOption = extend({
                headerFormatter: this.header.formatter,
                contentFormatter: this.columns.formatter
            }, baseOption);
            var fulltable = new FullTable(fulltableOption);
            fulltable.rander(dataSource);
            fulltable.container.width(this.layout.width).height(this.layout.height);
            this.fullTable = fulltable;
            this.container.html(fulltable.container);
            // 初始化 FullTable

            // 计算FullTable width & height
            var headerCells = fulltable.find('th');
            var columnWidthList = [],
                showWidth = 0;
            headerCells.each(function (index) {
                var width = $(this).width();
                if (index != 0) {
                    showWidth += width;
                }

                columnWidthList[columnWidthList.length] = width;
            });

            var freezeWidth = this.columns.defaultFreezedWidth;
            var tableHeight = fulltable.table.height() + tableHeaderHeightOffset;
            var tableWidth = fulltable.table.width();

            if (this.paging.enabled && this.paging.style == 'traditional') {
                this.container.height(this.layout.height + 50);
            } else {
                this.container.height(this.layout.height);
            }

            // 当内容不够宽时，放大内容宽度
            if (showWidth < this.layout.width - freezeWidth) {
                tableWidth = Math.floor(tableWidth * (this.layout.width - freezeWidth) / showWidth);
                fulltable.table.width(tableWidth);
            }

            var headerHeight = headerCells.height() + tableHeaderHeightOffset;
            var freezeColumnsWidth = columnWidthList[0] + freezeColumnsWidthOffset;

            if (this.header.freezed) {

                fulltable.container
                    .css('margin-top', headerHeight)
                    .height(this.layout.height - headerHeight);
                fulltable.table.css('margin-top', -headerHeight);

                // 表头 -------------------------------------- start
                var headertableOption = extend({
                    width: tableWidth,
                    height: headerHeight,
                    formatter: this.header.formatter,
                    columnWidthList: columnWidthList
                }, baseOption);
                var headertable = new HeaderTable(headertableOption);
                headertable.rander(dataSource.columns);

                this.headerTable = headertable;
                this.container.append(headertable.container);
                // 表头 -------------------------------------- end

                // 当同时锁定表头与列时
                if (this.columns.freezed) {
                    headertable.container
                        .css('margin-left', freezeWidth)
                        .width(this.layout.width - freezeWidth);
                    headertable.table.css('margin-left', -freezeColumnsWidth);
                } else {
                    headertable.container.width(this.layout.width);
                }
            }

            if (this.columns.freezed) {
                fulltable.container.css('margin-left', freezeWidth)
                    .width(this.layout.width - freezeWidth);

                fulltable.table.css('margin-left', -freezeColumnsWidth);
                // 列 -------------------------------------- start  
                var columnstableOption = extend({
                    width: freezeWidth - freezeColumnContainerWidthOffset,
                    height: tableHeight,
                    headerHeight: headerHeight,
                    headerFormatter: this.header.formatter,
                    contentFormatter: this.columns.formatter
                }, baseOption);
                var columnstable = new ColumnTable(columnstableOption);
                columnstable.rander({ columns: dataSource.columns.slice(0, this.columns.freezedCount), rows: dataSource.rows });

                this.columnsTable = columnstable;
                this.container.append(columnstable.container);
                columnstable.container.width(freezeWidth);
                // 列 -------------------------------------- end

                // 当同时锁定表头与列时
                if (this.header.freezed) {
                    columnstable.container.css('margin-top', headerHeight)
                        .height(this.layout.height - headerHeight + freezeColumnContainerHeightOffset);
                    columnstable.table.css('margin-top', -headerHeight);
                } else {
                    columnstable.container.height(this.layout.height);
                }

                // horizontal - enhanced
                if (this.horizontalEnhanced) {

                    var baseHeaderColumnOffset = $(headerCells[1]).offset().left,
                        leftHorizontalScrollBar = $(leftHorizontalScrollBarTemplate),
                        rightHorizontalScrollBar = $(rightHorizontalScrollBarTemplate),
                        isLeftBarVisiable = false,
                        isRightBarVisiable = false;

                    leftHorizontalScrollBar.css({ 'margin-left': freezeWidth + leftHorizontalScrollBarMarginOffset, 'height': this.layout.height });
                    rightHorizontalScrollBar.css({ 'margin-left': this.layout.width, 'height': this.layout.height });

                    this.container.append(leftHorizontalScrollBar);
                    this.container.append(rightHorizontalScrollBar);

                    // 绑定事件
                    (function (table) {
                        leftHorizontalScrollBar
                            .unbind('mouseover')
                            .unbind('mouseout')
                            .bind('mouseover', function (event) {
                                isLeftBarVisiable = true;
                                $(this).children('img').show();
                                return false;
                            })
                            .bind('mouseout', function () {
                                $(this).children('img').hide();
                                isLeftBarVisiable = false;
                                return false;
                            })
                            .children('img').bind('click', function () {
                                var offset = baseHeaderColumnOffset;
                                headerCells.each(function (index) {
                                    var os = $(this).offset().left;
                                    if (os < baseHeaderColumnOffset) {
                                        offset = os;
                                    }
                                });

                                var scrollOffset = baseHeaderColumnOffset - offset;
                                table.fullTable.container.animate({ scrollLeft: '-=' + scrollOffset }, 300);
                            });

                        rightHorizontalScrollBar
                            .unbind('mouseover')
                            .unbind('mouseout')
                            .bind('mouseover', function (event) {
                                isRightBarVisiable = true;
                                $(this).children('img').show();
                                return false;
                            })
                            .bind('mouseout', function () {
                                $(this).children('img').hide();
                                isRightBarVisiable = false;
                                return false;
                            })
                            .children('img').bind('click', function () {
                                var offset = baseHeaderColumnOffset;
                                headerCells.each(function (index) {
                                    var os = $(this).offset().left;
                                    if (offset == baseHeaderColumnOffset && os > baseHeaderColumnOffset) {
                                        offset = os;
                                    }
                                });

                                var scrollOffset = offset - baseHeaderColumnOffset;
                                table.fullTable.container.animate({ scrollLeft: '+=' + scrollOffset }, 300);
                            });

                        table.mousemover.bind('horizontal-enhanced-mousemove', function (event, pos) {
                            if (isLeftBarVisiable) {
                                var leftOffset = leftHorizontalScrollBar.position().top;
                                leftHorizontalScrollBar.children('img').css('margin-top', pos.y - leftOffset + imageMarginMouseOffset);
                            }

                            if (isRightBarVisiable) {
                                var rightOffset = rightHorizontalScrollBar.position().top;
                                rightHorizontalScrollBar.children('img').css('margin-top', pos.y - rightOffset + imageMarginMouseOffset);
                            }
                        });
                    })(this);

                    // resize bind
                    if (this.columns.resizable) {
                        var bar = $(resizeBarTemplate).css({ 'margin-left': freezeWidth + resizeBarWidthOffset, 'height': this.layout.height });
                        this.container.append(bar);
                        this.resizeBar = new ResizeBar(bar);
                        this.resizeBar.freezeWidth = freezeWidth;
                        this.resizeBar.freezeMinWidth = this.columns.defaultFreezedWidth;
                        this.resizeBar.freezeMaxWidth = this.layout.width - 160;

                        (function (table) {
                            table.resizeBar.bind('begin', function () {
                                leftHorizontalScrollBar.hide();
                            });
                            table.resizeBar.bind('complate', function (offset) {
                                table.resize(offset);

                                // horizontal scroll bar
                                leftHorizontalScrollBar.css({ 'margin-left': offset + leftHorizontalScrollBarMarginOffset }).show();
                            });
                        })(this);
                    }
                }
            }

            if (this.header.freezed && this.columns.freezed) {
                // 固定角 -------------------------------------- start
                var cornertableOption = extend({
                    width: freezeWidth - freezeColumnContainerWidthOffset,
                    height: headerHeight,
                    formatter: this.header.formatter,
                }, baseOption);
                var cornertable = new CornerTable(cornertableOption);
                cornertable.rander(dataSource.columns.slice(0, this.columns.freezedCount));

                this.cornerTable = cornertable;
                this.container.append(cornertable.container);
                // 固定角 -------------------------------------- end
            }

            // bind scroll event.
            (function (table) {

                var fullContainer = table.fullTable.container,
                    headerContainer,
                    columnsContainer,
                    scrollHandler,
                    headerHeight = 0,
                    freezeWidth = 0;

                if (table.headerTable) {
                    headerContainer = table.headerTable.container;
                }

                if (table.columnsTable) {
                    columnsContainer = table.columnsTable.container;
                }

                if (headerContainer && columnsContainer) {
                    headerHeight = fullContainer.find('th').height() + tableHeaderHeightOffset;
                    scrollHandler = function () {
                        freezeWidth = table.resizeBar.freezeWidth || freezeWidth;
                        var scrollLeft = fullContainer.scrollLeft(),
                            scrollTop = fullContainer.scrollTop();

                        headerContainer.scrollLeft(scrollLeft);
                        var realScrollLeft = headerContainer.scrollLeft();
                        if (scrollLeft > realScrollLeft) {
                            var vl = scrollLeft - realScrollLeft;
                            headerContainer.css('margin-left', freezeWidth - vl);
                        } else {
                            headerContainer.css('margin-left', freezeWidth);
                        }

                        columnsContainer.scrollTop(scrollTop);
                        if (scrollTop > columnsContainer.scrollTop()) {
                            var vt = scrollTop - columnsContainer.scrollTop();
                            columnsContainer.css('margin-top', headerHeight - vt);
                        } else {
                            columnsContainer.css('margin-top', headerHeight);
                        }
                    };
                } else if (headerContainer && !columnsContainer) {
                    scrollHandler = function () {
                        freezeWidth = table.resizeBar.freezeWidth || freezeWidth;
                        var scrollLeft = fullContainer.scrollLeft();

                        headerContainer.scrollLeft(scrollLeft);
                        var realScrollLeft = headerContainer.scrollLeft();
                        if (scrollLeft > realScrollLeft) {
                            var vl = scrollLeft - realScrollLeft;
                            headerContainer.css('margin-left', freezeWidth - vl);
                        } else {
                            headerContainer.css('margin-left', freezeWidth);
                        }
                    };
                } else if (columnsContainer && !headerContainer) {
                    scrollHandler = function () {
                        var scrollTop = fullContainer.scrollTop();

                        columnsContainer.scrollTop(scrollTop);
                        if (scrollTop > columnsContainer.scrollTop()) {
                            var vt = scrollTop - columnsContainer.scrollTop();
                            columnsContainer.css('margin-top', headerHeight - vt);
                        } else {
                            columnsContainer.css('margin-top', headerHeight);
                        }
                    };
                }

                if (scrollHandler) {
                    fullContainer.unbind('scroll').bind('scroll', scrollHandler);
                }
            })(this);

            // ...
            (function (table) {// bind mouseover & mouseleave event.
                var fullContainer = table.fullTable.container,
                    columnsContainer = undefined,
                    headerContainer = undefined,
                    cornerContainer = undefined;

                if (table.headerTable) {
                    headerContainer = table.headerTable.container;
                }

                if (table.cornerTable) {
                    cornerContainer = table.cornerTable.container;
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

                if (table.columnsTable) {
                    columnsContainer = table.columnsTable.container;
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

                function headerClickHandler(event) {
                    try {
                        // find data-sequence
                        var $th = $(event.target);
                        if (event.target.nodeName != 'TH') {
                            var _th = $th.parents('th:first');
                            if (_th.length != 0) {
                                $th = _th;
                            } else {
                                _th = $th.find('th:first');
                                if (_th.length != 0) {
                                    $th = _th;
                                } else {
                                    // not found
                                    return false;
                                }
                            }
                        }
                        var index = parseInt($th.attr('data-sequence'));
                        table.header.click.call(table, table.dataSource.columns[index]);
                    } catch (ex) { /*ignore.*/ }

                    return false;
                }

                if (table.header.click) {
                    fullContainer.unbind('click').bind('click', headerClickHandler);
                    if (headerContainer) headerContainer.unbind('click').bind('click', headerClickHandler);
                    if (columnsContainer) columnsContainer.unbind('click').bind('click', headerClickHandler);
                    if (cornerContainer) cornerContainer.unbind('click').bind('click', headerClickHandler);
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
                                            paging.listingLoading.call(table, ++pagingIndex, paging.size, paging.total);
                                        } catch (ex) { /*ignore*/ }
                                        isListingLoading = false;
                                    }
                                }
                            });
                            break;
                        case 'traditional':
                            var pager = $(buildPager(1, paging.size, paging.total)).css('margin-top', table.layout.height + 10);
                            table.container.append(pager);
                            break;
                    }
                }
            })(this);
        },

        redraw: function (dataSource) {
            this.dataSource = dataSource;
            this.init();
        },

        resize: function (offset) {
            this.fullTable.resize(offset, this.layout.width - offset);
            if (this.cornerTable) this.cornerTable.resize(offset);
            if (this.headerTable) this.headerTable.resize(offset, this.layout.width - offset);
            if (this.columnsTable) this.columnsTable.resize(offset);
        }
    };
    // FreezeTable ------------------------------- END

    // tables
    function TableBase(option) {
        // default option for freeze table.
        this.type = option.type || 'full'; // ps: full / header / corner / column
        this.tableClass = option.tableClass || '';
        this.theadClass = option.theadClass || '';
        this.tbodyClass = option.tbodyClass || '';
        this.width = option.width || 1024
        this.height = option.height || 600;
        this.container = $(option.connainerTemplate);
        this.table = null;
    }
    extend(TableBase.prototype, {
        find: function (selector) {
            return this.table.find(selector);
        }
    });
    function FullTable(option) {
        option.connainerTemplate = freezeFullContainerTemplate;
        option.type = 'full';
        TableBase.call(this, option);
        this.headerFormatter = option.headerFormatter;
        this.contentFormatter = option.contentFormatter;
    }
    inherit(FullTable, TableBase);
    extend(FullTable.prototype, {
        rander: function (dataSource) {
            var columns = dataSource.columns || [],
                rows = dataSource.rows || [],
                tableHtml = ['<table class="' + this.tableClass + '">'],
                theadHtml = ['<thead class="' + this.theadClass + '">'],
                tbodyHtml = ['<tbody class="' + this.tbodyClass + '">'];

            // build thead
            theadHtml[theadHtml.length] = buildHeaderRows(columns, this.headerFormatter);
            theadHtml[theadHtml.length] = '</thead>';

            // build tbody
            tbodyHtml[tbodyHtml.length] = buildContentRows(rows, this.contentFormatter)
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
        resize: function (offset, viewWidth) {
            this.container.css('margin-left', offset).width(viewWidth);
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
        rander: function (dataColumns) {
            var tableHtml = ['<table class="' + this.tableClass + '" style="table-layout: fixed; width: ' + this.width + 'px; height: ' + this.height + 'px;"><thead class="' + this.theadClass + '">'];
            tableHtml[tableHtml.length] = buildHeaderRows(dataColumns, this.formatter, this.height, [this.width]);
            tableHtml[tableHtml.length] = '</thead></table>';

            this.container.html(tableHtml.join(''));
            this.table = this.container.children('table');
        },
        resize: function (offset) {
            // corner
            var cornerWidth = offset + freezeCornerContainerWidthOffset;
            this.container.width(cornerWidth);
            this.find('th').width(cornerWidth);
        }
    });

    function HeaderTable(option) {
        option.connainerTemplate = freezeHeaderContainerTemplate;
        option.type = 'header';
        TableBase.call(this, option);
        this.formatter = option.formatter;
        this.columnWidthList = option.columnWidthList;
    }
    inherit(HeaderTable, TableBase);
    extend(HeaderTable.prototype, {
        rander: function (dataColumns) {
            var tableHtml = ['<table class="' + this.tableClass + '" style="width: ' + this.width + 'px; height: ' + this.height + 'px;"><thead class="' + this.theadClass + '">'];
            tableHtml[tableHtml.length] = buildHeaderRows(dataColumns, this.formatter, this.height, this.columnWidthList);
            tableHtml[tableHtml.length] = '</thead></table>';

            this.container.html(tableHtml.join(''));
            this.table = this.container.children('table');
        },
        fixed: function () { },
        resize: function (offset, viewWidth) {
            this.container.css('margin-left', offset).width(viewWidth);
        }
    });

    function ColumnTable(option) {
        option.connainerTemplate = freezeColumnContainerTemplate;
        option.type = 'column';
        TableBase.call(this, option);
        this.headerHeight = option.headerHeight;
        this.headerFormatter = option.headerFormatter;
        this.contentFormatter = option.contentFormatter;
    }
    inherit(ColumnTable, TableBase);
    extend(ColumnTable.prototype, {
        rander: function (dataSource) {

            var tableHtml = ['<table class="' + this.tableClass + '" style="table-layout: fixed; width: ' + this.width + 'px; height: ' + this.height + 'px;">'],
                theadHtml = ['<thead class="' + this.theadClass + '">'],
                tbodyHtml = ['<tbody class="' + this.tbodyClass + '">'],
                columns = dataSource.columns,
                rows = dataSource.rows;

            // build thead
            theadHtml[theadHtml.length] = buildHeaderRows(columns, this.headerFormatter, this.headerHeight, [this.width]);
            theadHtml[theadHtml.length] = '</thead>';

            // build tbody
            tbodyHtml[tbodyHtml.length] = buildContentRows(rows, this.contentFormatter, columns.length)
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
            this.table.width(offset - freezeColumnContainerWidthOffset);
            this.find('th').width(offset - freezeColumnContainerWidthOffset);
            this.find('td').width(offset - freezeColumnContainerWidthOffset);
        }
    });
    // tables

    // ResizeBar ------------------------------- GO

    function ResizeBar(bar) {
        this.bar = bar;
        this.startOffset = 0;
        this.endOffset = 0;
        this.freezeWidth = 350;
        this.freezeMinWidth = 280;
        this.freezeMaxWidth = 880;
        this.isResizing = false;

        this.mousemover = new Mousemover();

        (function (resizebar) {
            // init DOM
            resizebar.bar
                .unbind('mousedown')
                .bind('mousedown', function (event) {
                    if (event.button <= primaryMouseButton) {
                        resizebar.startOffset = resizebar.mousemover.mouseCoords(event).x;
                        resizebar.endOffset = resizebar.startOffset;
                        resizebar.bar.css({ 'border-left-width': 2 });
                        resizebar.isResizing = true;

                        // begin
                        if ($.isFunction(resizebar.begin)) {
                            resizebar.begin();
                        }

                        setupResizeHandler(resizebar);

                        if (window.event) {
                            window.event.returnValue = false;
                            window.event.cancelBubble = true;
                        }
                    }

                    return false;
                });
            $(document).bind('mouseup', function () {
                if (resizebar.isResizing) {
                    resizebar.isResizing = false;
                    tearDownResizeHandler();

                    resizebar.bar.css({ 'border-left-width': 0 });

                    var offset = resizebar.endOffset - resizebar.startOffset;
                    resizebar.freezeWidth = resizebar.freezeWidth + offset;

                    resizebar.bar.css({ 'margin-left': resizebar.freezeWidth + resizeBarWidthOffset });

                    // complate
                    if (typeof (resizebar.complate) === 'function') {
                        resizebar.complate.call(resizebar, resizebar.freezeWidth);
                    }
                }
                return true;
            });

            function setupResizeHandler(rbar) {
                resizebar.mousemover.unbind('resize-mousemove')
                    .bind('resize-mousemove', function (event, pos) {
                        var startOffset = rbar.startOffset,
                            freezeWidth = rbar.freezeWidth;
                        rbar.endOffset = pos.x;
                        var offset = pos.x - startOffset;
                        var newfreezeWidth = freezeWidth + offset;
                        if (newfreezeWidth <= rbar.freezeMinWidth) {
                            rbar.endOffset = rbar.freezeMinWidth + startOffset - freezeWidth;
                        } else if (newfreezeWidth >= rbar.freezeMaxWidth) {
                            rbar.endOffset = rbar.freezeMaxWidth + startOffset - freezeWidth;
                        }

                        // after reset.
                        newfreezeWidth = freezeWidth + rbar.endOffset - startOffset;

                        rbar.bar.css({ 'margin-left': newfreezeWidth + resizeBarWidthOffset });
                    });
            }

            function tearDownResizeHandler() {
                resizebar.mousemover.unbind('resize-mousemove');
            }
        })(this);
    }

    ResizeBar.prototype = {
        constructor: ResizeBar,
        bind: function (name, callback) {
            if ($.isFunction(callback)) {
                this[name] = callback;
            }
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
                trHtml[trHtml.length] = '<td>' + formatter(row[j]) + '</td>';
            }
            trHtml[trHtml.length] = '</tr>';
            html[html.length] = trHtml.join('');
        }

        return html.join('');
    }

    function buildPager(index, size, total, styleClasses) {
        styleClasses = styleClasses || 'ks-pagination-links';

        var showSize = 7,
            pagecount = Math.ceil(total / size);
        html = ['<div class="' + styleClasses + '"><ul>'];

        var times = Math.ceil(index / showSize),
            i = (times - 1) * showSize + 1,
            end = times * showSize;

        if (times > 1) {
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

        if (times * showSize < pagecount) {
            html[html.length] = '<li class="next"><a href="#page-next">Next &gt;</a></li>';
        }

        html[html.length] = '</ul>';
        html[html.length] = ' <span class="total">(' + total + '&nbsp;results)</span>';
        html[html.length] = '</div>';

        return html.join('');
    }

    // build table ------------------------------ END

    window.FreezeTable = FreezeTable;

    if (!$.fn.freezeTable) {
        $.fn.freezeTable = function (option) {
            option = option || {};
            option.container = this.selector;
            return new FreezeTable(option);
        };
    }

})(jQuery);
