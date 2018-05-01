describe( 'Class name', function() {
	var table;

	dt.libs( {
		js:  [ 'jquery', 'datatables', 'rowgroup' ],
		css: [ 'datatables', 'rowgroup' ]
	} );

	dt.html( 'basic' );

	it( 'Default is `group`', function () {
		expect( $.fn.dataTable.RowGroup.defaults.className ).toBe( 'group' );
	} );

	it( 'Is used for header rows', function () {
		table = $('#example').DataTable( {
			order: [[2, 'asc']],
			rowGroup: {
				dataSrc: 2
			}	
		} );

		expect( $('#example tbody tr:eq(0)').hasClass('group') ).toBe( true );
	} );

	dt.html( 'basic' );

	it( 'Can be set to a different value', function () {
		table = $('#example').DataTable( {
			order: [[2, 'asc']],
			rowGroup: {
				dataSrc: 2,
				className: 'test'
			}	
		} );

		expect( $('#example tbody tr:eq(0)').hasClass('group') ).toBe( false );
		expect( $('#example tbody tr:eq(0)').hasClass('test') ).toBe( true );
	} );

	dt.html( 'basic' );

	it( 'Is applied to the footer grouping row', function () {
		table = $('#example').DataTable( {
			order: [[2, 'asc']],
			rowGroup: {
				dataSrc: 2,
				endRender: function () {
					return 'Test';
				}
			}
		} );

		expect( $('#example tbody tr:eq(10)').hasClass('group') ).toBe( true );
	} );
} );