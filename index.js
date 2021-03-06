"use strict";

import Hapi from "@hapi/hapi";
import Deck from "./deck";
import { v4 as uuidv4 } from "uuid";

import Catbox from "@hapi/catbox";
import CatboxRedis from "@hapi/catbox-redis";

import { Tedis } from "tedis";

const EXPIRE_BUMP = 60;

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
    config: {
        cors: {
            origin: ["*"],
            additionalHeaders: ["cache-control", "x-requested-with"],
        },
    },
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

server.route({
    method: "GET",
    path: "/cli",
    config: {
        cors: {
            origin: ["*"],
            additionalHeaders: ["cache-control", "x-requested-with"],
        },
    },
    handler: async (request, h) => {
        const deckID = uuidv4();
        try {
            await tedis.set(`deck-${deckID}`, JSON.stringify(getNewCards()));
        } catch (err) {
            console.error(err);
        }
        // console.log("redirect to deck uuid");
        return h.redirect(`/cli/deck/${deckID}/cards/5`);
        // return '<pre>' + JSON.stringify(getNewCards(), null, 2) +'</pre>' ;
    },
});

server.route({
    method: "GET",
    path: "/cli/deck/{deckID}/cards/{number}",
    config: {
        cors: {
            origin: ["*"],
            additionalHeaders: ["cache-control", "x-requested-with"],
        },
    },
    handler: async function (request, h) {
        console.log("add uuid, get some cards from deck");
        console.log("assign uuid to hand");
        const { deckID } = request.params;
        let validDeckId;
        try {
            validDeckId = await tedis.exists(`deck-${deckID}`);
        } catch (err) {
            console.log(error);
        }
        if (validDeckId) {
            const number = parseInt(request.params.number, 10);
            let deck;
            try {
                deck = JSON.parse(await tedis.get(`deck-${deckID}`));
            } catch (err) {
                console.error(err);
            }
            let deckArray = Object.values(deck);
            const hand = new Array(number)
                .join()
                .split(",")
                .map((i) => {
                    return deckArray.shift();
                });
            // console.log( hand, deckArray );
            try {
                await tedis.set(`deck-${deckID}`, JSON.stringify(deckArray));
                await tedis.expire(`deck-${deckID}`, EXPIRE_BUMP);
            } catch (err) {
                console.error(err);
            }
            // console.log(deckArray.length, typeof deckArray );
            // console.log(number, deckID, hand);
            //         return (
            //             "<pre>" +
            //             JSON.stringify(hand, null, 2) +
            //             `cards left: ${deckArray.length}` +
            //             "</pre>"
            //         );
            return (
                `#!/bin/bash
echo ${hand.join(" ")}
hand=${hand.join("")}
remainingHand=''
host=localhost:3000
drawURL=$host/cli/deck/${deckID}/

read -p "1-5 to hold: " holdcards
# echo Hold These Cards? $holdcards
echo Holding These Cards: $holdcards
numberHeld=` +
                "${#holdcards}" +
                `
for (( i=0; i<numberHeld; i++ )); do
  echo ` +
                '"${hand:$i*2:2}"' +
                `
  echo `+'"${holdcards:$i:1}"'+`
  remainingHand=$remainingHand` +
                '"${hand:$i*2:2}"' +
                `
done
#echo $remainingHand
numberToDraw=$(expr 5 - $numberHeld)
drawURL=$drawURL$remainingHand/draw/$numberToDraw
echo $drawURL
drawCards=$(curl -s $drawURL)
finalHand=$remainingHand$drawCards
echo $finalHand
echo @TODO: Score Me!
echo @TODO: Play Again?
`
            );
        } else {
            return "expired?";
        }
    },
});

