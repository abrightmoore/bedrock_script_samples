import * as mc from "@minecraft/server";  //  Required for API access.

const dimension = mc.world.getDimension("overworld");  // TODO: handle the dimension on a player-by-player basis

//  @TheWorldFoundry
//  This is Minecraft Bedrock javascript 

/*
	User story:
		The player wants to simulate Conway's Game of Life using Minecraft Blocks.
		The position blocks of the selected type on the ground in a flat layer.
		They place an entity on the ground upon a block of the selected type in the world in that same layer.
		The underlay of the world is transformed to a checkerboard
		This script then moves into a mode where it plays through the game of life until no changes occur in next tick
*/

const time_budget_limit = 4;	//  How many milliseconds am I prepared to spend processing updates?
const time_budget_minimum = 1;  //  What is the minimum available slot to schedule work?

const debug = true;
const performance_debug = false;  //   Use when looking at how long things take to execute
const block_placement_debug = false;

let iteration = 0;			//	Count the number of times a Minecraft tick occurs
let iteration_update = 0;	//	Count the number of times a game update occurs
const update_every = 8;		//  Update the game on every nth frame. Min is 1, max is whatever (for an infrequently processed check
let initialised = false		//	Run-once at start flag

const block_backlog = new Map(); //   For tracking the intended changes to the world. Location, block permutation, timestamp
const block_backlog_limit = 1500;
const remove_backlog_on_error = true;

function add_to_block_backlog( pos, block) {
	let key = String(pos.x)+","+String(pos.y)+","+String(pos.z)
	
	block_backlog.set( key, {p: pos, b: block} );	
};

/*
	Only attempt to process world changes that are within a region that is close to the player otherwise it will fail
	The chunks that you are trying to change need to be loaded in memory of the server.
*/

function send_alert(msg, data) {
	/*
		Alert the user that something has happened
	*/
	if(debug) {
		mc.world.sendMessage(String(msg) + String(data));
	};
};


/*
	The game loop will process updates
*/

/*
	These are the game specific variables
*/
const field_size = 64;
const field_frames = new Array(2);  // One current displayed frame, one working one. Double-buffered display.
let current_frame = 0, next_frame = 1;
let num_neighbours = 0;
let px, py, cell_state;  // Calculating next cell states
let block, index, block_type;
const field_origin = {x:-900, y:256, z:0}; // TODO: position the field relative to a tagged entity for multiple simulations.
let cells = [
				"minecraft:air",
				"minecraft:iron_block",
				"minecraft:glowstone"
				
];  // Dead,Alive. Avoid lighting updates

function game_initialise() {
	for (let i = 0; i<cells.length; i++) {
		cells[i] = mc.BlockPermutation.resolve(cells[i]);  // pre-calculate the block permutation, replacing string references
	};

	for (let j = 0; j<2; j++) {
		field_frames[j] = new Array(field_size);  // Add # rows
		for (let i = 0; i < field_frames[j].length; i++) {
			field_frames[j][i] = new Array(field_size);  // Add columns to each row
			// Randomise the initial state
			for (let k = 0; k < field_frames[j][i].length; k++) {
				field_frames[j][i][k] = Math.floor(Math.random() * 2) // 0 empty or 1 alive. TODO: Allow pause and build
				// Clear the play zone up front because we're not updating all the blocks every tick
				if (j == 0) {  // Clear out blocks only once on the first loop
					try {
						let pos = {x: field_origin.x+k, y:field_origin.y+i, z:field_origin.z};
						let block = cells[0];
						add_to_block_backlog( pos, block );
					} catch(error) {
						send_alert("[TWF] block_backlog.set()", String(error));
					};
				}
			}
		}
	};	
};

/*
	End game specific variables
*/



