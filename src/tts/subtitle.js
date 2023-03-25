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
		const dir = './tmp'

		if ( !fs.existsSync( dir ) ) {
			fs.mkdirSync( dir )
		}

		const filePath = dir + '/tts-subtitle.html'
		const html = this.generateSubtitleHTML()

		fs.writeFileSync( filePath, html, 'utf8' )

		return new Promise( ( resolve ) => {
			this.expressApp.get( '/', ( req, res ) => {
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

	generateSubtitleHTML() {
		return `
		<html>
		<head>
			<meta charset="UTF-8">
			<link rel="preconnect" href="https://fonts.googleapis.com">
			<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
			<link href="https://fonts.googleapis.com/css2?family=Kalam:wght@300;400;700&display=swap" rel="stylesheet"> 
			<style>
				body {
					margin: 0;
					padding: 0;
					background-color: transparent;
					font-family: 'Kalam', cursive;
					font-weight: 700;
				}

				#main-container {
					width: 98%;
					height: 500px;
					display: flex;
					justify-content: center;
					align-items: center;
				}

				#text-container {
					width: fit-content;
					text-align: center;
					display: inline-block;
					-webkit-text-stroke: 1px black;
					text-stroke: 1px black;
					color: white;
					text-shadow: 1px 1px black;
					line-height: 1.2;
				}
			</style>
		</head>
		<body>
			<div id="main-container" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
				<div id="text-container"></div>
			</div>
			<script>
				const socket = new WebSocket( 'ws://localhost:${this.port}/ws' );
		
				const mainContainer = document.querySelector( '#main-container' );
				const textContainer = document.querySelector( '#text-container' );
		
				socket.addEventListener( 'message', ( event ) => {
					textContainer.innerHTML = '';
					const message = event.data;
					const words = message.split( ' ' );
		
					let currentIndex = 0;
					let fontSize = 52;
					textContainer.style.fontSize = fontSize + 'px';
					const interval = setInterval( () => {
						if ( currentIndex >= words.length ) {
							clearInterval( interval );
							socket.send( 'completed' );
							return;
						}
		
						const word = words[ currentIndex ];
						const textNode = document.createTextNode( word + ' ' );
						textContainer.appendChild( textNode );
		
						currentIndex++;

						console.log( 'mainContainerWidth', mainContainer.clientWidth)
						console.log( 'textContainerWidth', textContainer.clientWidth)

						if ( textContainer.clientWidth === mainContainer.clientWidth && fontSize > 22 ) {
							console.log('decrease font size')
							fontSize -= 0.1;
							textContainer.style.fontSize = fontSize + 'px';
						}
					}, 200 );
				} );
			</script>
		</body>
		</html>
    `
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
