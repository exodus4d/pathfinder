describe( 'dataSrc', function() {
	var table;

	dt.libs( {
		js:  [ 'jquery', 'datatables', 'rowgroup' ],
		css: [ 'datatables', 'rowgroup' ]
	} );

	dt.html( 'basic' );

	it( 'Default is 0', function () {
		expect( $.fn.dataTable.RowGroup.defaults.dataSrc ).toBe( 0 );
	} );

	it( 'Is indeed 0 when run', function () {
		table = $('#example').DataTable( {
			rowGroup: true
		} );

		expect( $('#example tbody tr:eq(0)').text() ).toBe( 'Airi Satou' );
	} );

	dt.html( 'basic' );

	it( 'Can be used with object data', function () {
		table = $('#example').DataTable( {
			order: [[2, 'asc']],
			columns: [
				{ data: 'name' },
				{ data: 'position' },
				{ data: 'office' },
				{ data: 'age' },
				{ data: 'startDate' },
				{ data: 'salary' }
			],
			rowGroup: {
				dataSrc: 'office'
			}	
		} );

		expect( $('#example tbody tr:eq(0)').text() ).toBe( 'Edinburgh' );
	} );
} );