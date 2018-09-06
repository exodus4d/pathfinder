define([
    'jquery',
    'app/init',
    'datatables.net',
    'datatables.net-buttons',
    'datatables.net-buttons-html',
    'datatables.net-responsive',
    'datatables.net-select'
], ($, Init) => {
    'use strict';

    // all Datatables stuff is available...
    let initDefaultDatatablesConfig = () => {

        $.extend(true, $.fn.dataTable.defaults, {
            pageLength: -1,
            pagingType: 'simple_numbers',
            lengthMenu: [[5, 10, 25, 50, -1], [5, 10, 25, 50, 'All']],
            order: [],              // no default order because columnDefs is empty
            autoWidth: false,
            responsive: {
                breakpoints: Init.breakpoints,
                details: false
            },
            columnDefs: [],
            data: []
        });

        // global open event
        $(document).on('destroy.dt', '.dataTable ', function(e, settings){
            let table = $(this);

            // remove all active counters in table
            table.destroyTimestampCounter(true);
        });
    };

    initDefaultDatatablesConfig();
});