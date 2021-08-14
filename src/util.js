const { MessageAttachment } = require('discord.js');
const Jimp = require('jimp');
const rp = require('request-promise-native');
const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const d3 = require('d3');

const { createCanvas, registerFont, loadImage } = require('canvas');

// fonts
registerFont(__dirname + '/../fonts/HelveticaNeue-Bold.otf', { family: 'HelveticaNeue', weight: '700' });
registerFont(__dirname + '/../fonts/Roboto-Regular.ttf', { family: 'Roboto', weight: '400' });
registerFont(__dirname + '/../fonts/Roboto-Light.ttf', { family: 'Roboto', weight: '300' });
registerFont(__dirname + '/../fonts/Roboto-Medium.ttf', { family: 'Roboto', weight: '500' });
registerFont(__dirname + '/../fonts/Roboto-Bold.ttf', { family: 'Roboto', weight: '700' });

const config = JSON.parse(fs.readFileSync('config.json'));

// access key is from screenshotlayer api. Change it to your own in config.json if you want or you can use mine
const lolApiUrl = 'http://api.screenshotlayer.com/api/capture?delay=3&access_key=' + config.accessKeys[0] + '&fullpage=1&force=1&viewport=3840x2160&url=https://lolalytics.com/lol/kayle/build';

// separate key
const opggStatsApiUrl = 'http://api.screenshotlayer.com/api/capture?delay=3&access_key=' + config.accessKeys[2] + '&fullpage=1&force=1&viewport=3840x2160&url=https://op.gg/champion/statistics';

// URL from where patch data is received
const patchUrl = 'https://raw.githubusercontent.com/CommunityDragon/Data/master/patches.json';

// channel IDs
const logChannelID = config.channels.leagueofgraphs;
const opggChannelID = config.channels.opgg;
const lolChannelID = config.channels.lolalytics;
const uggChannelID = config.channels.ugg;

// color constants
const colors = {
	log: {
		bg: '#3a4556',
		divider:'#2d3848',
		green:'#2DEB90',
		red:'#ff5859',
		blue:'#2AA3CC',
		yellow: '#FDB05F',
	},
	opgg: {
		bg: '#FAFAFA',
		titleBg: '#FFFFFF',
		titleDivider: '#E7E7E7',
		average: '#979797',
		data: '#777777',
		label: '#525252',
		title: '#222222',
		averageSubtitle: '#B6B6B6',
		totalRankColor: '#9B9B9B',
	},
};

async function splitAndSendFiles(channel, files) {
	let arr = files.splice(0, 10);
	while(arr.length) {
		await channel.send({ files: arr });
		arr = files.splice(0, 10);
	}
}

