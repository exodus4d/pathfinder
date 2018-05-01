describe( 'rowGroup().enable()', function() {
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

	it( 'Disable', function () {
		table.rowGroup().disable().draw();

		expect( $('#example tbody tr:eq(0) td:eq(0)').html() ).toBe( 'Tiger Nixon' );
	} );

	it( 'Can be enabled', function () {
		table.rowGroup().enable().draw();

		expect( $('#example tbody tr:eq(0) td:eq(0)').html() ).toBe( 'Edinburgh' );
		expect( $('#example tbody tr:eq(1) td:eq(0)').html() ).toBe( 'Tiger Nixon' );
	} );

	it( 'Can be used as a toggle to disable', function () {
		table.rowGroup().enable( false ).draw();

		expect( $('#example tbody tr:eq(0) td:eq(0)').html() ).toBe( 'Tiger Nixon' );
	} );

	it( 'Can be used as a toggle to enable', function () {
		table.rowGroup().enable( true ).draw();

		expect( $('#example tbody tr:eq(0) td:eq(0)').html() ).toBe( 'Edinburgh' );
		expect( $('#example tbody tr:eq(1) td:eq(0)').html() ).toBe( 'Tiger Nixon' );
	} );
} );