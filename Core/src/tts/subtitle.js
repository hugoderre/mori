const WebSocket = require( 'ws' )
const express = require( 'express' )
const fs = require( 'fs' )

class SubTitle {
	constructor( port = 8080 ) {
		this.port = port
		this.server = null
		this.wss = null
		this.expressApp = express()
		this.clients = new Set()
	}

	async initServer() {
		return new Promise( ( resolve ) => {
			this.expressApp.get( '/', ( req, res ) => {
				const filePath = 'templates/subtitle.html'
				const html = fs.readFileSync( filePath, 'utf8' )
				res.status( 200 ).send( html )
			} )

			const server = this.expressApp.listen( this.port, () => {
				console.log( `Subtitle server listening on port ${this.port}` )
			} )

			this.wss = new WebSocket.Server( { server } )

			this.wss.on( 'connection', ( ws ) => {
				this.clients.add( ws )

				ws.on( 'close', () => {
					this.clients.delete( ws )
				} )

				resolve()
			} )
		} )
	}

	async send( message ) {
		return new Promise( ( resolve ) => {
			this.clients.forEach( ( client ) => {
				if ( client.readyState === WebSocket.OPEN ) {
					client.send( message )
					client.on( 'message', ( message ) => {
						if ( message == 'completed' ) {
							resolve()
						}
					} )
				}
			} )
		} )
	}
}

module.exports = SubTitle
