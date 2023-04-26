const fs = require( 'fs' );
const path = require( 'path' );
const axios = require( 'axios' );

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

function getLatestFileFromDir( dirPath ) {
	if ( !fs.existsSync( dirPath ) ) {
		console.error( `The specified folder "${dirPath}" does not exist` );
		return null;
	}

	const files = fs.readdirSync( dirPath );

	let latestFile = null;
	let latestTime = 0;
	files.forEach( function ( file ) {
		const filePath = path.join( dirPath, file );
		const stat = fs.statSync( filePath );
		if ( stat.isFile() && stat.mtimeMs > latestTime ) {
			latestFile = filePath;
			latestTime = stat.mtimeMs;
		}
	} );

	return latestFile;
}

module.exports = { getDateISO, escapeSpecialChars, downloadImageFromUrl, getLatestFileFromDir }