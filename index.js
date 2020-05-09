"use strict";

import Hapi from "@hapi/hapi";
import Deck from "./deck";
import { v4 as uuidv4 } from "uuid";

console.log(Deck.setupCards(Deck.cards));

// const Hapi = require('@hapi/hapi');

let cardsData = {};
let handsData = {};

    const server = Hapi.server({
        port: 3000,
        host: "localhost",
    });

    server.route({
        method: "GET",
        path: "/deck",
        handler: (request, h) => {
            const deckID = uuidv4();
            cardsData[deckID] = Deck.shuffle(Deck.cards);
            console.log("redirect to deck uuid");
            return h.redirect(`/deck/${deckID}`);
            // return '<pre>' + JSON.stringify(Deck.shuffle(Deck.cards), null, 2) +'</pre>' ;
        },
    });

    server.route({
        method: "GET",
        path: "/deck/{deckID}",
        handler: (request, reply) => {
            // !! VALIDATE AD UUIDv4
            const deckID = request.params.deckID;
            return (
                "<pre>" +
                cardsData[deckID].length +
                JSON.stringify(cardsData[deckID], null, 2) +
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
                JSON.stringify(
                    Deck.shuffle(Deck.cards).slice(0, number),
                    null,
                    2
                ) +
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
    console.log("Server running on %s", server.info.uri);
};

process.on("unhandledRejection", (err) => {
    console.log(err);
    process.exit(1);
});

init();
