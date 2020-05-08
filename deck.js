const setupCards = ( array ) => {
		const
			suits  = ['clubs', 'diamonds', 'hearts', 'spades'],
			values = ['ace', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'jack', 'queen', 'king'];
		for ( let suit_index = 0; suit_index < suits.length; suit_index++ ){
			for ( let value_index = 0; value_index < values.length; value_index++ ){
				array.push( {'suit': suits[suit_index],'value': values[value_index]} )
			}
		}
	}
	// http://bost.ocks.org/mike/shuffle/
const shuffle = ( array ) => {
		var counter = array.length, temp, index;
		while (counter > 0){
			index = (Math.random() * counter--) | 0;
			temp = array[counter];
			array[counter] = array[index];
			array[index] = temp;
		}
		return array;
	}


const Deck = {
	cards: [],
	setupCards,
	shuffle
}

export default Deck;
