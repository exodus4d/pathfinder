describe( 'End class name', function() {
	var table;

	dt.libs( {
		js:  [ 'jquery', 'datatables', 'rowgroup' ],
		css: [ 'datatables', 'rowgroup' ]
	} );

	dt.html( 'basic' );

	it( 'Default is `group-end`', function () {
		expect( $.fn.dataTable.RowGroup.defaults.endClassName ).toBe( 'group-end' );
	} );

	it( 'Is used', function () {
		table = $('#example').DataTable( {
			order: [[2, 'asc']],
			rowGroup: {
				dataSrc: 2,
				endRender: function () {
					return 'Test';
				}
			}	
		} );

		expect( $('#example tbody tr:eq(10)').hasClass('group-end') ).toBe( true );
	} );

	dt.html( 'basic' );

	it( 'Can be changed', function () {
		table = $('#example').DataTable( {
			order: [[2, 'asc']],
			rowGroup: {
				dataSrc: 2,
				endRender: function () {
					return 'Test';
				},
				endClassName: 'test'
			}	
		} );

		expect( $('#example tbody tr:eq(10)').hasClass('group-end') ).toBe( false );
		expect( $('#example tbody tr:eq(10)').hasClass('test') ).toBe( true );
	} );
} );