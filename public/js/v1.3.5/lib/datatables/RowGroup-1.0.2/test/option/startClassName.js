describe( 'Start class name', function() {
	var table;

	dt.libs( {
		js:  [ 'jquery', 'datatables', 'rowgroup' ],
		css: [ 'datatables', 'rowgroup' ]
	} );

	dt.html( 'basic' );

	it( 'Default is `group-start`', function () {
		expect( $.fn.dataTable.RowGroup.defaults.startClassName ).toBe( 'group-start' );
	} );

	it( 'Is used', function () {
		table = $('#example').DataTable( {
			order: [[2, 'asc']],
			rowGroup: {
				dataSrc: 2
			}	
		} );

		expect( $('#example tbody tr:eq(0)').hasClass('group-start') ).toBe( true );
	} );

	dt.html( 'basic' );

	it( 'Can be changed', function () {
		table = $('#example').DataTable( {
			order: [[2, 'asc']],
			rowGroup: {
				dataSrc: 2,
				startClassName: 'test'
			}	
		} );

		expect( $('#example tbody tr:eq(0)').hasClass('group-start') ).toBe( false );
		expect( $('#example tbody tr:eq(0)').hasClass('test') ).toBe( true );
	} );
} );