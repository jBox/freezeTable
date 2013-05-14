// ref -- jQuery.
// freezeTable
(function ($, undefined) {

    var tablesContainerTemplate = '<div class="table-container" style="overflow: hidden; position: absolute; z-index: 4;"></div>',
        freezeCornerContainerTemplate = '<div style="background-color: white; overflow: hidden; position: absolute; z-index: 3;"></div>',
        freezeColumnContainerTemplate = '<div style="background-color: white; overflow: hidden; position: absolute; z-index: 2;"></div>',
        freezeHeaderContainerTemplate = '<div style="background-color: white; overflow: hidden; position: absolute; z-index: 1;"></div>',
        freezeFullContainerTemplate = '<div style="background-color: white; position: absolute; z-index: 0; overflow: auto;"></div>',
        leftHorizontalScrollBarTemplate = '<div class="horizontal-scroll-bar-left" style="width: 16px; position: absolute; z-index: 9;">' +
            '<div class="icon" style="position: absolute; display: none; cursor: pointer; width: 14px; height: 14px;"></div>' +
            '</div>',
        rightHorizontalScrollBarTemplate = '<div class="horizontal-scroll-bar-right" style="width: 16px; position: absolute; z-index: 9;">' +
            '<div class="icon" style="position: absolute; display: none; cursor: pointer; width: 14px; height: 14px;"></div>' +
            '</div>',
        resizeBarTemplate = '<div class="freeze-column-resize-bar" style="width: 5px; position: absolute; z-index: 10; display: none;"></div>',
        resizeLineTemplate = '<div class="columns-resize-line" style="position: absolute; z-index: 10; display: none;"></div>',
        tooltipTemplate = '<div class="freezetable-tooltip" style="position: absolute; z-index: 9999; display: none; "></div>';

    // global var.
    var tableHeaderHeightOffset = 0,
        freezeColumnsWidthOffset = 20,
        freezeCornerContainerWidthOffset = 1,
        freezeColumnContainerWidthOffset = 18,
        freezeColumnContainerHeightOffset = 0,
        leftHorizontalScrollBarMarginOffset = -18,
        rightHorizontalScrollBarMarginOffset = 0,
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
                dataSource: [],
                freezed: true,
                formatter: undefined,
                click: undefined,
                mouseover: undefined,
                mouseleave: undefined
            },

            columns: {
                dataSource: [],
                freezed: true, // only support true. so far.
                freezedCount: 1, // only support 1 so far.
                defaultFreezedWidth: 280,
                resizable: true,
                formatter: undefined,
                click: undefined,
                mouseover: undefined,
                mouseleave: undefined,
                tooltip: {
                    enabled: false,
                    htmlLabel: true,
                    formatter: undefined
                },
                frozenColumns: {
                    /*
                    * 冻结列的数量，>=0
                    */
                    count: 1,
                    /*
                    * 每列初始宽度, 初始值 [120] 数组
                    */
                    widths: [120],
                    resizable: true,
                    tooltip: {
                        enabled: true,
                        htmlLabel: true,
                        formatter: undefined
                    }
                }
            },

            // Scroll Bar
            horizontalEnhanced: true,
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
                    wrapperClass: 'ks-pagination-links', // 启用pager是，生成HTML外层标签的CLASS
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
                * fixed: 指定 width，height，忽略minWidth，minHeight，maxWidth，maxHeight
                * fill: 自动填充，minWidth，minHeight，maxWidth，maxHeight 生效，可以不指定 maxWidth，maxHeight
                * portrait: 横向自动填充，minWidth，maxWidth 生效，可以不指定 maxWidth
                * landscape: 纵向自动填充，minHeight，maxHeight 生效，可以不指定 maxHeight
                * extend: 纵向展开，没有滚动条
                */
                stretch: 'fixed'
            },

            dataSource: {
                columns: [],
                rows: []
            }
        });

        this.tables = {
            full: undefined,
            header: undefined,
            columns: undefined,
            corner: undefined
        };

        // remove container
        if (typeof option.container !== 'undefined') {
            delete option.container;
        }

        // extend from user settings.
        extend(this, option);

        this.mainContainerheightOffset = 10;

        // init. DOM            
        this.fullTable = undefined;
        this.cornerTable = undefined;
        this.headerTable = undefined;
        this.columnsTable = undefined;

        this.tablesContainer = $(tablesContainerTemplate);

        tooltip = new Tooltip(this.tooltipTemplate || tooltipTemplate);
        this.mousemover = new Mousemover();

        // 收集的列的点集合
        // [23, 34]
        this.points = [];
        this.availableRange = { x1: 0, x2: 2, y1: 0, y2: 0 };
        this.columnsResizer = null;

        this.init();

        initailizeFreezeTable(this);
    }

    FreezeTable.prototype = {
        constructor: FreezeTable,

        init: function () {
            var isAutoWidth = false,
                isAutoHeight = false;
            this.container.html(this.tablesContainer);

            // init columnsResizer
            this.columnsResizer = new ColumnsResizer(this.container);

            // first setup width & height
            if (this.layout.width == 'auto') {
                isAutoWidth = true;
                var parent = this.container.parent();
                this.layout.width = parent.width() - 20;
                if (this.layout.width < 800) {
                    this.layout.width = 800;
                }
            }

            if (this.layout.height == 'auto') {
                isAutoHeight = true;
                this.layout.height = $('body').height() - 100;
                if (this.layout.height < 400) {
                    this.layout.height = 400;
                }
            }

            if (this.paging.enabled && this.paging.style == 'pager') {
                this.mainContainerheightOffset = 50;
            }

            // setup table
            this.container//.css('position', 'relative')
                .width(this.layout.width + 16)
                .height(this.layout.height + this.mainContainerheightOffset);

            this.tablesContainer.width(this.layout.width).height(this.layout.height);

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
                                this.fullTable.append(source);
                                if (this.columnsTable) this.columnsTable.append(source, this.columns.freezeCount);
                            };
                        }
                        break;

                    case 'pager':
                        var sPager = (this.paging.pager.index - 1) * this.paging.size,
                            ePager = this.paging.pager.index * this.paging.size;

                        dataSource.rows = this.dataSource.rows.slice(sPager, ePager);

                        if (typeof (this.paging.pager.handler) !== 'function') {
                            this.paging.pager.handler = function (index, size, total) {
                                this.init();
                            };
                        }
                        break;
                }

            }

            var baseOption = {
                tableClass: this.layout.tableClass,
                theadClass: this.layout.theadClass,
                tbodyClass: this.layout.tbodyClass
            };

            // init FullTable
            var fulltableOption = extend({
                headerFormatter: this.header.formatter,
                contentFormatter: this.columns.formatter
            }, baseOption);
            var fulltable = new FullTable(fulltableOption);
            fulltable.rander(dataSource);
            fulltable.container.width(this.layout.width).height(this.layout.height);
            this.fullTable = fulltable;
            this.tables['full'] = fulltable;
            this.tablesContainer.html(fulltable.container);
            // 初始化 FullTable

            // 计算FullTable width & height
            var headerCells = fulltable.find('th');

            /* importent!! set height to style */
            headerCells.height(headerCells.height());

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
            // set to style....
            fulltable.table.width(tableWidth);

            // TODO: 当内容不够宽时，放大内容宽度 !!
            if (showWidth < this.layout.width - freezeWidth) {
                tableWidth = Math.floor(tableWidth * (this.layout.width - freezeWidth) / showWidth);
                fulltable.table.width(tableWidth);

                columnWidthList.length = 0;
                headerCells.each(function (index) {
                    columnWidthList[columnWidthList.length] = $(this).width();
                });
            }
            // 当内容不够宽时，放大内容宽度

            var headerHeight = headerCells.height() + tableHeaderHeightOffset;
            var freezeColumnsWidth = columnWidthList[0] + freezeColumnsWidthOffset;
            this.headerHeight = headerHeight;

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
                this.tables['header'] = headertable;
                this.tablesContainer.append(headertable.container);
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
                var columnstable = new ColumnsTable(columnstableOption);
                columnstable.rander({ columns: dataSource.columns.slice(0, this.columns.freezedCount), rows: dataSource.rows });

                this.columnsTable = columnstable;
                this.tables['columns'] = columnstable;
                this.tablesContainer.append(columnstable.container);
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
                    rightHorizontalScrollBar.css({ 'margin-left': this.layout.width + rightHorizontalScrollBarMarginOffset, 'height': this.layout.height });

                    this.container.append(leftHorizontalScrollBar);
                    this.container.append(rightHorizontalScrollBar);

                    this.leftHorizontalScrollBar = leftHorizontalScrollBar;
                    this.rightHorizontalScrollBar = rightHorizontalScrollBar;

                    // 绑定事件
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
                                var leftOffset = leftHorizontalScrollBar.offset().top;
                                leftHorizontalScrollBar.children('.icon').css('margin-top', pos.y - leftOffset + imageMarginMouseOffset);
                            }

                            if (isRightBarVisiable) {
                                var rightOffset = rightHorizontalScrollBar.offset().top;
                                rightHorizontalScrollBar.children('.icon').css('margin-top', pos.y - rightOffset + imageMarginMouseOffset);
                            }
                        });
                    })(this);

                    this.columnsResizer.bind('begin', function () {
                        this.hide();
                    }, leftHorizontalScrollBar);
                    this.columnsResizer.bind('complete', function () {
                        this.show();
                    }, leftHorizontalScrollBar);
                }
            }

            if (this.header.freezed && this.columns.freezed) {
                // Corner -------------------------------------- start
                var cornertableOption = extend({
                    width: freezeWidth - freezeColumnContainerWidthOffset,
                    height: headerHeight,
                    formatter: this.header.formatter
                }, baseOption);
                var cornertable = new CornerTable(cornertableOption);
                cornertable.rander(dataSource.columns.slice(0, this.columns.freezedCount));

                this.cornerTable = cornertable;
                this.tables['corner'] = cornertable;
                this.tablesContainer.append(cornertable.container);
                // Corner -------------------------------------- end
            }

            // bind scroll event.
            var scroller = new Scroller(this.fullTable.container);
            if (this.header.freezed) {
                scroller.bind('vertical-bar', verticalScrollBarChanged, this);
            }
            if (this.columns.freezed) {
                scroller.bind('horizontal-bar', horizontalScrollBarChanged, this);
            }
            
            // resize handler bind
            var reiszetables = [];
            if (this.columns.frozenColumns.count > 0 && this.columns.frozenColumns.resizable) {
                reiszetables.push(this.tables['columns']);
            }
            if (this.columns.resizable) {
                reiszetables.push(this.tables['full']);
            }
            this.columnsResizer.bind('begin', function () {
                leftHorizontalScrollBar.hide();
            }, this);
            this.columnsResizer.bind('complete', function (position/*{start, offset}*/) {
                var i = 0,
                    len = reiszetables.length;
                for (i = 0; i < len; i++) {
                    // 检查到第一个能处理的table就停止
                    if (reiszetables[i].handleColumnsResized(position, this)) {
                        break;
                    }
                }
            }, this);


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
                                    return;
                                }
                            }
                        }
                        var index = parseInt($th.attr('data-sequence'));
                        table.header.click.call(table, table.dataSource.columns[index]);
                    } catch (ex) { /*ignore.*/ }
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
                                            paging.listing.handler.call(table, ++listingPagingIndex, paging.size, paging.total);
                                        } catch (ex) { /*ignore*/ }
                                        isListingLoading = false;
                                    }
                                }
                            });
                            break;

                        case 'pager':
                            var pager = $(buildPager(paging.pager.index, paging.size, paging.total)).css('margin-top', table.layout.height + 10);
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

            // first setup width & height
            if (isAutoWidth) {
                (function (table) {
                    $(window).bind('resize', function () {
                        var resizeWidth = parent.width() - 20;
                        if (resizeWidth < 800) {
                            resizeWidth = 800;
                        }

                        table.width(resizeWidth);
                    });
                })(this);
            }

            if (isAutoHeight) {
                (function (table) {
                    $(window).bind('resize', function () {
                        var resizeHeigth = $('body').height() - 100;
                        if (resizeHeigth < 400) {
                            resizeHeigth = 400;
                        }
                        table.height(resizeHeigth);
                    });
                })(this);
            }

            // setup points & availableRange
            var cOffset = this.container.offset();
            this.availableRange = {
                x1: cOffset.left + 10,
                x2: cOffset.left + this.layout.width - 5,
                y1: cOffset.top + 5,
                y2: cOffset.top + this.layout.height - 10
            };
            this.refreshResizerInfos();
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
        },

        width: function (width) {
            this.layout.width = width;
            this.container.width(width)
            this.tablesContainer.width(width);
            if (this.columns.freezed) {
                var freezeWidth = this.resizeBar.freezeWidth || this.columns.defaultFreezedWidth;
                this.fullTable.container.width(width - freezeWidth);
                this.headerTable.container.width(width - freezeWidth);
            } else {
                this.fullTable.container.width(width);
                this.headerTable.container.width(width);
            }

            if (this.rightHorizontalScrollBar) {
                this.rightHorizontalScrollBar.css({ 'margin-left': width + rightHorizontalScrollBarMarginOffset });
            }
        },

        height: function (height) {
            this.layout.height = height;
            this.container.height(height + this.mainContainerheightOffset);
            this.tablesContainer.height(height);

            if (this.header.freezed) {
                var headerHeight = this.fullTable.find('th').height();
                this.columnsTable.container.height(height - headerHeight + freezeColumnContainerHeightOffset);
                this.fullTable.container.height(height - headerHeight + freezeColumnContainerHeightOffset);
            } else {
                this.fullTable.container.width(height);
                this.columnsTable.container.height(height);
            }

            if (this.leftHorizontalScrollBar) {
                this.leftHorizontalScrollBar.height(height);
            }

            if (this.rightHorizontalScrollBar) {
                this.rightHorizontalScrollBar.height(height);
            }

            if (this.resizeBar) {
                this.resizeBar.height(height);
            }
        },

        refreshResizerInfos: function () { 

            var fulltable = this.tables['full'],
                fullCells = fulltable.find('th'),
                freezedCount = this.columns.frozenColumns.count,
                available = this.availableRange,
                points = [];

            // 内容表 每一列
            fullCells.each(function (index) {
                if (index > freezedCount) {
                    var left = $(fullCells[index]).offset().left;
                    if (left <= available.x2 && left >= available.x1) {
                        points[points.length] = left;
                    }
                }
            });
            // 内容表 最右边
            var tableleft = fulltable.table.offset().left + fulltable.table.width();
            if (tableleft <= available.x2 && tableleft >= available.x1) {
                points[points.length] = tableleft;
            }

            if (typeof this.tables['columns'] !== 'undefined') {
                var columnstable = this.tables['columns'],
                    columnsCells = columnstable.find('th');
                
                // 冻结表 每一列      
                columnsCells.each(function (index) {
                    if (index > 1) {
                        var left = $(columnsCells[index]).offset().left;
                        if (left <= available.x2 && left >= available.x1) {
                            points[points.length] = left;
                        }
                    }
                });

                // 冻结表 最右边
                var columnsleft = columnstable.table.offset().left + columnstable.table.width();
                if (columnsleft <= available.x2 && columnsleft >= available.x1) {
                    points[points.length] = columnsleft;
                }
            }

            this.columnsResizer.reset(points);
        }
    };

    function initailizeFreezeTable(table) {

        // bind scroll event.
        var scroller = new Scroller(table.fullTable.container);
        if (table.header.freezed) {
            scroller.bind('vertical-bar', verticalScrollBarChanged, table);
        }
        if (table.columns.freezed) {
            scroller.bind('horizontal-bar', horizontalScrollBarChanged, table);
        }
    }

    /*
    * vertical scroll bar changed for table
    */
    function verticalScrollBarChanged(position) {
        var columnsContainer = this.columnsTable.container,
            headerHeight = this.headerHeight || 280;

        columnsContainer.scrollTop(position);
        var realScrollTop = columnsContainer.scrollTop();
        if (position > realScrollTop) {
            var vt = position - realScrollTop;
            columnsContainer.css('margin-top', headerHeight - vt);
        } else {
            columnsContainer.css('margin-top', headerHeight);
        }
    }

    /*
    * horizontal ScrollBar Changed for table
    */
    function horizontalScrollBarChanged(position) {
        var headerContainer = this.headerTable.container,
        freezeWidth = this.freezeWidth || 280;

        headerContainer.scrollLeft(position);
        var realScrollLeft = headerContainer.scrollLeft();
        if (position > realScrollLeft) {
            var vl = position - realScrollLeft;
            headerContainer.css('margin-left', freezeWidth - vl);
        } else {
            headerContainer.css('margin-left', freezeWidth);
        }
    }

    // FreezeTable ------------------------------- END

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
                            console.log(ex);
                        }
                    }
                } else if (scroller.top != bar.scrollTop()) {
                    scroller.top = bar.scrollTop();
                    for (i = handlers['vertical-bar'].length - 1; i >= 0; i--) {
                        try {
                            var vb = handlers['vertical-bar'][i];
                            vb.callback.call(vb.arg, scroller.top);
                        } catch (ex) {
                            console.log(ex);
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
                theadHtml = ['<thead class="' + this.theadClass + '">'],
                tbodyHtml = ['<tbody class="' + this.tbodyClass + '">'];

            // cal width.
            var totalWidth = 0,
                i = 0;
            for (i = columns.length - 1; i >= 0; i--) {
                // TODO: settings 120.
                totalWidth += 120;
            }
            /*importent!*/
            var tableHtml = ['<table class="' + this.tableClass + '" style="table-layout: fixed; width: ' + totalWidth + 'px;">'];

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
        resize: function (offset, viewWidth) {
            this.container.css('margin-left', offset).width(viewWidth);
        },
        /*
        * position: {start : 0, offset : 0}
        * freezetable: table
        */
        handleColumnsResized: function (position/*{start, offset}*/, freezetable) {
            // 找到谁被拖动了.
            var fulltable = this.table,
                selected = undefined,
                cells = this.find('th'),
                i = 0,
                len = cells.length;

            // 判断是否表的最右边
            var tableleft = fulltable.offset().left + fulltable.width();
            if (position.start <= tableleft + 10 && position.start >= tableleft - 10) {
                selected = cells.last(); // 表示最后一个被拖
            } else {
                // 判断其他列
                for (i = freezetable.columns.frozenColumns.count; i < len; i++) {
                    var c = $(cells[i]),
                        left = c.offset().left;

                    if (position.start <= left + 10 && position.start >= left - 10) {
                        selected = $(cells[i - 1]); // 表示前一个格子被拖动了
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
            var tableHtml = ['<table class="' + this.tableClass + '" style="table-layout: fixed; width: ' + this.width + 'px; height: ' + this.height + 'px;"><thead class="' + this.theadClass + '">'];
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
            this.table.width(offset - freezeColumnContainerWidthOffset);
            this.find('th').width(offset - freezeColumnContainerWidthOffset);
            this.find('td').width(offset - freezeColumnContainerWidthOffset);
        },
        /*
        * position: {start : 0, offset : 0}
        * freezetable: table
        */
        handleColumnsResized: function (position/*{start, offset}*/, freezetable) {
            // 找到谁被拖动了.
            var columnstable = this.table,
                selected = undefined,
                cells = this.find('th'),
                i = 0,
                len = cells.length;

            // 判断是否表的最右边
            var tableleft = columnstable.offset().left + columnstable.width();
            if (position.start <= tableleft + 10 && position.start >= tableleft - 10) {
                selected = cells.last(); // 表示最后一个被拖
            } else {
                // 判断其他列
                for (i = freezetable.columns.frozenColumns.count; i < len; i++) {
                    var c = $(cells[i]),
                        left = c.offset().left;

                    if (position.start <= left + 10 && position.start >= left - 10) {
                        selected = $(cells[i - 1]); // 表示前一个格子被拖动了
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
                container = resizebar.container;

            // setup line to container
            container.append(line);

            // init DOM
            resizebar.container.bind('mousedown', function (event) {
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
                            console.log(ex);
                        }
                    }
                }
            }

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
                    bar = new ResizeBar(container, height);
                    bars[bars.length] = bar;
                }

                barslen = this.barsPool.length;
            }

            for (i = 0; i < barslen; i++) {
                bar = bars[i];
                bar.hide();
                if (i < plen) {
                    bar.position(points[i] - 4 - pOffset);
                    bar.show();
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

    function ResizeBar(container, height) {
        this.display = false;
        this.bar = $(resizeBarTemplate).height(height);
        container.append(this.bar);
    }

    ResizeBar.prototype = {
        constructor: ResizeBar,
        show: function () {
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
            pagecount = Math.ceil(total / size),
            html = ['<div class="' + styleClasses + '"><ul>'];

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
