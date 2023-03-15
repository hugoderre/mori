# Mori - Une Streameuse Twitch avec Intelligence Artificielle

Mori est une streameuse Twitch animée par une intelligence artificielle, créée en utilisant l'API d'OpenAI. Elle utilise un modèle 3D (modèle par *omiso0001212*) sur VTube Studio pour représenter son avatar et la synthèse vocale (TTS) via Voicemaker pour communiquer avec les spectateurs.

## Comment ça fonctionne ?

Mori utilise un script en Node.js pour interagir avec l'API d'OpenAI et générer des réponses en temps réel aux messages du chat Twitch. Les messages du chat sont analysés par l'API ChatGPT et la réponse générée est convertie en voix via Voicemaker. Mori utilise ensuite le modèle 3D sur VTube Studio pour synchroniser les mouvements de sa bouche avec les paroles générées.

## Configuration requise

Pour utiliser Mori, vous aurez besoin des éléments suivants :

- Un compte Twitch actif
- Les clés d'API nécessaires pour accéder à l'API d'OpenAI et à Voicemaker
- Un modèle 3D créé avec VTube Studio

## Comment utiliser Mori

1. Clonez le dépôt sur votre ordinateur.
2. Installez les dépendances en exécutant `npm install`.
3. Créez un fichier `.env` pour stocker les clés d'API nécessaires :

    ```
    OPENAI_API_KEY=<Votre clé OpenAI>
    OPENAI_CHAT_MODEL=<Le model de completion>
    STREAMLABS_SOCKET_TOKEN=<Votre clé OpenAI>
    ```
    
4. Faire un `export VOICEMAKER_IN_TOKEN=<Votre token VoiceMaker>` sur votre système pour pouvoir utiliser VoiceMaker lorsque le script sera lancé.
5. Lancez Mori en exécutant `npm start`.

## Propriété intellectuelle

Le code source de Mori est la propriété exclusive de Hugo Derré. Tous les droits sont réservés. Vous êtes autorisé à utiliser le code source uniquement à des fins de contribution, de recherche ou d'expérimentation personnelles.

Il est strictement interdit de distribuer, de copier ou de modifier le code source hors du cadre défini dans la ligne précédente. Seul Hugo Derré est autorisé à lancer des streams en utilisant le code source de Mori.

Toute utilisation non autorisée du code source de Mori peut entraîner des mesures juridiques. Si vous avez des questions ou souhaitez obtenir une autorisation pour utiliser le code source à des fins commerciales, veuillez contacter Hugo Derré à l'adresse suivante : contact@hugoderre.com.
