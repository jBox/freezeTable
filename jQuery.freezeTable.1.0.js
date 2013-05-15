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
    var freezeCornerContainerWidthOffset = 1,
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
                freezed: true,
                formatter: undefined,
                click: undefined,
                mouseover: undefined,
                mouseleave: undefined
            },

            columns: {
                resizable: true,
                formatter: undefined,
                click: undefined,
                mouseover: undefined,
                mouseleave: undefined,
                tooltip: {
                    enabled: true,
                    htmlLabel: true,
                    formatter: undefined
                },
                frozenColumns: {
                    /*
                    * 冻结列的数量，>=0
                    */
                    count: 1,
                    /*
                    * 每列初始宽度, 初始值 [260] 数组
                    */
                    widths: [260], // 不能为空
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
                * fixed: 指定 width，height，忽略 minWidth，minHeight，maxWidth，maxHeight
                * fill: 自动填充，minWidth，minHeight，maxWidth，maxHeight 生效，可以不指定 maxWidth，maxHeight
                * portrait: 横向自动填充，minWidth，maxWidth 生效，可以不指定 maxWidth
                * landscape: 纵向自动填充，minHeight，maxHeight 生效，可以不指定 maxHeight
                * extend: 纵向展开，没有滚动条
                */
                stretch: 'fill'
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

        // 收集的列的点集合
        // [23, 34]
        this.points = [];
        this.availableRange = { x1: 0, x2: 2, y1: 0, y2: 0 };
        this.columnsResizer = null;

        freezeTableInitializer.call(this);
    }

    FreezeTable.prototype = {
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

        width: function(width) {
            var full = this.tables['full'],
                header = this.tables['header'],
                columns = this.tables['columns'];

            this.layout.width = width;
            this.container.width(width);
            this.container.children('.table-container').width(width);

            if (this.columns.frozenColumns.count > 0) {
                var freezeWidth = columns.container.width();
                console.log('columns.container: '+ freezeWidth);
                full.container.width(width - freezeWidth);
                header.container.width(width - freezeWidth);
            } else {
                full.container.width(width);
                header.container.width(width);
            }
            
            var cOffset = this.container.offset();
            this.availableRange = {
                x1: cOffset.left + 10,
                x2: cOffset.left + this.layout.width - 5,
                y1: cOffset.top + 5,
                y2: cOffset.top + this.layout.height - 10
            };
            
            this.refreshResizerInfos();
            
            if (typeof this.eventHandlers['sizechanged'] !== 'undefined') {
                var h = this.eventHandlers['sizechanged'],
                    i = 0;
                for (i = h.length - 1; i >= 0; i--) {
                    try {
                        h[i].call(this, { width: width, height: this.layout.height });
                    } catch (ex) {
                    }
                }
            }
        },

        height: function (height) {
            var full = this.tables['full'],
                columns = this.tables['columns'];
            this.layout.height = height;
            this.container.height(height);
            this.container.children('.table-container').height(height);

            if (this.header.freezed) {
                var theadHeight = full.theadHeight();
                columns.container.height(height - theadHeight);
                full.container.height(height - theadHeight);
            } else {
                full.container.width(height);
                columns.container.height(height);
            }

            var cOffset = this.container.offset();
            this.availableRange = {
                x1: cOffset.left + 10,
                x2: cOffset.left + this.layout.width - 5,
                y1: cOffset.top + 5,
                y2: cOffset.top + this.layout.height - 10
            };

            this.refreshResizerInfos();

            if (typeof this.eventHandlers['sizechanged'] !== 'undefined') {
                var h = this.eventHandlers['sizechanged'],
                    i = 0;
                for (i = h.length - 1; i >= 0; i--) {
                    try {
                        h[i].call(this, { height: height, width: this.layout.width });
                    } catch (ex) {
                    }
                }
            }
        },

        refreshResizerInfos: function () {
            var available = this.availableRange,
                points = [];

            if (this.columns.resizable) {
                var fulltable = this.tables['full'],
                    fullCells = fulltable.find('th'),
                    freezedCount = this.columns.frozenColumns.count;

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
            }

            if (this.columns.frozenColumns.resizable && typeof this.tables['columns'] !== 'undefined') {
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

            this.columnsResizer.height = this.layout.height;
            this.columnsResizer.reset(points);
        },
        
        bind: function (event, callback) {
            var handlers = this.eventHandlers;
            if (typeof handlers[event] === 'undefined') {
                handlers[event] = [];
            }

            if (typeof callback === 'function') {
                handlers[event].push(callback);
            }
        }
    };

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
                tablesContainer,
                headerHeight,
                freezeWidth,
                this.columns.frozenColumns.count);
        }

        // horizontal - enhanced
        if (this.scrollbar.enhanced) {

            var baseHeaderColumnOffset = $(headercells[0]).offset().left,
                leftHorizontalScrollBar = $(leftHorizontalScrollBarTemplate),
                rightHorizontalScrollBar = $(rightHorizontalScrollBarTemplate),
                isLeftBarVisiable = false,
                isRightBarVisiable = false;

            leftHorizontalScrollBar.css({ 'margin-left': freezeWidth + leftHorizontalScrollBarMarginOffset, 'height': this.layout.height });
            rightHorizontalScrollBar.css({ 'margin-left': this.layout.width + rightHorizontalScrollBarMarginOffset, 'height': this.layout.height });

            this.container.append(leftHorizontalScrollBar);
            this.container.append(rightHorizontalScrollBar);

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
                    rightHorizontalScrollBar.css({ 'margin-left': szie.width + rightHorizontalScrollBarMarginOffset, 'height': szie.height });
                });
            })(this);

            this.columnsResizer.bind('begin', function () {
                this.hide();
            }, leftHorizontalScrollBar);
            this.columnsResizer.bind('complete', function () {
                this.show();
            }, leftHorizontalScrollBar);

            this.tables['columns'].bind('sizechanged', function (size) {
                leftHorizontalScrollBar.css({ 'margin-left': size.width + leftHorizontalScrollBarMarginOffset });
            });
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

        // setup points & availableRange
        var cOffset = this.container.offset();
        this.availableRange = {
            x1: cOffset.left + 10,
            x2: cOffset.left + this.layout.width - 5,
            y1: cOffset.top + 5,
            y2: cOffset.top + this.layout.height - 10
        };
        this.refreshResizerInfos();

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
                // 检查到第一个能处理的table就停止
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
            console.log('HresizeHeighteight: ' + resizeHeight);
            return resizeHeight;
        }

        function landscapeSize(win) {
            var resizeWidth = $(win).width() - 50;

            if (resizeWidth < layout.minWidth) {
                resizeWidth = layout.minWidth;
            } else if (typeof layout.maxWidth === 'number' && resizeWidth > layout.maxWidth) {
                resizeWidth = layout.maxWidth;
            }

            console.log('resizeWidth: ' + resizeWidth);
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
            headerFormatter: header.formatter,
            contentFormatter: columns.formatter
        };

        var full = new FullTable(fulltableOption);
        full.rander(dataSource, columns.resizable);
        full.container
            .width(layout.width)
            .height(layout.height);

        tablesContainer.html(full.container);

        // setup base spec
        var cells = full.find('th');
        /* importent!! set height to style */
        var headerHeight = cells.height();
        cells.height(headerHeight);

        // TODO: 当内容不够宽时，放大内容宽度 !!

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
        headert.rander(dataSource.columns);
        tablesContainer.append(headert.container);


        // 当同时锁定表头与列时
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
        columnstable.rander({ columns: dataSource.columns.slice(0, count), rows: dataSource.rows });

        tablesContainer.append(columnstable.container);
        columnstable.container.width(freezeWidth);

        // 当同时锁定表头与列时
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

    function initializeCornerTable(dataSource, layout, header, tablesContainer, headerHeight, freezeWidth, frozenColumnsCount) {
        var cornertableOption = {
            tableClass: layout.tableClass,
            theadClass: layout.theadClass,
            tbodyClass: layout.tbodyClass,
            width: freezeWidth,
            height: headerHeight,
            formatter: header.formatter
        };

        var corner = new CornerTable(cornertableOption);
        corner.rander(dataSource.columns.slice(0, frozenColumnsCount));
        tablesContainer.append(corner.container);

        return corner;
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
        * 返回表头单元格实际宽度
        */
        thCellsWidth: function () {
            var widths = [0],
                realwidths = [],
                i = 0,
                len =0;
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
    }
    inherit(FullTable, TableBase);
    extend(FullTable.prototype, {
        rander: function (dataSource, columnsResizable) {
            var columns = dataSource.columns || [],
                rows = dataSource.rows || [],
                tableHtml = ['<table class="' + this.tableClass + '">'],
                theadHtml = ['<thead class="' + this.theadClass + '">'],
                tbodyHtml = ['<tbody class="' + this.tbodyClass + '">'];

            if (columnsResizable) {
                // cal width.
                var totalWidth = 0,
                    i = 0;
                for (i = columns.length - 1; i >= 0; i--) {
                    // TODO: settings 120.
                    totalWidth += 120;
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
            tableHtml[tableHtml.length] = buildHeaderRows(dataColumns, this.formatter, this.height);
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
        this.columnsWidth = option.columnsWidth;
    }
    inherit(HeaderTable, TableBase);
    extend(HeaderTable.prototype, {
        rander: function (dataColumns) {
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
        rander: function (dataSource) {

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
                            console.log(ex);
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
