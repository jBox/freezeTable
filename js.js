// ref -- jQuery.freezeTable
var freezeTable = $('#tableLayout').freezeTable({
    layout: { width: 935, height: 800 },
    header: {
        freezed: true,
        formatter: function (item) {
            var name = item.displayValue;
            var sortby = item.sortby;
            if (sortby && sortby != '') {
                return '<div class="' + sortby + '">' + name + '</div>';
            } else {
                return '<div>' + name + '</div>';
            }
        },
        click: function (item) {
            var source = freezeTable.dataSource;
            for (var i = 0; i < source.columns.length; i++) {
                if (item == source.columns[i]) {
                    if (item.sortby == 'asc') {
                        item.sortby = 'desc';
                    } else {
                        item.sortby = 'asc';
                    }
                } else {
                    source.columns[i].sortby = '';
                }
            }
            var scrollleft = freezeTable.fullTable.container.scrollLeft();
            freezeTable.redraw(source);
            freezeTable.fullTable.container.scrollLeft(scrollleft);
        }
    },
    columns: {
        formatter: function (item) {
            var val = '&nbsp;';
            if (item.displayValue != '') {
                val = item.displayValue;
            }

            if (item.hyperlink && item.hyperlink != '') {
                val = '<div class="overflow-hidden"><a href="' + item.hyperlink + '">' + val + '</a><div>';
            }

            return val;
        },
        freezed: true
    },
    dataSource: globalData,
    paging: {
        enabled: true,
        style: 'pager', //ps: listing / pager
        size: 100,
        total: undefined,
        pager: {
            handler: null
        }
    }
});
$('#tableLayout').addClass('box-border');
