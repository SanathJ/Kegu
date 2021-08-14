const database = require('../src/database.js');

module.exports = {
	name: 'exec',
	args: true,
	minArgLength: 2,
	usage: '<run | get | all> <query>',
	cooldown: 10,
	guildOnly: true,
	adminOnly: true,
	description: 'Executes a SQL query',
	async execute(message, args) {
		let str = '';
		for(let i = 1; i < args.length; i++) {
			str += args[i];
			str += ' ';
		}
		str = str.trim();
		message.channel.send({ content: JSON.stringify(await database.runner(args[0], str)) });
	},
};