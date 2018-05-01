describe( 'rowgroup-datasrc', function() {
	var table;
	var args;

	dt.libs( {
		js:  [ 'jquery', 'datatables', 'rowgroup' ],
		css: [ 'datatables', 'rowgroup' ]
	} );

	dt.html( 'basic' );

	it( 'A DataTable can be created with RowGrouping', function () {
		table = $('#example').DataTable( {
			order: [[2, 'asc']],
			rowGroup: {
				dataSrc: 2
			}	
		} );

		expect( $('#example tbody tr:eq(0) td:eq(0)').html() ).toBe( 'Edinburgh' );
		expect( $('#example tbody tr:eq(1) td:eq(0)').html() ).toBe( 'Tiger Nixon' );
	} );

	it( 'Change in the data source will trigger rowgroup-datasrc', function ( done ) {
		table.on( 'rowgroup-datasrc', function () {
			args = arguments;
			done();
		} );

		table.rowGroup().dataSrc( 3 ).draw();
	} );

	it( 'Three arguments', function () {
		expect( args.length ).toBe( 3 );
	} );

	it( 'First is jQuery object', function () {
		expect( args[0] instanceof $.Event ).toBe( true );
	} );

	it( 'Second is DataTable API instance', function () {
		expect( args[1] instanceof $.fn.dataTable.Api ).toBe( true );
	} );

	it( 'Third is the new data source value', function () {
		expect( args[2] ).toBe( 3 );
	} );

	it( 'Event is triggered with .dt namespace', function () {
		expect( args[0].namespace ).toBe( 'dt' );
	} );
} );