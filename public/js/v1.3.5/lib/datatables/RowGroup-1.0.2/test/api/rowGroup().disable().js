describe( 'rowGroup().disable()', function() {
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

	it( 'Does not redraw automatically', function () {
		table.rowGroup().disable();

		expect( $('#example tbody tr:eq(0) td:eq(0)').html() ).toBe( 'Edinburgh' );
		expect( $('#example tbody tr:eq(1) td:eq(0)').html() ).toBe( 'Tiger Nixon' );
	} );

	it( 'Disabled after a redraw', function () {
		table.draw();

		expect( $('#example tbody tr:eq(0) td:eq(0)').html() ).toBe( 'Tiger Nixon' );
	} );
} );