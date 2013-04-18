// ref -- jQuery.freezeTable

var freezeTable = $('#tableLayout').freezeTable({
    layout: { width: 935, height: 600 },
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

            freezeTable.redraw(source);
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
        }
    },
    dataSource: {
        columns: [{ displayValue: "Name", sortby: 'asc' }, { displayValue: "Market Segment" }, { displayValue: "LT Rating" }, { displayValue: "Indicator" }, { displayValue: "Rating Type" }, { displayValue: "Rating Date" }, { displayValue: "Last Rating Action" }, { displayValue: "Outlook" }, { displayValue: "LT Watch" }, { displayValue: "Location" }, { displayValue: "BFSR" }, { displayValue: "BFSR Date" }, { displayValue: "STMR" }, { displayValue: "STMR Date" }, { displayValue: "STMR Type" }],
        rows: [[{ displayValue: "Antioch Public Financing Authority, CA", hyperlink : "google.com" }, { displayValue: "U.S. Public Finance" }, { displayValue: "" }, { displayValue: "FALSE" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "NOO" }, { displayValue: "Not on Watch" }, { displayValue: "CA" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Ashton Place and Woodstock Apartments, TX", hyperlink: "google.com" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "FALSE" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "RWR" }, { displayValue: "Not on Watch" }, { displayValue: "TX" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Bank of America, National Association (Muni. Deriv.) MACON Trust, Series 2005N", hyperlink: "google.com" }, { displayValue: "" }, { displayValue: "VMIG 3" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "11 Aug 11" }, { displayValue: "DNG" }, { displayValue: "" }, { displayValue: "Not on Watch" }, { displayValue: "UNITED STATES" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Bear, Stearns & Co., Inc. (Muni. Deriv.) Class A Certificates, Series 5017 BBT", hyperlink: "google.com" }, { displayValue: "" }, { displayValue: "WR" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "04 Jan 08" }, { displayValue: "WDR" }, { displayValue: "" }, { displayValue: "Not on Watch" }, { displayValue: "UNITED STATES" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Beckville Independent School District, TX", hyperlink: "google.com" }, { displayValue: "U.S. Public Finance" }, { displayValue: "" }, { displayValue: "FALSE" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "NOO" }, { displayValue: "Not on Watch" }, { displayValue: "TX" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Calcasieu Parish Waterworks District 1, LA", hyperlink: "google.com" }, { displayValue: "U.S. Public Finance" }, { displayValue: "" }, { displayValue: "FALSE" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "Not on Watch" }, { displayValue: "LA" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Campbell City School District, OH", hyperlink: "google.com" }, { displayValue: "U.S. Public Finance" }, { displayValue: "" }, { displayValue: "FALSE" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "Not on Watch" }, { displayValue: "OH" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Canisius College, NY", hyperlink: "google.com" }, { displayValue: "U.S. Public Finance" }, { displayValue: "" }, { displayValue: "FALSE" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "STA" }, { displayValue: "Not on Watch" }, { displayValue: "NY" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Des Plaines (City of) IL", hyperlink: "google.com" }, { displayValue: "U.S. Public Finance" }, { displayValue: "" }, { displayValue: "FALSE" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "NOO" }, { displayValue: "Not on Watch" }, { displayValue: "IL" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Dexia Credit Local Certificates Trust (Muni. Deriv.) Floater Certificates, Series 2008-045", hyperlink: "google.com" }, { displayValue: "" }, { displayValue: "VMIG 2" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "15 Dec 11" }, { displayValue: "DNG" }, { displayValue: "" }, { displayValue: "Not on Watch" }, { displayValue: "UNITED STATES" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Dyersville (City of) IA", hyperlink: "google.com" }, { displayValue: "U.S. Public Finance" }, { displayValue: "" }, { displayValue: "FALSE" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "Not on Watch" }, { displayValue: "IA" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Elkton School District 5-3, SD", hyperlink: "google.com" }, { displayValue: "U.S. Public Finance" }, { displayValue: "" }, { displayValue: "FALSE" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "NOO" }, { displayValue: "Possible Downgrade, 20 Mar 2012" }, { displayValue: "SD" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Fayetteville Public Facility Board, AR", hyperlink: "google.com" }, { displayValue: "U.S. Public Finance" }, { displayValue: "" }, { displayValue: "FALSE" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "Not on Watch" }, { displayValue: "AR" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Franklin (County of) VA", hyperlink: "google.com" }, { displayValue: "" }, { displayValue: "Aa3" }, { displayValue: "FALSE" }, { displayValue: "LT SR REV" }, { displayValue: "07 May 10" }, { displayValue: "CIS" }, { displayValue: "NOO" }, { displayValue: "Not on Watch" }, { displayValue: "VA" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Fresno County Transportation Authority, CA", hyperlink: "google.com" }, { displayValue: "U.S. Public Finance" }, { displayValue: "" }, { displayValue: "FALSE" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "Not on Watch" }, { displayValue: "CA" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Gainesville New Public Housing Authority, FL", hyperlink: "google.com" }, { displayValue: "U.S. Public Finance" }, { displayValue: "" }, { displayValue: "FALSE" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "RWR" }, { displayValue: "Not on Watch" }, { displayValue: "FL" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Greenville County Tourism Pub. Fac. Corp., SC", hyperlink: "google.com" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "FALSE" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "Not on Watch" }, { displayValue: "SC" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Hobbs (City of) NM", hyperlink: "google.com" }, { displayValue: "U.S. Public Finance" }, { displayValue: "" }, { displayValue: "FALSE" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "Not on Watch" }, { displayValue: "NM" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "J.P. Morgan Securities, Inc. (Muni. Deriv.) Puttable Tax-Exempt Receipts (PUTTERs) and Derivative Inverse Tax-Exempt Receipts", hyperlink: "google.com" }, { displayValue: "" }, { displayValue: "WR" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "08 Dec 08" }, { displayValue: "WDR" }, { displayValue: "" }, { displayValue: "Not on Watch" }, { displayValue: "UNITED STATES" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Jasper Co. School District R-VIII (Joplin), M", hyperlink: "google.com" }, { displayValue: "U.S. Public Finance" }, { displayValue: "" }, { displayValue: "FALSE" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "NOO" }, { displayValue: "Possible Downgrade, 20 Mar 2012" }, { displayValue: "MO" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Jennings County Middle S.B.C., IN", hyperlink: "google.com" }, { displayValue: "U.S. Public Finance" }, { displayValue: "" }, { displayValue: "FALSE" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "Not on Watch" }, { displayValue: "IN" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Kittson (County of) MN", hyperlink: "google.com" }, { displayValue: "U.S. Public Finance" }, { displayValue: "" }, { displayValue: "FALSE" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "Not on Watch" }, { displayValue: "MN" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Calcasieu Parish Waterworks District 1, LA", hyperlink: "google.com" }, { displayValue: "U.S. Public Finance" }, { displayValue: "" }, { displayValue: "FALSE" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "Not on Watch" }, { displayValue: "LA" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Campbell City School District, OH", hyperlink: "google.com" }, { displayValue: "U.S. Public Finance" }, { displayValue: "" }, { displayValue: "FALSE" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "Not on Watch" }, { displayValue: "OH" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Canisius College, NY", hyperlink: "google.com" }, { displayValue: "U.S. Public Finance" }, { displayValue: "" }, { displayValue: "FALSE" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "STA" }, { displayValue: "Not on Watch" }, { displayValue: "NY" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Des Plaines (City of) IL", hyperlink: "google.com" }, { displayValue: "U.S. Public Finance" }, { displayValue: "" }, { displayValue: "FALSE" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "NOO" }, { displayValue: "Not on Watch" }, { displayValue: "IL" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Dexia Credit Local Certificates Trust (Muni. Deriv.) Floater Certificates, Series 2008-045", hyperlink: "google.com" }, { displayValue: "" }, { displayValue: "VMIG 2" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "15 Dec 11" }, { displayValue: "DNG" }, { displayValue: "" }, { displayValue: "Not on Watch" }, { displayValue: "UNITED STATES" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Dyersville (City of) IA", hyperlink: "google.com" }, { displayValue: "U.S. Public Finance" }, { displayValue: "" }, { displayValue: "FALSE" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "Not on Watch" }, { displayValue: "IA" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Elkton School District 5-3, SD", hyperlink: "google.com" }, { displayValue: "U.S. Public Finance" }, { displayValue: "" }, { displayValue: "FALSE" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "NOO" }, { displayValue: "Possible Downgrade, 20 Mar 2012" }, { displayValue: "SD" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Fayetteville Public Facility Board, AR", hyperlink: "google.com" }, { displayValue: "U.S. Public Finance" }, { displayValue: "" }, { displayValue: "FALSE" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "Not on Watch" }, { displayValue: "AR" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Franklin (County of) VA", hyperlink: "google.com" }, { displayValue: "" }, { displayValue: "Aa3" }, { displayValue: "FALSE" }, { displayValue: "LT SR REV" }, { displayValue: "07 May 10" }, { displayValue: "CIS" }, { displayValue: "NOO" }, { displayValue: "Not on Watch" }, { displayValue: "VA" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Fresno County Transportation Authority, CA", hyperlink: "google.com" }, { displayValue: "U.S. Public Finance" }, { displayValue: "" }, { displayValue: "FALSE" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "Not on Watch" }, { displayValue: "CA" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Gainesville New Public Housing Authority, FL", hyperlink: "google.com" }, { displayValue: "U.S. Public Finance" }, { displayValue: "" }, { displayValue: "FALSE" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "RWR" }, { displayValue: "Not on Watch" }, { displayValue: "FL" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Greenville County Tourism Pub. Fac. Corp., SC", hyperlink: "google.com" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "FALSE" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "Not on Watch" }, { displayValue: "SC" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Hobbs (City of) NM", hyperlink: "google.com" }, { displayValue: "U.S. Public Finance" }, { displayValue: "" }, { displayValue: "FALSE" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "Not on Watch" }, { displayValue: "NM" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "J.P. Morgan Securities, Inc. (Muni. Deriv.) Puttable Tax-Exempt Receipts (PUTTERs) and Derivative Inverse Tax-Exempt Receipts", hyperlink: "google.com" }, { displayValue: "" }, { displayValue: "WR" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "08 Dec 08" }, { displayValue: "WDR" }, { displayValue: "" }, { displayValue: "Not on Watch" }, { displayValue: "UNITED STATES" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Jasper Co. School District R-VIII (Joplin), M", hyperlink: "google.com" }, { displayValue: "U.S. Public Finance" }, { displayValue: "" }, { displayValue: "FALSE" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "NOO" }, { displayValue: "Possible Downgrade, 20 Mar 2012" }, { displayValue: "MO" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Jennings County Middle S.B.C., IN", hyperlink: "google.com" }, { displayValue: "U.S. Public Finance" }, { displayValue: "" }, { displayValue: "FALSE" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "Not on Watch" }, { displayValue: "IN" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Kittson (County of) MN", hyperlink: "google.com" }, { displayValue: "U.S. Public Finance" }, { displayValue: "" }, { displayValue: "FALSE" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "Not on Watch" }, { displayValue: "MN" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Lehman Brothers, Inc. (Muni. Deriv.) FR/RI Trust Receipts, Series 2007-P135", hyperlink: "google.com" }, { displayValue: "" }, { displayValue: "WR" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "01 Oct 08" }, { displayValue: "WDR" }, { displayValue: "" }, { displayValue: "Not on Watch" }, { displayValue: "UNITED STATES" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
            [{ displayValue: "Long Hill (Township of) NJ", hyperlink: "google.com" }, { displayValue: "U.S. Public Finance" }, { displayValue: "" }, { displayValue: "FALSE" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "NOO" }, { displayValue: "Not on Watch" }, { displayValue: "NJ" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }, { displayValue: "" }],
        ],
    }
});
$('#tableLayout').addClass('box-border');