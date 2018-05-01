describe( 'Enable', function() {
	var table;

	dt.libs( {
		js:  [ 'jquery', 'datatables', 'rowgroup' ],
		css: [ 'datatables', 'rowgroup' ]
	} );

	dt.html( 'basic' );

	it( 'Default is enable', function () {
		expect( $.fn.dataTable.RowGroup.defaults.enable ).toBe( true );
	} );

	it( 'Is indeed enabled', function () {
		table = $('#example').DataTable( {
			order: [[2, 'asc']],
			rowGroup: {
				dataSrc: 2
			}	
		} );

		expect( $('#example tbody tr:eq(0)').hasClass('group') ).toBe( true );
	} );

	dt.html( 'basic' );

	it( 'Can be disabled', function () {
		table = $('#example').DataTable( {
			order: [[2, 'asc']],
			rowGroup: {
				dataSrc: 2,
				enable: false
			}	
		} );

		expect( $('#example tbody tr:eq(0)').hasClass('group') ).toBe( false );
		expect( $('#example tbody tr').length ).toBe( 10 );
	} );
} );