async function postOpggGraph(dom, channel, n, data, options = {}) {
	const opList = [
		'Top Kayle Win Rate',
		'Top Kayle Pick Rate',
		'Kayle Ban Rate',
		'Kayle Win Rate by Game Length',
		'Leaderboard',
	];

	// initialise canvas
	const width = 1000;
	const height = options.height || 350;
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext('2d');
	ctx.quality = 'best';
	ctx.patternQuality = 'best';
	ctx.fillStyle = colors.opgg.bg;
	ctx.fillRect(0, 0, width, height);

	const titleMargin = 40;
	ctx.fillStyle = colors.opgg.titleBg;
	ctx.fillRect(0, 0, width, titleMargin);

	ctx.strokeStyle = colors.opgg.titleDivider;
	drawLine(ctx, 0, titleMargin, width, titleMargin);

	const margin = {
		left: 150,
		bottom: height - 50,
		top: height - 210,
		right: width - 130,
	};

	// data
	const xLabels = data[0];
	const dataPoints = data[1];
	const championAverages = data[2];
	const yLabelGen = data[3];
	const seriesColor = data[4].seriesColor;

	// helper function to add -th, -st, etc.
	function ordinal_suffix_of(i) {
		if (i == undefined) return undefined;

		const j = i % 10,
			k = i % 100;
		if (j == 1 && k != 11) {
			return 'st';
		}
		if (j == 2 && k != 12) {
			return 'nd';
		}
		if (j == 3 && k != 13) {
			return 'rd';
		}
		return 'th';
	}

	let totalRank;
	if(n != 4) {
		totalRank = dom.window.document.getElementsByClassName('champion-stats-trend-rank')[n - 1].innerHTML
			.match(/<span>[\/0-9]+?<\/span>/g)[0]
			.replace('<span>', '')
			.replace('</span>', '');


		// champion rank
		let img;
		const lastDataPoint = parseInt(dataPoints[dataPoints.length - 1].rankInt);
		const secondLastDataPoint = parseInt(dataPoints[dataPoints.length - 2].rankInt);
		if(lastDataPoint > secondLastDataPoint) {
			img = await loadImage(__dirname + '/../assets/opggDownIcon.png');
		}
		else if (lastDataPoint < secondLastDataPoint) {
			img = await loadImage(__dirname + '/../assets/opggUpIcon.png');
		}
		else {
			img = await loadImage(__dirname + '/../assets/opggEqualIcon.png');
		}

		// calculate length of rank string and value, divided by 2 to get offset from center
		let len = img.naturalWidth;
		ctx.font = '700 26px Arial';
		len += ctx.measureText(' ' + lastDataPoint + ' ').width;
		ctx.font = '300 14px Arial';
		len += ctx.measureText(ordinal_suffix_of(lastDataPoint) + ' ' + totalRank + ' ').width;
		ctx.font = '300 26px Arial';
		len += ctx.measureText(' ' + dataPoints[dataPoints.length - 1].y + '%').width;
		len /= 2;

		// line passing through center of rank string
		const centerLineY = margin.top - 70;

		// draw symbol
		ctx.drawImage(img, width / 2 - len, centerLineY - img.naturalHeight / 2);
		len -= img.naturalWidth;

		// rank
		ctx.font = ctx.font = '700 26px Arial';
		ctx.fillStyle = seriesColor;
		ctx.textBaseline = 'middle';
		ctx.fillText(' ' + lastDataPoint + ' ', width / 2 - len, centerLineY);
		len -= ctx.measureText(' ' + lastDataPoint + ' ').width;

		// ordinal and total rank
		ctx.font = '300 14px Arial';
		ctx.fillText(ordinal_suffix_of(lastDataPoint), width / 2 - len, centerLineY);
		len -= ctx.measureText(ordinal_suffix_of(lastDataPoint)).width;
		ctx.fillStyle = colors.opgg.totalRankColor;
		ctx.fillText(' ' + totalRank, width / 2 - len, centerLineY);
		len -= ctx.measureText(' ' + totalRank).width;

		// value
		ctx.font = '300 26px Arial';
		ctx.fillStyle = seriesColor;
		ctx.fillText(' ' + dataPoints[dataPoints.length - 1].y + '%', width / 2 - len, centerLineY);


		// champion average
		let str = '';
		if(n == 1 || n == 2) {
			str = 'Top ';
		}
		ctx.font = '300 12px Arial';
		ctx.fillStyle = colors.opgg.averageSubtitle;
		ctx.textBaseline = 'bottom';
		ctx.textAlign = 'center';
		ctx.fillText(str + 'Champion Average ' + championAverages[championAverages.length - 1].y + '%',
			width / 2, margin.top - 35);
	}

	// title
	ctx.font = '700 14px Arial';
	ctx.fillStyle = colors.opgg.title;
	ctx.textBaseline = 'middle';
	ctx.textAlign = 'left';
	ctx.fillText(opList[n - 1], titleMargin / 2, titleMargin / 2);

	const x = d3.scaleLinear()
		.domain([0, xLabels.length - 1])
		.range([margin.left, margin.right]);

	const maxYVal = Math.max(d3.max(dataPoints, d => d.y), d3.max(championAverages, d => d.y));
	const y = d3.scaleLinear()
		.domain([Math.floor(parseFloat(yLabelGen[0]) / yLabelGen[2]) * yLabelGen[2], Math.ceil(maxYVal / yLabelGen[2]) * yLabelGen[2]])
		.range([margin.bottom, margin.top]);

	// main line
	let line = d3.line()
		.x((d, i) => x(i))
		.y(d => y(d.y))
		.context(ctx);

	ctx.strokeStyle = seriesColor;
	ctx.beginPath();
	line(dataPoints);
	ctx.stroke();

	// champ average line
	line = d3.line()
		.x((d, i) => x(i))
		.y(d => y(d.y))
		.context(ctx);

	ctx.strokeStyle = colors.opgg.average;
	ctx.beginPath();
	ctx.setLineDash([5, 4]);
	line(championAverages);
	ctx.stroke();

	// labels
	ctx.font = '700 11px "Lucida Sans Unicode"';
	ctx.textAlign = 'center';
	ctx.fillStyle = colors.opgg.label;
	for (const label of xLabels) {
		ctx.fillText(label, x(xLabels.indexOf(label)), margin.bottom + 20);
	}

	ctx.textAlign = 'right';
	for(let i = Math.floor(parseFloat(yLabelGen[0]) / yLabelGen[2]) * yLabelGen[2]; i <= Math.ceil(maxYVal / yLabelGen[2]) * yLabelGen[2]; i += yLabelGen[2]) {
		ctx.fillText(i + '%', margin.left - 50, y(i));
	}

	ctx.textAlign = 'center';
	ctx.font = '700 12px "Lucida Sans Unicode"';


	// symbols
	const sym = d3.symbol()
		.context(ctx);

	for (const datum of dataPoints) {
		ctx.fillStyle = colors.opgg.data;
		ctx.fillText(((datum.rankInt + ordinal_suffix_of(datum.rankInt)) || datum.rank.replace('<b>', '').replace('<\/b>', '')), x(dataPoints.indexOf(datum)), y(datum.y) - 12);

		// translate to get ready to draw symbols
		ctx.translate(x(dataPoints.indexOf(datum)), y(datum.y));

		ctx.fillStyle = seriesColor;
		sym.size(60);
		ctx.beginPath();
		sym();
		ctx.fill();

		ctx.fillStyle = '#FFFFFF';
		sym.size(25);
		ctx.beginPath();
		sym();
		ctx.fill();

		// reset translate
		ctx.setTransform(1, 0, 0, 1, 0, 0);
	}

	/**
	 * Send image
	 */

	const img = new MessageAttachment(canvas.toBuffer('image/png'), 'op' + n + '.png');
	return channel.send({ content: opList[n - 1], files: [img] });
}