server.route({
    method: "GET",
    path: "/cli/deck/{deckID}/draw/{draw_number}/{hand}",
    config: {
        cors: {
            origin: ["*"],
            additionalHeaders: ["cache-control", "x-requested-with"],
        },
    },
    handler: async function (request, h) {
        console.log("cli draw - get some cards from deck");
        const { deckID, hand, draw_number } = request.params;
        // Todo, sanitize hand input, with deck.js utility function
        let validDeckId;
        try {
            validDeckId = await tedis.exists(`deck-${deckID}`);
        } catch (err) {
            console.log(error);
        }
        if (validDeckId) {
            const draw_number_clean = parseInt(draw_number, 10);
            let deck;
            try {
                deck = JSON.parse(await tedis.get(`deck-${deckID}`));
            } catch (err) {
                console.error(err);
            }
            let deckArray = Object.values(deck);
            const hand = new Array(draw_number_clean)
                .join()
                .split(",")
                .map((i) => {
                    return deckArray.shift();
                });
            // console.log( hand, deckArray );
            try {
                await tedis.set(`deck-${deckID}`, JSON.stringify(deckArray));
                await tedis.expire(`deck-${deckID}`, EXPIRE_BUMP);
            } catch (err) {
                console.error(err);
            }
            // console.log(deckArray.length, typeof deckArray );
            // console.log(number, deckID, hand);
            //         return (
            //             "<pre>" +
            //             JSON.stringify(hand, null, 2) +
            //             `cards left: ${deckArray.length}` +
            //             "</pre>"
            //         );
            return hand.join("");
            // `#!/bin/bash
            // echo ${hand.join(' ')}
            // read -p "1-5 to hold: " holdcards
            // # echo Hold These Cards? $holdcards
            // echo Holding These Cards: $holdcards
            // ` + "for (( i=0; i<${#holdcards}; i = i+1 )); do" + `
            //   echo ` + '"${holdcards:$i:1}"' + `
            // done
            // `;
        } else {
            return "expired?";
        }
    },
});

const decks_to_links = (deckKeys) => {
    return (
        "<ul>" +
        deckKeys
            .map((key) => {
                return `<li><a href="/deck/${key.replace(
                    "deck-",
                    ""
                )}">${key}</a></li>`;
            })
            .join("\n") +
        "</ul>"
    );
};

server.route({
    method: "GET",
    path: "/decks",
    handler: async (request, h) => {
        try {
            return decks_to_links(Object.values(await tedis.keys("deck-*")));
        } catch (err) {
            console.error(err);
        }
    },
});

server.route({
    method: "GET",
    path: "/deck/{deckID}",
    config: {
        cors: {
            origin: ["*"],
            additionalHeaders: ["cache-control", "x-requested-with"],
        },
    },
    handler: async (request, reply) => {
        // !! VALIDATE THE UUIDv4
        const { deckID } = request.params;
        let validDeckId;
        try {
            validDeckId = await tedis.exists(`deck-${deckID}`);
        } catch (err) {
            console.log(error);
        }
        if (validDeckId) {
            const theCards = JSON.parse(await tedis.get(`deck-${deckID}`));
            await tedis.expire(`deck-${deckID}`, EXPIRE_BUMP);
            //         return (
            //             "<pre>" +
            //             deckID +
            //             " " +
            //             theCards.length +
            //             JSON.stringify(theCards, null, 2) +
            //             "</pre>"
            //         );
            return theCards.length;
        } else {
            return "expired?";
        }
    },
});

//♦♣♥♠

//diamonds (), clubs (), hearts () and spades ()

server.route({
    method: "GET",
    path: "/deck/{deckID}/cards/{number}",
    config: {
        cors: {
            origin: ["*"],
            additionalHeaders: ["cache-control", "x-requested-with"],
        },
    },
    handler: async function (request, h) {
        console.log("add uuid, get some cards from deck");
        console.log("assign uuid to hand");
        const { deckID } = request.params;
        let validDeckId;
        try {
            validDeckId = await tedis.exists(`deck-${deckID}`);
        } catch (err) {
            console.log(error);
        }
        if (validDeckId) {
            const number = parseInt(request.params.number, 10);
            let deck;
            try {
                deck = JSON.parse(await tedis.get(`deck-${deckID}`));
            } catch (err) {
                console.error(err);
            }
            let deckArray = Object.values(deck);
            const hand = new Array(number)
                .join()
                .split(",")
                .map((i) => {
                    return deckArray.shift();
                });
            // console.log( hand, deckArray );
            try {
                await tedis.set(`deck-${deckID}`, JSON.stringify(deckArray));
                await tedis.expire(`deck-${deckID}`, EXPIRE_BUMP);
            } catch (err) {
                console.error(err);
            }
            // console.log(deckArray.length, typeof deckArray );
            // console.log(number, deckID, hand);
            //         return (
            //             "<pre>" +
            //             JSON.stringify(hand, null, 2) +
            //             `cards left: ${deckArray.length}` +
            //             "</pre>"
            //         );
            return hand;
        } else {
            return "expired?";
        }
    },
});

// server.route({
//     method: "GET",
//     path: "/cards/{number}",
//     handler: (request, h) => {
//         console.log("add uuid, get some cards from deck");
//         console.log("assign uuid to hand");
//         const number = parseInt(request.params.number, 10);
//         console.log(number);
//         return (
//             "<pre>" +
//             JSON.stringify(Deck.shuffle(Deck.cards).slice(0, number), null, 2) +
//             "</pre>"
//         );
//     },
// });

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
