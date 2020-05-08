'use strict';

import Hapi from '@hapi/hapi';
import Deck from './deck';

console.log(Deck.setupCards(Deck.cards));

// const Hapi = require('@hapi/hapi');



const init = async () => {

    const server = Hapi.server({
        port: 3000,
        host: 'localhost'
    });

    server.route({
        method: 'GET',
        path: '/',
        handler: (request, h) => {
	    console.log();
            return 'Hello World!<pre>' + JSON.stringify(Deck.shuffle(Deck.cards), null, 2) +'</pre>' ;
        }
    });

    await server.start();
    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {

    console.log(err);
    process.exit(1);
});

init();
