const express = require( 'express' )
const expressApp = express()
const bodyParser = require( 'body-parser' )
const App = require( './src/App.js' )

expressApp.use( '/assets/fonts', ( req, res, next ) => {
	res.setHeader( 'Access-Control-Allow-Origin', '*' );
	res.setHeader( 'Access-Control-Allow-Methods', 'GET' );
	res.setHeader( 'Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept' );
	next();
} );
expressApp.use( '/assets', express.static( './assets' ) );

expressApp.use( bodyParser.json() );
expressApp.listen( 3000, () => console.log( 'Listen 3000' ) )

const app = new App( expressApp )

if ( process.argv.includes( '-d' ) ) {
	app.discordBotStandalone()
} else {
	app.init()
}