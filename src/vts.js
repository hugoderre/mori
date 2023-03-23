const WebSocket = require( 'ws' )

class VtsPlugin {
	constructor() {
		this.socket = null
		this.authToken = null
	}

	async init() {
		return new Promise( ( resolve, reject ) => {
			this.socket = new WebSocket( 'ws://0.0.0.0:8001' );

			this.socket.on( 'open', () => {
				console.log( 'Connexion WebSocket vers VTStudio établie' );
				this.pluginAuthenticationTokenRequest();
			} );

			this.socket.on( 'message', ( data ) => {
				const message = JSON.parse( data );
				switch ( message.messageType ) {
					case 'AuthenticationTokenResponse':
						this.authToken = message.data.authenticationToken;
						this.pluginAuthenticationRequest();
						break;
					case 'AuthenticationResponse':
						if ( message.data.authenticated ) {
							console.log( 'Authentification au plugin VTS réussie' );
							resolve();
						} else {
							reject( new Error( message.data.reason ) );
						}
						break;
					case 'APIError':
						reject( new Error( message.data.message ) );
						break;
					default:
						console.log( '[Non identifié] Recu : ' + data );
						break;
				}
			} );

			this.socket.on( 'error', ( e ) => {
				reject( new Error( 'Erreur de connexion : ' + e ) );
			} );

			this.socket.on( 'close', () => {
				console.log( 'Connexion fermée.' );
			} );
		} );
	}

	async pluginAuthenticationTokenRequest() {
		const fs = require( 'fs' )
		const { fromByteArray } = require( 'base64-js' )
		const iconFilePath = './assets/vts/avatar-128.png'
		const iconFileData = fs.readFileSync( iconFilePath )
		const iconFileBase64 = fromByteArray( new Uint8Array( iconFileData ) ).toString( 'base64' )

		const request = {
			apiName: "VTubeStudioPublicAPI",
			apiVersion: "1.0",
			requestID: "PluginAuthenticationTokenRequest-" + Date.now(),
			messageType: "AuthenticationTokenRequest",
			data: {
				"pluginName": "Mori",
				"pluginDeveloper": "Mori",
				"pluginIcon": iconFileBase64
			}
		}

		this.socket.send( JSON.stringify( request ) )
	}

	async pluginAuthenticationRequest() {
		const request = {
			apiName: "VTubeStudioPublicAPI",
			apiVersion: "1.0",
			requestID: "SomeID",
			messageType: "AuthenticationRequest",
			data: {
				"pluginName": "Mori",
				"pluginDeveloper": "Mori",
				"authenticationToken": this.authToken
			}
		}

		this.socket.send( JSON.stringify( request ) )
	}
}

module.exports = VtsPlugin