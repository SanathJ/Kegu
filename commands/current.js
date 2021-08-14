const fs = require('fs');

const Discord = require('discord.js');

const config = JSON.parse(fs.readFileSync('config.json'));

const rp = require('request-promise-native');

const sites = require('../src/sites.js');

const { patchUrl } = require('../src/util.js');

let lastClient;

async function curr(client) {
	if(!lastClient) lastClient = client;

	lastClient.channels.fetch(config.channels.current).then(channel => channel.bulkDelete(40));
	const siteArr = ['opgg', 'ugg', 'lol', 'log'];
	const embeds = [];
	const currentChannel = await lastClient.channels.fetch(config.channels.current);

	currentChannel.sendTyping();
	for (let i = 0; i < siteArr.length; i++) {
		const row = {};
		// sets image, url, color, and data based on site
		let image;
		let url;
		let color;
		let dataArr;
		switch (siteArr[i]) {
		case 'opgg':
			image = 'https://cdn.discordapp.com/attachments/561116378090700811/711408499388579870/opgg.png';
			url = 'https://na.op.gg/champion/kayle/statistics/top/trend';
			color = '#ff0000';
			dataArr = await sites.opgg();
			break;
		case 'log':
			image = 'https://cdn.discordapp.com/attachments/561116378090700811/711405113872482334/LoG.png';
			url = 'https://www.leagueofgraphs.com/champions/stats/kayle';
			color = '#5775a6';
			dataArr = await sites.log();
			break;
		case 'lol':
			image = 'https://cdn.discordapp.com/attachments/561116378090700811/711407080871034932/LoLalytics.png';
			url = 'https://lolalytics.com/lol/kayle/';
			color = '#d5b240';
			dataArr = await sites.lol();
			break;
		case 'ugg':
			image = 'https://cdn.discordapp.com/attachments/561116378090700811/711438714290831461/UGG.png';
			url = 'https://u.gg/lol/champions/kayle/build';
			color = '#0060ff';
			dataArr = await sites.ugg();
			break;
		}

		// if dataArr is empty
		if(Object.keys(dataArr).length === 0) {
			continue;
		}

		// current patch
		const JSONstr = await rp(patchUrl);
		const data = JSON.parse(JSONstr);
		row.Patch = data.patches.slice(-1)[0].name;

		// data
		row.Winrate = dataArr[0];
		row.Pickrate = dataArr[1];
		row.Banrate = dataArr[2];

		const embed = new Discord.MessageEmbed()
			.setColor(color)
			.setTitle('Kayle Data')
			.setURL(url)
			.setImage(image)
			.addField('Date', new Intl.DateTimeFormat('default', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date()), true)
			.addField('Patch', row.Patch, true)
			.addField('\u200b', '\u200b')
			.addField('Winrate', row.Winrate + '%', true)
			.addField('Pickrate', row.Pickrate + '%', true)
			.addField('Banrate', row.Banrate + '%', true);

		embeds.push(embed);
	}

	await currentChannel.send({ embeds: embeds });

	const sentMsg = await currentChannel.send('```Refresh```');
	sentMsg.react(config.emojiID);

	const filter = (reaction, user) => reaction.emoji.id == config.emojiID && !user.bot;
	const collector = sentMsg.createReactionCollector({ filter, max: 1 });

	collector.on('collect', handler);
}

function handler(reactionIgnore) {
	curr();
}

module.exports = {
	name: 'current',
	args: false,
	guildOnly: true,
	adminOnly: false,
	cooldown: 60,
	usage: ' ',
	description: 'Displays current data',
	async execute(message, argsIgnore) {
		lastClient = message.client;
		this.curr();
	},
	curr,
};