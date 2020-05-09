import { Machine, Assign, interpret } from "xstate";

const handMachine = Machine({
    id: "hand",
    context: {
        cards: [],
    },
    initial: "active",
    states: {},
});

const cardMachine = Machine({
    id: "deck",
    context: {},
    inital: "ready",
    states: {
        ready: {},
        active: {},
        empty: {},
    },
});

const cardService = interpret(cardMachine).onTransition((state) => {
    console.log(state.value);
});

service.start();

// service.send('EVENT');
// service.stop();
