import tmi from 'tmi.js'
import { escapeSpecialChars } from './utils.js';

export class TmiApiClient {
    constructor(openAIApiClient) {
        this.openAIApiClient = openAIApiClient
    }

    startClient() {
        const client = new tmi.Client( {
            channels: [ 'mori_ai' ]
        } );

        client.connect();

        client.on( 'message', this.messageCallback.bind( this ) );
        client.on( 'cheer', this.cheerCallback.bind( this ) );
        client.on( 'sub', this.subCallback.bind( this ) );
        client.on( 'resub', this.resubCallback.bind( this ) );
        client.on( 'subgift', this.subgiftCallback.bind( this ) );
        client.on( 'anonsubgift', this.anonsubgiftCallback.bind( this ) );
        client.on( 'raid', this.raidCallback.bind( this ) );
    }

    async messageCallback( channel, tags, message, self ) {
        const username = tags[ 'display-name' ]
        const timestamp = tags[ 'tmi-sent-ts' ]
        const fMessage = escapeSpecialChars( message )

        if ( !this.isValidChatMessage( username, fMessage ) ) {
            return
        }

        await this.openAIApiClient.getChatCompletion( 
            `En respectant les règles de Twitch, réponds de façon courte et à la première personne comme Mori (streameuse Twitch) répondrait ou réagirait au viewer "${username}" qui écrit cela dans le tchat: "${fMessage}"`, 
            username 
        )
    }

    async subCallback( channel, username, methods, msg, tags ) {
        await this.openAIApiClient.getChatCompletion(
            `Mori, le viewer "${ username }" vient de s'abonner à ta chaine Twitch pour la première fois. Remerçie le chaleureusement et de façon conçise.`,
            username
        )
    }

    async cheerCallback( channel, tags, message ) {
        await this.openAIApiClient.getChatCompletion(
            `Mori, le viewer "${ tags.username }" vient d'offrir ${tags.bits} bits à ta chaine Twitch. Remerçie le chaleureusement et de façon conçise.`,
            username
        )
    }

    async resubCallback( channel, username, streakMonths, msg, tags, methods ) {
        await this.openAIApiClient.getChatCompletion(
            `Mori, le viewer "${ username }" vient de se réabonner à ta chaine Twitch. C'est son ${ tags[ 'badge-info' ].subscriber }ème mois d'abonnement. Remerçie le chaleureusement et de façon conçise.`,
            username
        )
    }

    async subgiftCallback( channel, username, streakMonths, recipient, methods, tags ) {
        await this.openAIApiClient.getChatCompletion(
            `Mori, le viewer "${ username }" vient d'offrir un abonnement cadeau à ${ recipient } à ta chaine Twitch. Remerçie ${ username } chaleureusement et de façon conçise.`,
            username
        )
    }

    async anonsubgiftCallback( channel, streakMonths, recipient, methods, tags ) {
        await this.openAIApiClient.getChatCompletion(
            `Mori, un viewer anonyme vient d'offrir un abonnement cadeau à ${ recipient } à ta chaine Twitch. Remerçie ce viewer anonyme chaleureusement et de façon conçise.`,
            username
        )
    }

    async anonsubgiftCallback( channel, streakMonths, recipient, methods, tags ) {
        await this.openAIApiClient.getChatCompletion(
            `Mori, un viewer anonyme vient d'offrir un abonnement cadeau à ${ recipient } à ta chaine Twitch. Remerçie ce viewer anonyme chaleureusement et de façon conçise.`,
            username
        )
    }

    async raidCallback( channel, username, viewers, tags ) {
        console.log(channel, username, viewers, tags)
        await this.openAIApiClient.getChatCompletion(
            `Mori, tu viens de recevoir un raid sur ta chaine Twitch de la part de ${ username }, remerçie le et souhaite la bienvenue aux ${ viewers } viewers !`,
            username
        )
    }

    isValidChatMessage( username, message ) {
        if ( message.length > 100 ) {
            return
        }

        const usernameDenies = [ 'Moobot', 'WizeBot' ]

        if ( usernameDenies.some( u => username.includes( u ) ) ) {
            return
        }

        const firstCharDenies = [ '@', '!', '/' ]
        if ( firstCharDenies.some( c => message[ 0 ].includes( c ) ) ) {
            return
        }

        return true
    }
}