async function callopgg(msg) {
	/*
     * op.gg
     */

	const dom = await JSDOM.fromURL('https://na.op.gg/champion/kayle/statistics/top/trend', {});
	const channel = await msg.client.channels.fetch(opggChannelID);

	const rgx = /\["[0-9][a-zA-Z"0-9.,\] \[{:<>\\/}\-+\n\t\r'#]{10,}}\)/g;
	let matches = dom.serialize().match(rgx);
	// converts to valid json
	matches = matches.map(s => {
		s = s.replace('name', '"name"');
		s = s.replace('seriesColor', '"seriesColor"');
		s = s.replace('position', '"position"');
		s = s.replace('type', '"type"');
		s = s.replace('enableLegend', '"enableLegend"');
		s = s.replace('undefined', 'null');
		s = s.replace(/'/g, '"');
		return JSON.parse('{"data":[' + s.slice(0, -1) + ']}');
	});

	await postOpggGraph(dom, channel, 1, matches[0].data);
	await postOpggGraph(dom, channel, 2, matches[1].data);
	await postOpggGraph(dom, channel, 3, matches[2].data);
	await postOpggGraph(dom, channel, 4, matches[3].data, { height: 300 });

	Jimp.read(opggStatsApiUrl, async (err, image) => {
		if (err) {
			console.log(err);
			return;
		}

		// leaderboards
		const imageCopy = image.clone();
		imageCopy.crop(1984, 535, 2460 - 1985, 1376 - 535);
		// imageCopy.normalize();
		await imageCopy.writeAsync('./img/op5.png');
		const img = new MessageAttachment(
			__dirname + '/../img/op5.png',
		);
		msg.client.channels.fetch(opggChannelID).then(c => c.send({ content: 'Leaderboard', files: [img] }));
	});
}

// pie charts for stats
async function log1(dom, n) {
	const canvas = createCanvas(800, 200);

	const ctx = canvas.getContext('2d');
	ctx.fillStyle = colors.log.bg;
	ctx.fillRect(0, 0, 800, 200);

	const chart = d3.arc().innerRadius(55).outerRadius(60);
	ctx.translate(100, 100);
	chart.context(ctx);

	// pie charts
	const arr = [];
	const chartColors = [colors.log.blue, colors.log.green, colors.log.red, colors.log.yellow];
	const labelArr = ['Popularity', 'Win Rate', 'Ban Rate', 'Mained By'];
	for(let i = 0; i < 4; i++) {
		arr[i]	= Number((dom.window.document.getElementById('graphDD' + (i + 1)).innerHTML).trim().replace('%', ''));

		const data = [{ value:arr[i], index:0 }, { value:100 - arr[i], index:1 }];
		const arcs = d3.pie()
			.value(function(d) { return d.value;})
			.sort(function(a, b) { return a.index < b.index; })(data);

		ctx.translate((i ? 200 : 0), 0);
		chart.context(ctx);

		ctx.fillStyle = chartColors[i];
		ctx.beginPath();
		chart(arcs[0]);
		ctx.fill();
		ctx.closePath();

		ctx.beginPath();
		ctx.fillStyle = '#485363';
		chart(arcs[1]);
		ctx.fill();
		ctx.closePath();

		ctx.textBaseline = 'middle';
		ctx.textAlign = 'center';
		ctx.font = '300 24px Roboto';
		ctx.fillStyle = '#ffffff';
		ctx.fillText(arr[i] + '%', 0, 0);

		ctx.fillStyle = '#ffffff';
		ctx.font = '300 20px Roboto';
		ctx.fillText(labelArr[i], 0, 80);
	}


	const img = new MessageAttachment(canvas.toBuffer('image/png'), 'log' + n + '.png');
	return img;

}

// draws a line in ctx from (x1, y1) to (x2, y2)
function drawLine(ctx, x1, y1, x2, y2) {
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.stroke();
}

async function log2(dom, n) {

	// data collection from dom
	const coll = dom.window.document.getElementsByTagName('progressbar');
	const data = [];
	for(let i = 0; i < coll.length / 2; i++) {
		data[i] = {};
		data[i].popularity = coll[2 * i].getAttribute('data-value') * 100;
		data[i].winrate = coll[2 * i + 1].getAttribute('data-value') * 100;
	}

	// gets data rows
	const rowColl = dom.window.document.getElementsByClassName('sortable_table')[0]
		.getElementsByTagName('tbody')[0]
		.getElementsByTagName('tr');

	for(let i = 1; i < rowColl.length; i++) {
		data[i - 1].position = rowColl[i].getElementsByTagName('td')[0].getElementsByTagName('a')[0].textContent.trim();
	}


	const spriteYCoords = {
		Top: 150,
		Mid: 90,
		Support: 120,
		'AD Carry': 0,
		Jungler: 60,
	};

	const canvas = createCanvas(553, 389);
	const ctx = canvas.getContext('2d');
	ctx.fillStyle = colors.log.bg;
	ctx.fillRect(0, 0, 553, 389);

	// Title
	ctx.textBaseline = 'top';
	ctx.textAlign = 'left';
	ctx.font = '500 24px Roboto';
	ctx.fillStyle = '#ffffff';
	ctx.fillText('Roles', 23, 13);

	// divider (x = 22 to x = 525)
	ctx.strokeStyle = colors.log.divider;
	drawLine(ctx, 22, 48, 525, 48);

	// get spritesheet
	const spritesheet = await loadImage(__dirname + '/../assets/logLanes.png');

	// headers
	const start = 37;
	ctx.textAlign = 'left';
	ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';

	// aligns headers to be placed at their category's center
	ctx.textAlign = 'center';
	ctx.font = '400 14px Roboto';
	ctx.fillText('Role', start + 60, 112 - 40);
	ctx.fillText('Winrate', 353 + (150 / 2), 112 - 40);
	// popularity rendered as bold to show its the sorting predicate
	ctx.font = '700 14px Roboto';
	ctx.fillStyle = '#ffffff';
	ctx.fillText('Popularity', 171 + (150 / 2), 112 - 40);

	// chart
	ctx.textAlign = 'left';
	let yOffset = 0;
	ctx.font = '400 12px Roboto';
	for(let i = 0; i < 5; i++) {

		// draw lane
		ctx.drawImage(spritesheet, 0, spriteYCoords[data[i].position], 30, 30,
			171 - 134, 112 - 2 + yOffset, 30, 30);

		// draw label
		ctx.fillStyle = '#ffffff';
		ctx.textBaseline = 'middle';
		ctx.fillText(data[i].position, (171 - 134) + 30 + 4, (112 - 2) + yOffset + (30 / 2));

		ctx.textBaseline = 'top';
		// popularity
		// grey underlying bar
		ctx.fillStyle = '#2f3b4b';
		ctx.fillRect(171, 112 + yOffset, 150, 15);
		// actual data bar
		ctx.fillStyle = colors.log.blue;
		ctx.fillRect(171, 112 + yOffset, data[i].popularity / 100 * 150, 15);
		// label
		ctx.fillStyle = '#ffffff';
		ctx.fillText(parseFloat(data[i].popularity).toFixed(1) + '%', 171, 131 + yOffset);
		// set to default
		ctx.fillStyle = '#2f3b4b';

		// winrate
		// grey underlying bar
		ctx.fillRect(353, 112 + yOffset, 150, 15);
		// actual data bar
		ctx.fillStyle = colors.log.green;
		ctx.fillRect(353, 112 + yOffset, data[i].winrate / 100 * 150, 15);
		// label
		ctx.fillStyle = '#ffffff';
		ctx.fillText(parseFloat(data[i].winrate).toFixed(1) + '%', 353, 131 + yOffset);
		// set to default
		ctx.fillStyle = '#2f3b4b';

		// draw dividers only between categories
		if (i != 4) {
			// divider
			drawLine(ctx, 22, 112 + 44 + yOffset, 525, 112 + 44 + yOffset);
		}

		yOffset += 55;
	}

	const img = new MessageAttachment(canvas.toBuffer('image/png'), 'log' + n + '.png');
	return img;
}

async function log3(dom, n) {

	// only need physical and magic damage, the rest is true
	const data = [];
	const bars = dom.window.document.getElementsByClassName('stacked_bar')[0]
		.getElementsByClassName('stacked_bar_area');
	for(const i of bars) {
		data.push(parseFloat(i.getAttribute('tooltip')));
	}

	const canvas = createCanvas(600, 150);
	const ctx = canvas.getContext('2d');
	ctx.fillStyle = colors.log.bg;
	ctx.fillRect(0, 0, 600, 150);

	// Title
	ctx.textBaseline = 'top';
	ctx.textAlign = 'left';
	ctx.font = '500 24px Roboto';
	ctx.fillStyle = '#ffffff';
	ctx.fillText('Damage Dealt', 20, 15);

	ctx.strokeStyle = colors.log.divider;
	drawLine(ctx, 20 - 2, 15 + 40, 600 - (20 - 2), 15 + 40);

	// full bar width and height
	const barWidth = 600 - 2 * (20 - 2) - 2 * 10;
	const barHeight = 40;

	// draw bars
	// true damage
	ctx.fillStyle = '#aaaaaa';
	ctx.fillRect(20 + 5, 15 + 40 + 15, barWidth, barHeight);
	// magic damage
	ctx.fillStyle = colors.log.blue;
	ctx.fillRect(20 + 5, 15 + 40 + 15, ((data[0] + data[1]) / 100) * barWidth, barHeight);
	// physical damage
	ctx.fillStyle = colors.log.red;
	ctx.fillRect(20 + 5, 15 + 40 + 15, (data[0] / 100) * barWidth, barHeight);

	// legend text
	ctx.fillStyle = '#ffffff';
	ctx.font = '400 12px Roboto';
	const legendSize = 16;
	const leftPadding = 2;
	const rightPadding = 5;

	// draw legend
	// physical
	let textWidth = ctx.measureText('Physical').width;
	ctx.fillText('Physical', 600 / 2 - (legendSize / 2) - rightPadding - textWidth,
		15 + 40 + 15 + barHeight + 10);
	ctx.fillStyle = colors.log.red;
	ctx.fillRect(600 / 2 - (legendSize / 2) - rightPadding - textWidth - leftPadding - legendSize,
		15 + 40 + 15 + barHeight + 10 - 2, legendSize, legendSize);

	// magic
	ctx.fillStyle = '#ffffff';
	ctx.fillText('Magic', 600 / 2 + (legendSize / 2) + leftPadding, 15 + 40 + 15 + barHeight + 10);
	ctx.fillStyle = colors.log.blue;
	ctx.fillRect(600 / 2 - (legendSize / 2), 15 + 40 + 15 + barHeight + 10 - 2,
		legendSize, legendSize);

	// true
	textWidth = ctx.measureText('Magic').width;
	ctx.fillStyle = '#ffffff';
	ctx.fillText('True', 600 / 2 + (legendSize / 2) + leftPadding + textWidth + rightPadding + legendSize + leftPadding,
		15 + 40 + 15 + barHeight + 10);
	ctx.fillStyle = '#aaaaaa';
	ctx.fillRect(600 / 2 + (legendSize / 2) + leftPadding + textWidth + rightPadding, 15 + 40 + 15 + barHeight + 10 - 2,
		legendSize, legendSize);

	const img = new MessageAttachment(canvas.toBuffer('image/png'), 'log' + n + '.png');
	return img;
}

function log4helper(ctx, data) {
	const labels = ['PentaKill', 'Gold', 'Minions', 'Wards', 'Damage Dealt'];
	const indices = ['penta', 'gold', 'minions', 'wards', 'damage'];
	const xOffsets = [0, 0, 420, 0, 420];
	const yOffsets = [0, 210, 210, 420, 420];

	for (let i = 0; i < 5; i++) {
		// value
		ctx.textAlign = 'center';
		ctx.font = '300 56px Roboto';
		ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
		ctx.fillText(data[indices[i]].value, (800 - 40) / 4 + xOffsets[i], 10 + 210 + 170 / 2 + yOffsets[i]);
		// label
		ctx.textAlign = 'left';
		ctx.font = '300 36px Roboto';
		const fullTextWidth = ctx.measureText(labels[i]).width;
		ctx.fillStyle = 'rgba(255, 255, 255, 0.43)';
		ctx.fillText(labels[i], (800 - 40) / 4 - fullTextWidth / 2 + xOffsets[i], 10 + 210 + 170 / 2 + 50 + yOffsets[i]);
	}
}

async function log4(dom, n) {
	const canvas = createCanvas(800, 800);
	const ctx = canvas.getContext('2d');

	/**
	 * parse data
	 */
	const data = {
		kda: {},
		penta: {},
		gold: {},
		minions: {},
		wards: {},
		damage: {},
		multiKills: {
			quadra: {},
			triple: {},
			double: {},
		},
	};

	data.kda.kills = dom.window.document.getElementsByClassName('kills')[0].innerHTML;
	data.kda.deaths = dom.window.document.getElementsByClassName('deaths')[0].innerHTML;
	data.kda.assists = dom.window.document.getElementsByClassName('assists')[0].innerHTML;

	const labels = ['penta', 'gold', 'minions', 'wards', 'damage'];
	for(let i = 2; i < dom.window.document.getElementsByClassName('number').length; i++) {
		data[labels[i - 2]].value = dom.window.document.getElementsByClassName('number')[i].innerHTML.trim();
	}
	const smallLabels = ['quadra', 'triple', 'double'];
	for(let i = 1; i < dom.window.document.getElementsByClassName('number-small').length; i++) {
		data.multiKills[smallLabels[i - 1]].value = parseFloat(dom.window.document.getElementsByClassName('number-small')[i].textContent).toFixed(4);
	}
	for(let i = 0; i < dom.window.document.getElementsByClassName('number-legend-small').length; i++) {
		data.multiKills[smallLabels[i]].rank = dom.window.document.getElementsByClassName('number-legend-small')[i].innerHTML.trim();
	}

	// background
	ctx.fillStyle = colors.log.bg;
	ctx.fillRect(0, 0, 800, 800);

	// dividers
	ctx.fillStyle = colors.log.divider;
	ctx.fillRect(0, 170, 800, 40);
	ctx.fillRect(0, 170 + 210, 800, 40);
	ctx.fillRect(0, 170 + 420, 800, 40);
	ctx.fillRect(800 / 2 - 40 / 2, 170, 40, 800 - 170);


	/**
	 * KDA
	 */
	ctx.fillStyle = colors.log.green;
	ctx.font = '400 56px Roboto';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'bottom';
	const fullTextWidth = ctx.measureText(data.kda.kills + ' / ' + data.kda.deaths + ' / ' + data.kda.assists).width;
	ctx.textAlign = 'left';
	// kills
	ctx.fillText(data.kda.kills, 800 / 2 - fullTextWidth / 2, 170 / 2 + 10);
	// separator
	ctx.font = '300 56px Roboto';
	ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
	let partialTextWidth = ctx.measureText(data.kda.kills + ' ').width;
	ctx.fillText('/', 800 / 2 - fullTextWidth / 2 + partialTextWidth, 170 / 2 + 10);
	// deaths
	ctx.font = '400 56px Roboto';
	ctx.fillStyle = colors.log.red;
	partialTextWidth = ctx.measureText(data.kda.kills + ' / ').width;
	ctx.fillText(data.kda.deaths, 800 / 2 - fullTextWidth / 2 + partialTextWidth, 170 / 2 + 10);
	// separator
	ctx.font = '300 56px Roboto';
	ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
	partialTextWidth = ctx.measureText(data.kda.kills + ' / ' + data.kda.deaths + ' ').width;
	ctx.fillText('/', 800 / 2 - fullTextWidth / 2 + partialTextWidth, 170 / 2 + 10);
	// assists
	ctx.font = '400 56px Roboto';
	ctx.fillStyle = colors.log.yellow;
	partialTextWidth = ctx.measureText(data.kda.kills + ' / ' + data.kda.deaths + ' / ').width;
	ctx.fillText(data.kda.assists, 800 / 2 - fullTextWidth / 2 + partialTextWidth, 170 / 2 + 10);
	// label
	ctx.textAlign = 'center';
	ctx.font = '300 36px Roboto';
	ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
	ctx.fillText('Average KDA', 800 / 2, 170 / 2 + 60);


	// draw most data except multikills
	log4helper(ctx, data);

	/**
	 * multikills
	 */
	const initialX = 15 + (800 - 40) / 2 + 40;
	// can get centered y values by: topY + (boxSize / 6)(2n + 1)
	const topY = 170 + 40;
	ctx.textBaseline = 'middle';
	const types = ['Quadra', 'Triple', 'Double'];

	for (let i = 0; i < 3; i++) {
		const currentY = topY + (170 / 6) * (2 * i + 1);
		// value
		ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
		ctx.font = '300 32px Roboto';
		ctx.fillText(parseFloat(data.multiKills[types[i].toLowerCase()].value).toFixed(4), initialX, currentY);
		partialTextWidth = ctx.measureText(parseFloat(data.multiKills[types[i].toLowerCase()].value).toFixed(4) + ' ').width;
		// label
		ctx.fillStyle = 'rgba(255, 255, 255, 0.43)';
		ctx.font = '300 24px Roboto';
		ctx.fillText(types[i] + ' Kill', initialX + partialTextWidth, currentY);
		partialTextWidth += ctx.measureText(types[i] + ' Kill ').width;
	}


	/**
	 * Send image
	 */

	const img = new MessageAttachment(canvas.toBuffer('image/png'), 'log' + n + '.png');
	return img;
}

async function postLogGraph(n, data, options) {
	// initialise options
	if(options.yDomainStart === undefined) {
		options.yDomainStart = d3.min(data, d => d[1]);
	}
	let tickFormatter;
	if(options.tickFormat === 'float') {
		tickFormatter = d => d.toFixed(1);
	}
	else if(options.tickFormat === 'percent') {
		tickFormatter = d => d.toString() + '%';
	}
	else {
		tickFormatter = d => d.toString();
	}

	// initialise canvas
	const width = 500;
	const height = 400;
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext('2d');
	ctx.fillStyle = colors.log.bg;
	ctx.fillRect(0, 0, width, height);

	// Title
	ctx.textBaseline = 'top';
	ctx.textAlign = 'left';
	ctx.font = '500 24px Roboto';
	ctx.fillStyle = '#ffffff';
	ctx.fillText(options.title, 23, 13);

	// divider
	ctx.strokeStyle = colors.log.divider;
	const margin = {
		left: 50,
		right: 20,
		top: 70,
		bottom: height - 30,
	};
	drawLine(ctx, margin.left / 2, 50, width - margin.right / 2, 50);

	let x;
	if(options.scaleFunction === 'utc') {
		x = d3.scaleUtc()
			.domain(d3.extent(data, d => d[0]))
			.range([margin.left, width - margin.right]);
	}
	else {
		x = d3.scaleLinear()
			.domain(d3.extent(data, d => d[0]))
			.range([margin.left, width - margin.right]);
	}

	const y = d3.scaleLinear()
		.domain([options.yDomainStart, Math.ceil(d3.max(data, d => d[1]) / options.tickIntervals.y) * options.tickIntervals.y])
		.range([margin.bottom, margin.top]);


	ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
	ctx.font = '400 12px Roboto';

	// y-axis
	ctx.textBaseline = 'middle';
	ctx.strokeStyle = 'rgba(45, 56, 72, 0.7)';
	ctx.textAlign = 'right';

	const yslope = (margin.top - margin.bottom) / (Math.ceil(d3.max(data, d => d[1]) / options.tickIntervals.y) * options.tickIntervals.y - options.yDomainStart);
	const yc = margin.top - (Math.ceil(d3.max(data, d => d[1]) / options.tickIntervals.y) * options.tickIntervals.y) * yslope;
	let f = d => yslope * d + yc;

	for(let d = Math.ceil(d3.max(data, e => e[1]) / options.tickIntervals.y) * options.tickIntervals.y; f(d) < margin.bottom; d -= options.tickIntervals.y) {
		drawLine(ctx, margin.left, f(d), width - margin.right, f(d));
		ctx.fillText(tickFormatter(d), margin.left - 5, f(d));
	}

	ctx.strokeStyle = colors.log.divider;
	drawLine(ctx, margin.left, margin.bottom, width - margin.right, margin.bottom);
	if(options.tickStarts.y !== undefined) {
		ctx.fillText(tickFormatter(options.tickStarts.y), margin.left - 5, f(options.tickStarts.y));
	}
	drawLine(ctx, margin.left, margin.top, width - margin.right, margin.top);

	// x-axis
	ctx.textBaseline = 'top';
	ctx.strokeStyle = 'rgba(45, 56, 72, 0.7)';
	ctx.textAlign = 'center';

	const xslope = (width - margin.right - margin.left) / (d3.max(data, d => d[0]) - d3.min(data, d => d[0]));
	const xc = width - margin.right - d3.max(data, d => d[0]) * xslope;
	f = d => xslope * d + xc;

	if(options.tickStarts.x === 'year') {
		// starts at 2015, 1 per year
		for(let d = 1420070400000, year = 2015; d < d3.max(data, e => e[0]); d += options.tickIntervals.x, year++) {
			drawLine(ctx, f(d), margin.bottom, f(d), margin.top);
			ctx.fillText(year.toString(), f(d), margin.bottom + 6);
		}
	}
	else {
		for(let d = d3.min(data, e => e[0]); d <= d3.max(data, e => e[0]); d += options.tickIntervals.x) {
			drawLine(ctx, f(d), margin.bottom, f(d), margin.top);
			ctx.fillText(d, f(d), margin.bottom + 6);
		}
	}

	ctx.strokeStyle = colors.log.divider;
	drawLine(ctx, margin.left, margin.bottom, margin.left, margin.top);
	drawLine(ctx, width - margin.right, margin.bottom, width - margin.right, margin.top);

	const line = d3.line()
		.x(d => x(d[0]))
		.y(d => y(d[1]))
		.context(ctx);

	ctx.strokeStyle = options.color;
	ctx.lineWidth = 2;
	ctx.beginPath();
	line(data);
	ctx.stroke();

	// gradient
	const gradient = ctx.createLinearGradient(margin.left, margin.bottom, margin.left, margin.top);
	const gradColor = d3.color(options.color);
	gradColor.opacity = 0.1;
	gradient.addColorStop(0, gradColor.toString());
	gradColor.opacity = 0.6;
	gradient.addColorStop(1, gradColor.toString());

	const area = d3.area()
		.x(d => x(d[0]))
		.y1(d => y(d[1]))
		.y0(margin.bottom)
		.context(ctx);

	ctx.fillStyle = gradient;
	ctx.beginPath();
	area(data);
	ctx.fill();

	/**
	 * Send image
	 */

	const img = new MessageAttachment(canvas.toBuffer('image/png'), 'log' + n + '.png');
	return img;
}

async function calllog(msg) {
	const dom = await JSDOM.fromURL('https://www.leagueofgraphs.com/champions/stats/kayle', {});
	const channel = await msg.client.channels.fetch(logChannelID);

	const files = [];
	files.push(await log1(dom, 1));
	files.push(await log2(dom, 2));
	files.push(await log3(dom, 3));
	files.push(await log4(dom, 4));

	// data for graphs
	const rgx = /data: \[\[.+]]/g;
	const matches = dom.serialize().match(rgx);

	// convert to valid json before parsing
	const options = {
		title: 'Winrate History',
		tickIntervals: {
			x: 31536000000,
			y: 5,
		},
		yDomainStart: undefined,
		tickFormat: 'percent',
		scaleFunction: 'utc',
		color: colors.log.green,
		tickStarts: {
			x: 'year',
			y: undefined,
		},
	};
	files.push(await postLogGraph(5, JSON.parse(('{' + matches[1] + '}').replace('data', '"data"')).data, options));

	options.title = 'Popularity History';
	options.color = colors.log.blue;
	options.tickStarts.y = 1;
	// may be changed by postLogGraph if undefined, so we reset
	options.yDomainStart = undefined;
	files.push(await postLogGraph(6, JSON.parse(('{' + matches[0] + '}').replace('data', '"data"')).data, options));

	options.title = 'BanRate History';
	options.color = colors.log.red;
	options.tickStarts.y = 0;
	options.tickIntervals.y = 20;
	// may be changed by postLogGraph if undefined, so we reset
	options.yDomainStart = undefined;
	files.push(await postLogGraph(7, JSON.parse(('{' + matches[2] + '}').replace('data', '"data"')).data, options));

	options.title = 'Gold / Game duration';
	options.color = colors.log.green;
	options.tickStarts.x = undefined;
	options.tickStarts.y = 0;
	options.tickIntervals = {
		x: 5,
		y: 2500,
	};
	options.yDomainStart = 0;
	options.tickFormat = 'raw';
	options.scaleFunction = 'linear';
	files.push(await postLogGraph(8, JSON.parse(('{' + matches[3] + '}').replace('data', '"data"')).data, options));

	options.title = 'Kills + Assists / Game duration';
	options.tickFormat = 'float';
	options.tickIntervals.y = 2.5;
	files.push(await postLogGraph(9, JSON.parse(('{' + matches[5] + '}').replace('data', '"data"')).data, options));

	options.title = 'Deaths / Game duration';
	options.tickFormat = 'raw';
	options.color = colors.log.red;
	options.tickIntervals.y = 1;
	files.push(await postLogGraph(10, JSON.parse(('{' + matches[6] + '}').replace('data', '"data"')).data, options));

	options.title = 'Winrate / Game Duration';
	options.tickFormat = 'percent';
	options.color = colors.log.green;
	options.tickIntervals.y = 10;
	files.push(await postLogGraph(11, JSON.parse(('{' + matches[7] + '}').replace('data', '"data"')).data, options));

	options.title = 'Winrate / Ranked Games Played';
	options.tickIntervals = {
		x: 10,
		y: 2,
	};
	options.tickStarts.y = undefined;
	options.yDomainStart = undefined;
	files.push(await postLogGraph(12, JSON.parse(('{' + matches[8] + '}').replace('data', '"data"')).data, options));

	options.title = 'Minions / Game duration';
	options.tickIntervals.y = 50;
	options.tickStarts.y = 0;
	options.yDomainStart = 0;
	options.tickFormat = 'raw';
	files.push(await postLogGraph(13, JSON.parse(('{' + matches[4] + '}').replace('data', '"data"')).data, options));

	splitAndSendFiles(channel, files);
}

async function calllol(msg) {


	Jimp.read(lolApiUrl, (err, image2) => {
		if (err) {
			console.log(err);
			return;
		}
		image2.contrast(+0.1);
		let imageCopy = image2.clone();
		imageCopy.crop(1979, 47, 2477 - 1979, 201 - 47);
		imageCopy.write('./img/lol1.png');

		imageCopy = image2.clone();
		imageCopy.crop(1434, 879, 2471 - 1434, 1200 - 879);
		imageCopy.write('./img/lol2.png');

		imageCopy = image2.clone();
		imageCopy.crop(2170, 1655, 2471 - 2170, 2090 - 1655);
		imageCopy.write('./img/lol3.png');
	});

	// post images
	// has a very high timeout to make sure image processing is complete
	// can have weird errors if this value isnt high enough

	setTimeout(function() {
		const files = [];
		for (let i = 1; i <= 3; i++) {
			const img = new MessageAttachment(
				__dirname + '/../img/lol' + i + '.png',
			);
			files.push(img);
		}
		msg.client.channels.fetch(lolChannelID).then(c => splitAndSendFiles(c, files));
	}, 100000);

}

async function callugg(msg) {


	const tierList = [
		'platinum',
		'platinum_plus',
		'diamond',
		'diamond_plus',
		'diamond_2_plus',
		'master',
		'master_plus',
		'grandmaster',
		'challenger',
		'overall',
	];

	const tierName = [
		'Platinum',
		'Platinum+',
		'Diamond',
		'Diamond+',
		'Diamond 2+',
		'Master',
		'Master+',
		'Grandmaster',
		'Challenger',
		'Overall',
	];

	const xCoords = [121, 315, 507, 700, 893];
	const labels = ['Win Rate', 'Rank', 'Pick Rate', 'Ban Rate', 'Matches'];
	const wrColors = { 'shinggo-tier' : '#ff4e50', 'meh-tier':'#ffa1a2',
		'okay-tier': '#ffffff', 'good-tier':'#75cdff',
		'great-tier':'#08a6ff', 'volxd-tier':'#ff9b00',
	};

	for (let i = 0; i < tierList.length; i++) {
		const dom = await JSDOM.fromURL('https://u.gg/lol/champions/kayle/build?rank=' + tierList[i], {});
		const arr = [];

		const positions = ['jungle', 'supp', 'adc', 'top', 'mid'];
		const champId = (await getChampionByID('Kayle')).key;

		// figure out popular position
		let rgx = RegExp('"' + champId + '" *: *\[[0-5 ,]+]');
		const preferred = JSON.parse('{' + dom.serialize().match(rgx).toString() + '}');
		const pos = positions[preferred[champId.toString()][0] - 1];

		rgx = RegExp('world_' + tierList[i] + '_' + pos + '": *{[\n "a-zA-Z0-9:,_.]*?"counters":');

		let fullJson;

		try {
			fullJson = JSON.parse(dom.serialize().match(rgx).toString().replace(/, *"counters" *: */, '}')
				.replace(RegExp('world_' + tierList[i] + '_' + pos + '": *'), ''));
		}
		catch {
			continue;
		}

		arr[0] = fullJson.win_rate;
		arr[1] = `${fullJson.rank !== null ? fullJson.rank : '?'} / ${fullJson.total_rank !== null ? fullJson.total_rank : '?'}`;
		arr[2] = fullJson.pick_rate + '%';
		arr[3] = fullJson.ban_rate + '%';
		arr[4] = new Intl.NumberFormat('en-US').format(fullJson.matches);


		const canvas = createCanvas(1015, 90);
		const ctx = canvas.getContext('2d');

		ctx.fillStyle = '#222238';
		ctx.fillRect(0, 0, 1015, 90);

		ctx.textBaseline = 'top';
		ctx.textAlign = 'center';

		ctx.font = '700 18px HelveticaNeue';

		// color win rate appropriately
		const winrateTier = !arr[0] || isNaN(arr[0]) ? '' : arr[0] < 45 ?
			'shinggo-tier' : arr[0] < 48.5 ? 'meh-tier' : arr[0] < 51.5 ?
				'okay-tier' : arr[0] < 53 ? 'good-tier' : arr[0] < 55 ? 'great-tier' : 'volxd-tier';

		ctx.fillStyle = String(wrColors[winrateTier]);
		ctx.fillText(arr[0] + '%', xCoords[0], 30);

		ctx.fillStyle = '#ffffff';
		for(let j = 1; j < 5; j++) {
			ctx.fillText(arr[j], xCoords[j], 30);
		}

		ctx.fillStyle = '#92929d';
		ctx.font = '700 11px HelveticaNeue';
		for(let j = 0; j < 5; j++) {
			ctx.fillText(labels[j], xCoords[j], 51);
		}

		const img = new MessageAttachment(canvas.toBuffer('image/png'), tierName[i] + '.png');
		const c = await msg.client.channels.fetch(uggChannelID);
		await c.send({ content: tierName[i], files: [img] });
	}
}

async function printDateAndPatch(channel = '', message = '') {

	try {
		const response = await rp(patchUrl);
		const data = JSON.parse(response);


		const today = new Date();
		// prints date
		const c = await message.client.channels.fetch(channel);
		return await c.send(
			'```' +
			new Intl.DateTimeFormat('default', { day: 'numeric', month: 'short', year: 'numeric' }).format(today) +
			' - Patch ' +
			data.patches.slice(-1)[0].name +
			'```',
		);
	}
	catch (error) {
		console.log(error);
	}

}

const championJson = {};

async function getLatestChampionDDragon(language = 'en_US') {
	if (championJson[language]) {
		return championJson[language].data;
	}

	let response;
	let versionIndex = 0;
	// I loop over versions because 9.22.1 is broken
	do {
		const data = JSON.parse(await rp('http://ddragon.leagueoflegends.com/api/versions.json'));
		const version = data[versionIndex++];

		try {
			response = await rp(`https://ddragon.leagueoflegends.com/cdn/${version}/data/${language}/champion.json`, {});
			break;
		}
		catch {
			console.log('ddragon doesn\'t have data, trying another patch');
		}
	} while(!response);

	championJson[language] = JSON.parse(response);
	return championJson[language].data;
}

// NOTE: IN DDRAGON THE ID IS THE CLEAN NAME!!! It's also super-inconsistent, and broken at times.
// Cho'gath => Chogath, Wukong => Monkeyking, Fiddlesticks => Fiddlesticks/FiddleSticks (depending on what mood DDragon is in this patch)
async function getChampionByID(name, language = 'en_US') {
	return (await getLatestChampionDDragon(language))[name];
}

module.exports = {
	calllog,
	calllol,
	callopgg,
	callugg,
	printDateAndPatch,
	getChampionByID,
	logChannelID,
	lolChannelID,
	opggChannelID,
	uggChannelID,
	patchUrl,
};