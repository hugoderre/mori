const WebSocket = require( 'ws' )
const dotenv = require( 'dotenv' )
dotenv.config()

class VtsPlugin {
	constructor() {
		this.socket = null
		this.authToken = process.env.VTS_PLUGIN_AUTH_TOKEN ?? null
		this.hotkeyList = null
	}

	async init() {
		return new Promise( ( resolve, reject ) => {
			this.socket = new WebSocket( 'ws://0.0.0.0:8001' )

			this.socket.on( 'open', () => {
				console.log( 'Connexion WebSocket vers VTStudio établie' )
				this.pluginAuthenticationRequest()
			} )

			this.socket.on( 'message', ( data ) => {
				const message = JSON.parse( data )
				switch ( message.messageType ) {
					case 'AuthenticationTokenResponse':
						this.authToken = message.data.authenticationToken
						console.log( 'Nouveau Auth Token : ' + this.authToken )
						this.pluginAuthenticationRequest()
						break
					case 'AuthenticationResponse':
						if ( message.data.authenticated ) {
							console.log( 'Authentification au plugin VTS réussie' )
							this.requestHotkeysList()
						} else {
							this.pluginAuthenticationTokenRequest()
						}
						break
					case 'HotkeysInCurrentModelResponse':
						this.hotkeyList = message.data.availableHotkeys
						resolve()
						break
					case 'HotkeyTriggerResponse':
						break
					case 'APIError':
						reject( new Error( message.data.message ) )
						break
					default:
						console.log( '[Non identifié] Recu : ' + data )
						break
				}
			} )

			this.socket.on( 'error', ( e ) => {
				reject( new Error( 'Erreur de connexion : ' + e ) )
			} )

			this.socket.on( 'close', () => {
				console.warn( 'Connexion fermée.' )
			} )
		} )
	}

	pluginAuthenticationTokenRequest() {
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

	pluginAuthenticationRequest() {
		const request = {
			apiName: "VTubeStudioPublicAPI",
			apiVersion: "1.0",
			requestID: "PluginAuthenticationRequest-" + Date.now(),
			messageType: "AuthenticationRequest",
			data: {
				"pluginName": "Mori",
				"pluginDeveloper": "Mori",
				"authenticationToken": this.authToken
			}
		}

		this.socket.send( JSON.stringify( request ) )
	}

	requestHotkeysList() {
		const request = {
			apiName: "VTubeStudioPublicAPI",
			apiVersion: "1.0",
			requestID: "GetHotkeysList-" + Date.now(),
			messageType: "HotkeysInCurrentModelRequest",
		}

		this.socket.send( JSON.stringify( request ) )
	}

	triggerHotkey( name ) {
		const hotkey = this.hotkeyList.filter( h => h.name === name )

		if ( !hotkey.length ) {
			console.log( 'No hotkey found' )
			return
		}

		const request = {
			apiName: "VTubeStudioPublicAPI",
			apiVersion: "1.0",
			requestID: "ExecuteHotKey-" + Date.now(),
			messageType: "HotkeyTriggerRequest",
			data: {
				"hotkeyID": hotkey[ 0 ].hotkeyID,
			}
		}

		this.socket.send( JSON.stringify( request ) )
	}

	triggerHotkeyByKeywordInString( str ) {
		const keywords = [
			'uwu',
			'winks',
			'giggles',
			'laughs',
			'smiles',
			':)',
			'chuckles',
			'blushes',
		]
		for ( const keyword of keywords ) {
			if ( str.toLowerCase().includes( keyword ) ) {
				this.triggerHotkey( keyword )
			}
		}
	}
}

module.exports = VtsPlugin