describe( 'End render', function() {
	var table;

	dt.libs( {
		js:  [ 'jquery', 'datatables', 'rowgroup' ],
		css: [ 'datatables', 'rowgroup' ]
	} );

	dt.html( 'basic' );

	it( 'Default is null', function () {
		expect( $.fn.dataTable.RowGroup.defaults.endRender ).toBe( null );
	} );

	it( 'Can be used to show the grouping data name', function () {
		table = $('#example').DataTable( {
			order: [[2, 'asc']],
			rowGroup: {
				dataSrc: 2,
				endRender: function ( rows, group ) {
					return group;
				}
			}	
		} );

		expect( $('#example tbody tr:eq(10)').text() ).toBe( 'Edinburgh' );
		expect( $('#example tbody tr:eq(13)').text() ).toBe( 'London' );
	} );

	dt.html( 'basic' );

	it( 'Will show a static value', function () {
		table = $('#example').DataTable( {
			order: [[2, 'asc']],
			rowGroup: {
				dataSrc: 2,
				endRender: function ( rows, group ) {
					return 'Test';
				}
			}	
		} );

		expect( $('#example tbody tr:eq(10)').text() ).toBe( 'Test' );
		expect( $('#example tbody tr:eq(13)').text() ).toBe( 'Test' );
	} );

	dt.html( 'basic' );

	var a1 = [];
	var a2 = [];

	it( 'Renderer is called with two arguments', function () {
		var args;

		table = $('#example').DataTable( {
			order: [[2, 'asc']],
			rowGroup: {
				dataSrc: 2,
				endRender: function ( rows, group ) {
					a1.push( rows );
					a2.push( group );
					args = arguments.length;
					return group;
				}
			}	
		} );

		expect( args ).toBe( 2 );
	} );

	it( 'Is called once for each group on the page', function () {
		expect( a1.length ).toBe( 2 );
	} );

	it( 'First argument is an API instance', function () {
		expect( a1[0] instanceof $.fn.dataTable.Api ).toBe( true );
	} );

	it( 'First argument has the rows for the group in it', function () {
		expect( a1[0].count() ).toBe( 9 );
		expect( a1[1].count() ).toBe( 1 );
	} );

	it( 'Second argument has the group name', function () {
		expect( a2[0] ).toBe( 'Edinburgh' );
		expect( a2[1] ).toBe( 'London' );
	} );
} );