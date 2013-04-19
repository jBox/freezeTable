// ref -- jQuery.
// freezeTable
(function ($, undefined) {

    var freezeCornerContainerTemplate = '<div style="background-color: white; overflow: hidden; position: absolute; z-index: 3;"></div>',
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
        freezeColumnContainerHeightOffset = -4,
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
                extend(obj[k], ext[k]);
            } else {
                obj[k] = ext[k];
            }
        }

        return obj;
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
        // remove container
        delete option.container;

        extend(this, option);

        // init. DOM            
        this.contentContainer = $(contentContainerTemplate);
        this.freezeHeaderContainer = $(freezeHeaderContainerTemplate);
        this.freezeColumnContainer = $(freezeColumnContainerTemplate);
        this.freezeCornerContainer = $(freezeCornerContainerTemplate);

        tooltip = new Tooltip(this.tooltipTemplate || tooltipTemplate);
        this.mousemover = new Mousemover();

        this.newInit();
    }

    FreezeTable.prototype = {
        constructor: FreezeTable,

        newInit:function(){
            this.tables = [];
            var freezedCount = this.columns.freezedCount,
               i = 0;

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
                        var fulltable = buildContentRows(source, this.columns.formatter);
                        var columntable = buildContentRows(source, this.columns.formatter, this.columns.freezeCount);

                        this.tables[0].find('tbody:first').append(fulltable);
                        // ??
                        // this.tables[3].find('tbody:first').append(columntable);
                    }
                }
            }

            var tableOption = {
                tableClass: this.layout.tableClass,
                theadClass: this.layout.theadClass,
                tbodyClass: this.layout.tbodyClass,
                width:this.layout.width,
                height :this.layout.height
            };

            var fulltable = new FullTable(tableOption);
            fulltable.rander(dataSource, this.header.formatter, this.columns.formatter);
            this.tables.push(fulltable);
            this.container.html(fulltable.container);

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

            // after content is ready, init base size
            var freezeWidth = this.columns.defaultFreezedWidth;
            var tableHeight = fulltable.table.height() + tableHeaderHeightOffset;
            var tableWidth = fulltable.table.width();

            if (!this.header.freezed) {
                this.layout.height = contentTable.height() + 20;
            }

            if (this.paging.enabled && this.paging.style == 'traditional') {
                this.container.height(this.layout.height + 50);
            } else {
                this.container.height(this.layout.height);
            }

            if (showWidth < this.layout.width - freezeWidth) {
                tableWidth = Math.floor(tableWidth * (this.layout.width - freezeWidth) / showWidth);
                fulltable.table.width(tableWidth);
            }

            var headerHeight = headerCells.height() + tableHeaderHeightOffset;
            var freezeColumnsWidth = headerCells.first().width() + freezeColumnsWidthOffset;

            fulltable.container
                .css('margin-top', headerHeight)
                .css('margin-left', freezeWidth)
                .width(this.layout.width - freezeWidth)
                .height(this.layout.height - headerHeight);

            fulltable.table.css('margin-top', -headerHeight)
                .css('margin-left', -freezeColumnsWidth);

            var headertable = new HeaderTable(tableOption);
            headertable.rander(dataSource.columns, this.header.formatter, this.columns.formatter, columnWidthList);
            this.tables.push(headertable);
            this.container.append(headertable.container);
        },

        init: function () {
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
                        var fulltable = buildContentRows(source, this.columns.formatter);
                        var columntable = buildContentRows(source, this.columns.formatter, this.columns.freezeCount);

                        this.contentContainer.find('tbody:first').append(fulltable);
                        this.freezeColumnContainer.find('tbody:first').append(columntable);
                    }
                }
            }

            var freezedCount = this.columns.freezedCount,
                i = 0;

            // setup table
            this.container
                .width(this.layout.width)
                .css('overflow', 'hidden')
                .html(this.contentContainer)
                .append(this.freezeCornerContainer)
                .append(this.freezeHeaderContainer)
                .append(this.freezeColumnContainer);

            // 内容 -------------------------------------- start
            this.contentContainer.html(randerFullTable(dataSource, this.header.formatter, this.columns.formatter, this.layout));
            var contentTable = this.contentContainer.children('table');
            var contentTableHeaderCells = contentTable.find('th');

            if (!this.header.freezed) {
                this.layout.height = contentTable.height() + 20;
            }

            if (this.paging.enabled && this.paging.style == 'traditional') {
                this.container.height(this.layout.height + 50);
            } else {
                this.container.height(this.layout.height);
            }

            // after content is ready, init base size
            var freezeWidth = this.columns.defaultFreezedWidth;
            var tableHeight = contentTable.height() + tableHeaderHeightOffset;
            var tableWidth = contentTable.width();

            var showWidth = 0;
            contentTableHeaderCells.each(function (index) {
                if (index != 0) { showWidth += $(this).width(); }
            });
            if (showWidth < this.layout.width - freezeWidth) {
                tableWidth = Math.floor(tableWidth * (this.layout.width - freezeWidth) / showWidth);
                contentTable.width(tableWidth);
            }

            var headerHeight = contentTableHeaderCells.height() + tableHeaderHeightOffset;
            // why plus 20?
            var freezeColumnsWidth = contentTableHeaderCells.first().width() + freezeColumnsWidthOffset;

            this.contentContainer
                .css('margin-top', headerHeight)
                .css('margin-left', freezeWidth)
                .width(this.layout.width - freezeWidth)
                .height(this.layout.height - headerHeight);

            contentTable.css('margin-top', -headerHeight)
                .css('margin-left', -freezeColumnsWidth);
            // 内容 -------------------------------------- end

            // 表头与列交叉 -------------------------------------- start			
            var cornerWidth = freezeWidth + freezeCornerContainerWidthOffset;
            this.freezeCornerContainer
                .width(cornerWidth)
                .html(randerFreezeCorner(dataSource, freezedCount, this.header.formatter, this.layout));

            this.freezeCornerContainer.find('table').css({ 'table-layout': 'fixed' });

            this.freezeCornerContainer.find('th')
                .width(cornerWidth)
                .height(headerHeight);
            // 表头与列交叉 -------------------------------------- end

            // 表头 -------------------------------------- start
            this.freezeHeaderContainer
                .width(this.layout.width)
                .html(randerFreezeHeader(dataSource, this.header.formatter, this.layout));

            var freezeHeaderTable = this.freezeHeaderContainer.children('table');

            freezeHeaderTable.width(tableWidth)
                .css('margin-left', -freezeColumnsWidth);

            var freezeHeaderCells = this.freezeHeaderContainer.find('th');

            for (i = 0; i < contentTableHeaderCells.length; i++) {
                $(freezeHeaderCells[i]).width($(contentTableHeaderCells[i]).width());
            }

            this.freezeHeaderContainer
                .css('margin-left', freezeWidth)
                .width(this.freezeHeaderContainer.width() - freezeWidth);
            // 表头 -------------------------------------- end

            // 列 -------------------------------------- start
            this.freezeColumnContainer
                .height(this.layout.height - headerHeight + freezeColumnContainerHeightOffset)
                .width(freezeWidth)
                .css('margin-top', headerHeight)
                .html(randerFreezeColumnTable(dataSource, freezedCount, this.header.formatter, this.columns.formatter, this.layout));

            var freezeColumnTable = this.freezeColumnContainer.children('table');

            this.freezeColumnContainer.find('th')
                .width(freezeWidth - freezeColumnContainerWidthOffset)
                .height(headerHeight);

            this.freezeColumnContainer.find('td')
                .width(freezeWidth - freezeColumnContainerWidthOffset);

            freezeColumnTable.css({ 'margin-top': -headerHeight, 'table-layout': 'fixed', 'width': freezeWidth - freezeColumnContainerWidthOffset });
            // 列 -------------------------------------- end

            // setup events bind.
            (function (table) {
                var freezeInnter = {
                    isLeftBarVisiable: false,
                    isRightBarVisiable: false
                };
                var contentTableHeaderCells = table.contentContainer.find('th');
                // horizontal - enhanced
                if (table.horizontalEnhanced) {

                    var baseHeaderColumnOffset = $(contentTableHeaderCells[1]).offset().left;

                    table.leftHorizontalScrollBar = $(leftHorizontalScrollBarTemplate)
                        .css({ 'margin-left': freezeWidth + leftHorizontalScrollBarMarginOffset, 'height': table.layout.height });
                    table.rightHorizontalScrollBar = $(rightHorizontalScrollBarTemplate)
                        .css({ 'margin-left': table.layout.width, 'height': table.layout.height });
                    table.container.append(table.leftHorizontalScrollBar);
                    table.container.append(table.rightHorizontalScrollBar);

                    freezeInnter.isLeftBarVisiable = false;
                    freezeInnter.isRightBarVisiable = false;

                    table.leftHorizontalScrollBar
                        .unbind('mouseover')
                        .unbind('mouseout')
                        .bind('mouseover', function (event) {
                            freezeInnter.isLeftBarVisiable = true;
                            $(this).children('img').show();
                            return false;
                        })
                        .bind('mouseout', function () {
                            $(this).children('img').hide();
                            freezeInnter.isLeftBarVisiable = false;
                            return false;
                        })
                        .children('img').bind('click', function () {
                            var offset = baseHeaderColumnOffset;
                            contentTableHeaderCells.each(function (index) {
                                var os = $(this).offset().left;
                                if (os < baseHeaderColumnOffset) {
                                    offset = os;
                                }
                            });

                            var scrollOffset = baseHeaderColumnOffset - offset;
                            table.contentContainer.animate({ scrollLeft: '-=' + scrollOffset }, 300);
                        });

                    table.rightHorizontalScrollBar
                        .unbind('mouseover')
                        .unbind('mouseout')
                        .bind('mouseover', function (event) {
                            freezeInnter.isRightBarVisiable = true;
                            $(this).children('img').show();
                            return false;
                        })
                        .bind('mouseout', function () {
                            $(this).children('img').hide();
                            freezeInnter.isRightBarVisiable = false;
                            return false;
                        })
                        .children('img').bind('click', function () {
                            var offset = baseHeaderColumnOffset;
                            contentTableHeaderCells.each(function (index) {
                                var os = $(this).offset().left;
                                if (offset == baseHeaderColumnOffset && os > baseHeaderColumnOffset) {
                                    offset = os;
                                }
                            });

                            var scrollOffset = offset - baseHeaderColumnOffset;
                            table.contentContainer.animate({ scrollLeft: '+=' + scrollOffset }, 300);
                        });

                    table.mousemover.bind('horizontal-enhanced-mousemove', function (event, pos) {
                        if (freezeInnter.isLeftBarVisiable) {
                            var leftOffset = table.leftHorizontalScrollBar.position().top;
                            table.leftHorizontalScrollBar.children('img').css('margin-top', pos.y - leftOffset + imageMarginMouseOffset);
                        }

                        if (freezeInnter.isRightBarVisiable) {
                            var rightOffset = table.rightHorizontalScrollBar.position().top;
                            table.rightHorizontalScrollBar.children('img').css('margin-top', pos.y - rightOffset + imageMarginMouseOffset);
                        }
                    });
                }

                // resize bind
                if (table.columns.resizable) {
                    var bar = $(resizeBarTemplate).css({ 'margin-left': freezeWidth + resizeBarWidthOffset, 'height': table.layout.height });
                    table.container.append(bar);
                    table.resizeBar = new ResizeBar(bar);
                    table.resizeBar.freezeWidth = freezeWidth;
                    table.resizeBar.freezeMinWidth = table.columns.defaultFreezedWidth;
                    table.resizeBar.freezeMaxWidth = table.layout.width - 160;

                    table.resizeBar.bind('begin', function () {
                        table.leftHorizontalScrollBar.hide();
                    });
                    table.resizeBar.bind('complate', function (width) {
                        table.resize(width);
                    });
                }

                // bind scroll event.
                table.contentContainer
                    .unbind('scroll')
                    .bind('scroll', function () {
                        var scrollLeft = table.contentContainer.scrollLeft(),
                            scrollTop = table.contentContainer.scrollTop(),
                            width = table.resizeBar.freezeWidth || freezeWidth;

                        table.freezeHeaderContainer.scrollLeft(scrollLeft);
                        table.freezeColumnContainer.scrollTop(scrollTop);

                        if (scrollLeft > table.freezeHeaderContainer.scrollLeft()) {
                            var vl = scrollLeft - table.freezeHeaderContainer.scrollLeft();
                            table.freezeHeaderContainer.css('margin-left', width - vl);
                        } else {
                            table.freezeHeaderContainer.css('margin-left', width);
                        }

                        if (scrollTop > table.freezeColumnContainer.scrollTop()) {
                            var vt = scrollTop - table.freezeColumnContainer.scrollTop();
                            table.freezeColumnContainer.css('margin-top', headerHeight - vt);
                        } else {
                            table.freezeColumnContainer.css('margin-top', headerHeight);
                        }
                    });

                // bind mouseover & mouseleave event.
                table.freezeColumnContainer
                    .unbind('mouseover')
                    .unbind('mouseleave')
                    .bind('mouseover', function (event) {
                        if (table.columns.tooltip.enabled) {
                            if (event.target.nodeName == 'TD') {

                                if (typeof table.columns.tooltip.formatter !== 'function') {
                                    table.columns.tooltip.formatter = function (target) {
                                        return $(target).text();
                                    };
                                }

                                tooltip.show(table.columns.tooltip.formatter(event.target), table.columns.tooltip.htmlLabel);
                            }
                            return false;
                        }
                        return true;
                    })
                    .bind('mouseleave', function (event) {
                        if (table.columns.tooltip.enabled) {
                            tooltip.hide();
                            return false;
                        }
                        return true;
                    });

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
                    table.freezeCornerContainer.unbind('click')
                        .bind('click', headerClickHandler);
                    table.freezeHeaderContainer.unbind('click')
                        .bind('click', headerClickHandler);
                }

                if (table.paging.enabled) {
                    table.paging.total = table.paging.total || table.dataSource.rows.length;
                    var paging = table.paging;

                    switch (paging.style) {
                        case 'listing':
                            table.contentContainer.bind('scroll', function () {
                                if (this.scrollHeight > 0) {
                                    var $this = $(this);
                                    var thisHeight = $this.height();
                                    var offsetlimit = Math.floor(thisHeight / 4);
                                    var topOffset = this.scrollHeight - $this.scrollTop() - thisHeight;
                                    if (!table.isListingLoading && topOffset <= offsetlimit) {
                                        table.isListingLoading = true;

                                        try {
                                            paging.listingLoading.call(table, ++pagingIndex, paging.size, paging.total);
                                        } catch (ex) { /*ignore*/ }
                                        table.isListingLoading = false;
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

        resize: function (width) {

            this.contentContainer.css('margin-left', width)
                .width(this.layout.width - width);

            // header
            this.freezeHeaderContainer.css('margin-left', width)
                .width(this.layout.width - width);

            // column
            this.freezeColumnContainer.width(width);
            this.freezeColumnContainer.children('table')
                .width(width - freezeColumnContainerWidthOffset);
            this.freezeColumnContainer.find('th')
                .width(width - freezeColumnContainerWidthOffset);
            this.freezeColumnContainer.find('td')
                .width(width - freezeColumnContainerWidthOffset);

            // corner
            var cornerWidth = width + freezeCornerContainerWidthOffset;
            this.freezeCornerContainer.width(cornerWidth);
            this.freezeCornerContainer.find('th').width(cornerWidth);

            // horizontal scroll bar
            this.leftHorizontalScrollBar.css({ 'margin-left': width + leftHorizontalScrollBarMarginOffset }).show();
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

    function FullTable(option) {
        option.connainerTemplate = freezeFullContainerTemplate;
        option.type = 'full';
        TableBase.call(this, option);
    }
    extend(FullTable.prototype, {
        constructor: FullTable,
        rander: function (dataSource, headerFormatter, contentFormatter) {
            var columns = dataSource.columns || [],
                rows = dataSource.rows || [],
                tableHtml = ['<table class="' + this.tableClass + '">'],
                theadHtml = ['<thead class="' + this.theadClass + '">'],
                tbodyHtml = ['<tbody class="' + this.tbodyClass + '">'];

            // build thead
            theadHtml[theadHtml.length] = buildHeaderRows(columns, headerFormatter);
            theadHtml[theadHtml.length] = '</thead>';

            // build tbody
            tbodyHtml[tbodyHtml.length] = buildContentRows(rows, contentFormatter)
            tbodyHtml[tbodyHtml.length] = '</tbody>';

            // build table
            tableHtml[tableHtml.length] = theadHtml.join('');
            tableHtml[tableHtml.length] = tbodyHtml.join('');
            tableHtml[tableHtml.length] = '</table>';

            this.container.html(tableHtml.join(''));
            this.table = this.container.children('table');
        },
        find: function (selector) {
            return this.table.find(selector);
        }
    });

    function CornerTable(option) {
        option.connainerTemplate = freezeCornerContainerTemplate;
        option.type = 'corner';
        TableBase.call(this, option);
    }
    extend(CornerTable.prototype, {
        constructor: CornerTable,
        rander: function (dataColumns, headerFormatter, headerHeight) {
            var tableHtml = ['<table class="' + this.tableClass + '"><thead class="' + this.theadClass + '">'];
            tableHtml[tableHtml.length] = buildHeaderRows(dataColumns, headerFormatter, headerHeight);
            tableHtml[tableHtml.length] = '</thead></table>';

            this.container.html(tableHtml.join(''));
            this.table = this.container.children('table');
        },
        find: function (selector) {
            return this.table.find(selector);
        }
    });

    function HeaderTable(option) {
        option.connainerTemplate = freezeHeaderContainerTemplate;
        option.type = 'header';
        TableBase.call(this, option);
    }
    extend(HeaderTable.prototype, {
        constructor: HeaderTable,
        rander: function (dataColumns, headerFormatter, headerHeight, columnsWidthList) {
            var tableHtml = ['<table class="' + this.tableClass + '"><thead class="' + this.theadClass + '">'];
            tableHtml[tableHtml.length] = buildHeaderRows(dataColumns, headerFormatter, headerHeight, columnsWidthList);
            tableHtml[tableHtml.length] = '</thead></table>';

            this.container.html(tableHtml.join(''));
            this.table = this.container.children('table');
        },
        find: function (selector) {
            return this.table.find(selector);
        }
    });

    function ColumnTable(option) {
        option.connainerTemplate = freezeColumnContainerTemplate;
        option.type = 'column';
        TableBase.call(this, option);
    }
    extend(ColumnTable.prototype, {
        constructor: ColumnTable,
        rander: function (columns, rows, headerHeight, columnsWidthList, headerFormatter, contentFormatter) {

            var tableHtml = ['<table class="' + this.tableClass + '">'],
                theadHtml = ['<thead class="' + this.theadClass + '">'],
                tbodyHtml = ['<tbody class="' + this.tbodyClass + '">'];

            columnsCount = columns.length;

            // build thead
            theadHtml[theadHtml.length] = buildHeaderRows(columns, headerFormatter, headerHeight, columnsWidthList);
            theadHtml[theadHtml.length] = '</thead>';

            // build tbody
            tbodyHtml[tbodyHtml.length] = buildContentRows(rows, contentFormatter, columnsCount)
            tbodyHtml[tbodyHtml.length] = '</tbody>';

            // build table
            tableHtml[tableHtml.length] = theadHtml.join('');
            tableHtml[tableHtml.length] = tbodyHtml.join('');
            tableHtml[tableHtml.length] = '</table>';

            this.container.html(tableHtml.join(''));
            this.table = this.container.children('table');
        },
        find: function (selector) {
            return this.table.find(selector);
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
                    console.log('freezeWidth : ' + resizebar.freezeWidth);

                    // complate
                    if ($.isFunction(resizebar.complate)) {
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

    function randerFreezeCorner(dataSource, freezeColumnCount, formatter, styles) {
        return randerHeader(dataSource, freezeColumnCount, formatter, styles);
    }

    function randerFreezeHeader(dataSource, formatter, styles) {
        return randerHeader(dataSource, dataSource.columns.length, formatter, styles);
    }

    function randerHeader(dataSource, columnCount, formatter, styles/*{tableClass:'', theadClass:'', tbodyClass:''}*/) {
        styles = extend({ tableClass: '', theadClass: '', tbodyClass: '' }, styles);
        var columns = dataSource.columns,
            i = 0,
            len = Math.min(columnCount, columns.length),
            tableHtml = ['<table class="' + styles.tableClass + '"><thead class="' + styles.theadClass + '"><tr>'];

        if (!$.isFunction(formatter)) {
            formatter = function (d) {
                return d.displayValue;
            };
        }

        for (; i < len; i++) {
            tableHtml[tableHtml.length] = '<th data-sequence="' + i + '">' + formatter(columns[i]) + '</th>';
        }

        tableHtml[tableHtml.length] = '</tr></thead></table>';
        return tableHtml.join('');
    }

    function randerFreezeColumnTable(dataSource, columnCount, headerCellFormatter, contentCellFormatter, styles) {
        return randerTableByColumnCount(dataSource, columnCount, headerCellFormatter, contentCellFormatter, styles);
    }

    function randerFullTable(dataSource, headerCellFormatter, contentCellFormatter, styles) {
        return randerTableByColumnCount(dataSource, dataSource.columns.length, headerCellFormatter, contentCellFormatter, styles);
    }

    function randerTableByColumnCount(dataSource, columnCount, headerCellFormatter, contentCellFormatter, styles/*{tableClasses:'', theadClasses:'', tbodyClasses:''}*/) {
        styles = extend({ tableClass: '', theadClass: '', tbodyClass: '' }, styles);
        var columns = dataSource.columns || [],
            rows = dataSource.rows || [],
            i = 0,
            j = 0,
            rowCount = rows.length,
            tableHtml = ['<table class="' + styles.tableClass + '">'],
            theadHtml = ['<thead class="' + styles.theadClass + '"><tr>'],
            tbodyHtml = ['<tbody class="' + styles.tbodyClass + '">'];

        columnCount = Math.min(columnCount, columns.length);

        if (!$.isFunction(headerCellFormatter)) {
            headerCellFormatter = function (d) {
                return d.displayValue;
            };
        }

        if (!$.isFunction(contentCellFormatter)) {
            contentCellFormatter = function (d) {
                var val = '&nbsp;';
                if (d.displayValue != '') {
                    val = d.displayValue;
                }

                if (d.hyperlink && d.hyperlink != '') {
                    val = '<a href="' + d.hyperlink + '">' + val + '</a>';
                }

                return val;
            };
        }

        // build thead
        for (i = 0; i < columnCount; i++) {
            theadHtml[theadHtml.length] = '<th data-sequence="' + i + '">' + headerCellFormatter(columns[i]) + '</th>';
        }

        theadHtml[theadHtml.length] = '</tr></thead>';

        // build tbody
        for (i = 0; i < rowCount; i++) {
            var trows = ['<tr>'];
            var row = rows[i];
            for (j = 0; j < columnCount; j++) {
                trows[trows.length] = '<td>' + contentCellFormatter(row[j]) + '</td>';
            }
            trows[trows.length] = '</tr>';
            tbodyHtml[tbodyHtml.length] = trows.join('');
        }

        tbodyHtml[tbodyHtml.length] = '</tbody>';

        // build table
        tableHtml[tableHtml.length] = theadHtml.join('');
        tableHtml[tableHtml.length] = tbodyHtml.join('');
        tableHtml[tableHtml.length] = '</table>';

        return tableHtml.join('');
    }

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