function game_update() {
	/*
		This will run every time the game tick happens.
		This is responsible for changing the state of the game.
		Anything that requires updates to the world will be sent to a backlog.
		Updates to the world are time-constrained
	*/
	
	const start_time = new Date().getTime();

	/* DO WORK */ 
	// mc.world.sendMessage("game_update() has run");

	// START CUSTOM LOGIC

	if(block_backlog.size < block_backlog_limit) {

		current_frame = iteration_update%2;  // 0 or 1
		next_frame = (iteration_update+1)%2; // 1 or 0
		//  send_alert(current_frame, next_frame);
		iteration_update += 1;  // Simple frame counter
		//  Scan the current frame to work out what happens to each cell
		// As we prepare the NEXT frame state in the memory buffer, we can push it out to the world to avoid 2xLoops
		for (let y = 0; y < field_frames[current_frame].length; y++) {
			for (let x = 0; x < field_frames[current_frame][y].length; x++) {
				field_frames[next_frame][y][x] = 0;
				cell_state = field_frames[current_frame][y][x];  // Copy for convenience 
				num_neighbours = 0;
				for (let dy = -1; dy < 2; dy++) {
					for (let dx = -1; dx < 2; dx++) {
						px = (x+dx) // %field_size;
						py = (y+dy) // %field_size;
						if ((0 <= px) && (px < field_size) && (0 <= py) && (py < field_size) && !(dx == 0 && dy == 0)) {
							if (field_frames[current_frame][py][px] > 0) {
								num_neighbours += 1;
							}
						}
					}
				}
				if ((num_neighbours < 2) || (num_neighbours > 3) && (cell_state > 0)) {
					field_frames[next_frame][y][x] = 0; // Dead as the dodo
				}
				else if ((num_neighbours == 3) && (cell_state < 1)) {
					field_frames[next_frame][y][x] = 1; // The miracle of nature
				}
				else {
					field_frames[next_frame][y][x] = field_frames[current_frame][y][x]
				}
				// Use the value of the next frame cell to index the block type
				// Now holding a handle on what is in space we can force the block into it
				// For performance improvements, only change blocks that have been changed
				if (true) { //(field_frames[next_frame][y][x] != cell_state) {
					try {
						let pos = {x: field_origin.x+x, y:field_origin.y+y, z:field_origin.z+iteration_update}
						let block = cells[field_frames[next_frame][y][x]]
						add_to_block_backlog( pos, block );
					} catch(error) {
						send_alert("[TWF] block_backlog.set()", String(error));
					};
				};

			};
		};
	};

	//  END CUSTOM LOGIC


	

	if(performance_debug) {
		const end_time = new Date().getTime();		
		send_alert("[TWF] game_update() runtime is ", String(end_time - start_time));
	};
};


function process_block_backlog(time_limit) {
	/*
		Reach into the block map and see if any can be processed out into the world.
	*/
	const start_time = new Date().getTime();
	
	let remove_keys = [];  //  These will be purged from the backlog after processing

	let keys = Array.from( block_backlog.keys() );
	// send_alert("Keys", keys)

	let keep_going = true;
	
	let i = 0;	//	index on the block backlog
	
	while(i < block_backlog.size && keep_going) {
		try {
			let val = block_backlog.get( keys[i] );
			if(val) {
				let block = dimension.getBlock( val.p )
				if(block) {
					block.setPermutation( val.b );
				};
			};
			remove_keys.push(keys[i]);	//	If there was no error, mark this location to be deleted.
		} catch(error) {	//	If there's an error, keep the backlog entry in memory to try again some other time. TODO: Persistent errors should purge the block?
			if(block_placement_debug) {
				let val = block_backlog.get( keys[i] );
				send_alert(keys[i], block_backlog.get( keys[i] ));
				send_alert("process_backlog() error", error);	//	Errors can be normal, so consider doing nothing here
				if(remove_backlog_on_error) {
					remove_keys.push(keys[i]);
				};
			};
		};
		
		if(new Date().getTime() - start_time >= time_limit) {
			keep_going = false	//	We've run out of time, stop processing
		}
		i += 1;
	};
	
	remove_keys.forEach((key) => {	//	Take all the successfully placed positions off the backlog list
		block_backlog.delete(key)
	});
};


function run_each_frame() {
	/*
		Based on the backlog, selectively process as many elements as is reasonable to fit in one cycle.
		Note - cater for the player being out of the zone where changes can be applied.
		
		Based on the current machine state, add to the backlog as we process each step.
	*/
	const start_time = new Date().getTime();
	const block_backlog_length_before = block_backlog.size

	if(!initialised) {	// Run once code
		game_initialise()
		initialised = true
	};


	iteration += 1;  // Simple frame counter
	if(iteration % update_every == 0) {
		game_update()
	};

	//  Purge some backlog?
	let available_time = time_budget_limit - (new Date().getTime() - start_time)
	if(available_time >= time_budget_minimum && available_time <= time_budget_limit) {	//  Tune these values for different games
		process_block_backlog( available_time )
	};

	if(performance_debug) {
		const end_time = new Date().getTime();		
		send_alert("[TWF] run_each_frame() runtime is ", String(end_time - start_time));
		send_alert("[TWF] run_each_frame() block_backlog length was ", String(block_backlog_length_before));
		send_alert("[TWF] run_each_frame() block_backlog length is ", String(block_backlog.size));
	};	
};


mc.system.runInterval(() => {
	try {
		run_each_frame()
	} catch(error) {   //	Unhandled exceptions go here
		mc.world.sendMessage("[TWF] Error in mc.system.runInterval: "+String(error));  //  Not suppressed by debug
	};
}, 1);