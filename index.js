"use strict";

import Hapi from "@hapi/hapi";
import Deck from "./deck";
import { v4 as uuidv4 } from "uuid";

import Catbox from "@hapi/catbox";
import CatboxRedis from "@hapi/catbox-redis";

// console.log(Deck.setupCards(Deck.cards));

// const Hapi = require('@hapi/hapi');

let cardsData = {};
let handsData = {};

const server = Hapi.server({
    port: 3000,
    host: "localhost",
    cache: [
        {
            name: "server_cache",
            provider: {
                constructor: CatboxRedis,
                options: {
                    partition: "server_cache_data",
                    host: "localhost",
                    port: 6379,
                    // db: 0,
                    // tls: {},
                },
            },
        },
    ],
});

const cards = () => Deck.shuffle(Deck.setupCards([]));

// server.method(
//     "getDeck",
//     (uuid, callback) => {
//         callback(cards());
//     },
//     {
//         cache: {
//             cache: "card_cache",
//             expiresIn: 60 * 1000,
//             generateTimeout: 2000,
//         },
//     }
// );

const sumCache = server.cache({
    cache: "server_cache",
    expiresIn: 60 * 1000,
    segment: 'cards_segment',
    generateFunc: (uuid) => {
        return cards();
    },
    generateTimeout: 2000,
});

server.route({
    method: "GET",
    path: "/deck",
    handler: async (request, h) => {
        const deckID = uuidv4();
        // cardsData[deckID] = Deck.shuffle(Deck.cards);
        console.log("redirect to deck uuid");
        return h.redirect(`/deck/${deckID}`);
        // return '<pre>' + JSON.stringify(Deck.shuffle(Deck.cards), null, 2) +'</pre>' ;
    },
});

server.route({
    method: "GET",
    path: "/deck/{deckID}",
    handler: async (request, reply) => {
        // !! VALIDATE AD UUIDv4
        const { deckID } = request.params;
        console.log(deckID);
        const theCards = sumCache.get(deckID);
        return (
            "<pre>" +
            deckID +
            // cardsData[deckID].length +
            //             JSON.stringify(cards()), null, 2) +
            JSON.stringify(theCards, null, 2) +
            "</pre>"
        );
    },
});

server.route({
    method: "GET",
    path: "/deck/{deckID}/cards/{number}",
    handler: (request, h) => {
        console.log("add uuid, get some cards from deck");
        console.log("assign uuid to hand");
        const deckID = request.params.deckID;
        const number = parseInt(request.params.number, 10);
        const cards = [];
        cardsData[deckID].forEach((card, index) => {
            //console.log( card, index);
            if (index < number) {
                cards.push(cardsData[deckID].shift());
            }
        });
        console.log(number, deckID, cards);
        return "<pre>" + JSON.stringify(cards, null, 2) + "</pre>";
    },
});

server.route({
    method: "GET",
    path: "/cards/{number}",
    handler: (request, h) => {
        console.log("add uuid, get some cards from deck");
        console.log("assign uuid to hand");
        const number = parseInt(request.params.number, 10);
        console.log(number);
        return (
            "<pre>" +
            JSON.stringify(Deck.shuffle(Deck.cards).slice(0, number), null, 2) +
            "</pre>"
        );
    },
});

server.route({
    method: "GET",
    path: "/",
    handler: () => {
        return "Hello";
    },
});

const init = async () => {
    await server.start();
//    await redis.start();
    console.log("Server running on %s", server.info.uri);
};

process.on("unhandledRejection", (err) => {
    console.log(err);
    process.exit(1);
});

init();
