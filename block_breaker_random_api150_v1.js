import * as mc from "@minecraft/server";

// Based on Dingsel's efficient approach: https://www.youtube.com/watch?v=4Aoc_fGAmKg

const block_types = [
	["minecraft:stone", "stone_type","stone"],
	["minecraft:stone", "stone_type","granite"],
	["minecraft:stone", "stone_type","granite_smooth"],
	["minecraft:stone", "stone_type","diorite"],
	["minecraft:stone", "stone_type","diorite_smooth"],
	["minecraft:stone", "stone_type","andesite"],
	["minecraft:stone", "stone_type","andesite_smooth"],
	["minecraft:dirt", "dirt_type","normal"],
	["minecraft:dirt", "dirt_type","coarse"],
	["minecraft:glowstone", undefined, undefined]
];

function getRandomBlock() {
	return block_types[Math.floor(Math.random() * block_types.length)];
}

mc.system.runInterval(() => {
	//let bt = BlockTypes.getAll()
	//bt.forEach((b) => {
	//	world.sendMessage("Block Type: "+JSON.stringify(b))
	//})
	
	let dimension = mc.world.getDimension("overworld");
	let block = dimension.getBlock( {x:0, y:250, z:0}); // This is just a location in the world. No data. Needs interrogating
	
	//if (block) {
	//	mc.world.sendMessage("Block Type: "+JSON.stringify(block.getComponent(mc.BlockComponent.typeId)))
	//}
	if (!block || block.permutation.matches("minecraft:air")) {
		let newBlock = getRandomBlock();
		let newBlockType = newBlock[0];
		let newBlockStateName = newBlock[1];
		let newBlockStateValue = newBlock[2];
		//let newState = newBlock[1];
		if (newBlockStateName) {  // NOTE: Setting block states with "withState" is broken in server 1.5.0 API. Back in 1.6.0?
			mc.world.sendMessage("State: "+JSON.stringify(newBlockStateName))
			mc.world.sendMessage("Value: "+JSON.stringify(newBlockStateValue))
			let newBlockSet = mc.BlockPermutation.resolve(newBlockType);
			let perm = newBlockSet.withState(newBlockStateName,newBlockStateValue);
			block.setPermutation(perm);
			return
		}
		block.setPermutation(mc.BlockPermutation.resolve(newBlockType));
		return
	}
}, 10)
