const WebSocket = require( 'ws' );
const dotenv = require( 'dotenv' );
dotenv.config();

class SLOBS {
	constructor() {
		this.ws = new WebSocket( 'ws://192.168.1.13:59650/api/websocket' );
		this.init();
	}

	async init() {
		await this.auth();
	}

	async auth() {
		return new Promise( ( resolve, reject ) => {
			this.ws.on( 'open', () => {
				const authRequest = {
					jsonrpc: '2.0',
					id: 8,
					method: 'auth',
					params: {
						resource: 'TcpServerService',
						args: [ process.env.SLOBS_TOKEN ]
					}
				};
				this.ws.send( JSON.stringify( authRequest ) );
			} );

			this.ws.on( 'message', ( data ) => {
				resolve();
			} );

			this.ws.on( 'close', () => {
				console.log( 'WebSocket connection closed' );
			} );
		} );
	}

	getListAudioSources() {
		const getListAudioSourcesRequest = {
			"jsonrpc": "2.0",
			"id": 7,
			"method": "getSourcesForCurrentScene",
			"params": {
				"resource": "AudioService"
			}
		};
		this.ws.send( JSON.stringify( getListAudioSourcesRequest ) );
	}

	muteMic( isMuted ) {
		const muteMicRequest = {
			"jsonrpc": "2.0",
			"id": 7,
			"method": "setMuted",
			"params": {
				"resource": "AudioSource[\"wasapi_input_capture_547d3dbe-8b76-4d26-bf68-9c2b63a46e13\"]",
				"args": [ isMuted ]
			}
		};
		this.ws.send( JSON.stringify( muteMicRequest ) );
	}

	getActiveScene() {
		const getActiveSceneRequest = {
			"jsonrpc": "2.0",
			"id": 8,
			"method": "activeScene",
			"params": {
				"resource": "ScenesService"
			}
		};
		this.ws.send( JSON.stringify( getActiveSceneRequest ) );
	}

	setSongRequestNoticeVisibility( isVisible ) {
		const hideSongRequestNoticeRequest = {
			"jsonrpc": "2.0",
			"id": 10,
			"method": "setVisibility",
			"params": {
				"resource": "SceneItem[\"scene_e43629ca-5841-4906-aaad-961c51a0a2dd\", \"61813109-6119-4522-851a-b89f019fe4f4\", \"text_gdiplus_e572282e-c380-4274-8a8e-4a6172bd326c\"]",
				"args": [ isVisible ]
			}
		};
		this.ws.send( JSON.stringify( hideSongRequestNoticeRequest ) );
	}

}

module.exports = SLOBS;