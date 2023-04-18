function getDateISO() {
	let yourDate = new Date()
	yourDate.toISOString().split( '.' )[ 0 ]
	const offset = yourDate.getTimezoneOffset()
	yourDate = new Date( yourDate.getTime() - ( offset * 60 * 1000 ) )

	return yourDate.toISOString().split( 'T' )[ 0 ]
}

function escapeSpecialChars( str ) {
	const regex = new RegExp( /[A-Za-z0-9+-éèàùâûêîïëöä%ç&*@ôŒœ)(\/\\=:?!'" ]/, 'gm' )
	const strMatches = str.match( regex )

	return strMatches ? strMatches.join( '' ) : ''
}

function downloadImageFromUrl( url, image_path ) {
	const fs = require( 'fs' );
	const axios = require( 'axios' );

	return axios( {
		url,
		responseType: 'stream',
	} ).then(
		response =>
			new Promise( ( resolve, reject ) => {
				response.data
					.pipe( fs.createWriteStream( image_path ) )
					.on( 'finish', () => resolve() )
					.on( 'error', e => reject( e ) );
			} ),
	);
}

module.exports = { getDateISO, escapeSpecialChars, downloadImageFromUrl }