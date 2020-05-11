"use strict";

import Hapi from "@hapi/hapi";
import Deck from "./deck";
import { v4 as uuidv4 } from "uuid";

import Catbox from "@hapi/catbox";
import CatboxRedis from "@hapi/catbox-redis";

import { Tedis } from "tedis";

// console.log(Deck.setupCards(Deck.cards));

// const Hapi = require('@hapi/hapi');

let cardsData = {};
let handsData = {};

const server = Hapi.server({
    port: 3000,
    host: "localhost",
    //     cache: [
    //         {
    //             name: "server_cache",
    //             provider: {
    //                 constructor: CatboxRedis,
    //                 options: {
    //                     partition: "server_cache_data",
    //                     host: "localhost",
    //                     port: 6379,
    //                     // db: 0,
    //                     // tls: {},
    //                 },
    //             },
    //         },
    //     ],
});

const tedis = new Tedis({
    host: "127.0.0.1",
    port: 6379,
});
// const clearRedis = async function () {
//     const keys = await tedis.keys("*");
//     console.log("clearing redis keys", Object.values(keys));
// //     const removed = await tedis.del(Object.values(keys));
// //     return removed;
// };
tedis.on("connect", async function () {
    console.log("connect");
});
tedis.on("timeout", () => {
    console.log("timeout");
});
tedis.on("error", (err) => {
    console.log(err);
});
tedis.on("close", (had_error) => {
    console.log("close with err: ", had_error);
});

const getNewCards = () => Deck.shuffle(Deck.setupCards([]));

server.route({
    method: "GET",
    path: "/redis",
    handler: async (request, h) => {
        console.log("redis stuff");
        // await tedis.set("string1", "abcdefg");
        // await tedis.del(["string0.21661283457580294","string0.30093878952791897","string0.8819908080792178","string0.9943098526132488","string1","string0.5421336798301422"])
        return await tedis.keys("*");
        // return '<pre>' + JSON.stringify(Deck.shuffle(Deck.cards), null, 2) +'</pre>' ;
    },
});

server.route({
    method: "GET",
    path: "/deck",
    handler: async (request, h) => {
        const deckID = uuidv4();
        try {
            await tedis.set(`deck-${deckID}`, JSON.stringify(getNewCards()));
        } catch (err) {
            console.error(err);
        }
        // console.log("redirect to deck uuid");
        return h.redirect(`/deck/${deckID}`);
        // return '<pre>' + JSON.stringify(getNewCards(), null, 2) +'</pre>' ;
    },
});

const decks_to_links = (deckKeys) => {
    return deckKeys.map((key) => {
        return `<li><a href="/deck/${key.replace(
            "deck-",
            ""
        )}">${key}</a></li>`;
    });
};

server.route({
    method: "GET",
    path: "/decks",
    handler: async (request, h) => {
        try {
            return (
                "<ul>" +
                decks_to_links(Object.values(await tedis.keys("deck-*"))).join(
                    "\n"
                ) +
                "</ul>"
            );
        } catch (err) {
            console.error(err);
        }
    },
});

server.route({
    method: "GET",
    path: "/deck/{deckID}",
    handler: async (request, reply) => {
        // !! VALIDATE THE UUIDv4
        const { deckID } = request.params;
        console.log(deckID);
        const theCards = JSON.parse(await tedis.get(`deck-${deckID}`));
        return (
            "<pre>" +
            deckID +
            " " +
            theCards.length +
            JSON.stringify(theCards, null, 2) +
            "</pre>"
        );
    },
});


//♦♣♥♠

//diamonds (), clubs (), hearts () and spades ()

server.route({
    method: "GET",
    path: "/deck/{deckID}/cards/{number}",
    handler: async function (request, h) {
        console.log("add uuid, get some cards from deck");
        console.log("assign uuid to hand");
        const deckID = request.params.deckID;
        const number = parseInt(request.params.number, 10);
        let deck;
        try {
            deck = JSON.parse(await tedis.get(`deck-${deckID}`));
        } catch (err) {
            console.error(err);
        }
        let deckArray = Object.values(deck);
        const hand = new Array(number).join().split(',').map(i => { return deckArray.shift()});
        // console.log( hand, deckArray );
        try {
            await tedis.set(`deck-${deckID}`, JSON.stringify(deckArray));
        } catch (err) {
            console.error(err);
        }
        // console.log(deckArray.length, typeof deckArray );
        // console.log(number, deckID, hand);
        return "<pre>" +
        JSON.stringify(hand, null, 2) +
        `cards left: ${deckArray.length}` +
        "</pre>";
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
        return "Please select a deck or make a new one";
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
