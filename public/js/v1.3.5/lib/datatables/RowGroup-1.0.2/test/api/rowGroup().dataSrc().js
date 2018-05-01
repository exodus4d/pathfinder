describe( 'rowGroup().dataSrc()', function() {
	var table;

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

	it( 'Get the current data source', function () {
		expect( table.rowGroup().dataSrc() ).toBe( 2 );
	} );

	it( 'Can change the data source', function () {
		table.rowGroup().dataSrc( 3 ).draw();

		expect( $('#example tbody tr:eq(0) td:eq(0)').html() ).toBe( '61' );
		expect( $('#example tbody tr:eq(1) td:eq(0)').html() ).toBe( 'Tiger Nixon' );
		expect( $('#example tbody tr:eq(2) td:eq(0)').html() ).toBe( '22' );
		expect( $('#example tbody tr:eq(3) td:eq(0)').html() ).toBe( 'Cedric Kelly' );
	} );

	it( 'Return as a setter is an API instance', function () {
		expect( table.rowGroup().dataSrc( 3 ) instanceof $.fn.dataTable.Api ).toBe( true );
	} );

	it( 'Read the set value back', function () {
		expect( table.rowGroup().dataSrc() ).toBe( 3 );
	} );

	it( 'Setting does not show any difference until redraw', function () {
		table.rowGroup().dataSrc( 0 );

		expect( $('#example tbody tr:eq(0) td:eq(0)').html() ).toBe( '61' );
	} );

	it( 'Setting does not show any difference until redraw', function () {
		table.draw();

		expect( $('#example tbody tr:eq(0) td:eq(0)').html() ).toBe( 'Tiger Nixon' );
	} );
} );