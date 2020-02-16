const { Client, Attachment } = require('discord.js');
const bot = new Client();
var request = require('request');
const fs = require('fs');

var Jimp = require('jimp');


// access key is from screenshotlayer api. Change it to your own if you want or you can use mine
const lolApiUrl = 'http://api.screenshotlayer.com/api/capture?access_key=9b9af7ac099cc1b7109598edc65d40ce&fullpage=1&force=1&viewport=3840x2160&url=https://lolalytics.com/lol/kayle/';
const logApiUrl = 'http://api.screenshotlayer.com/api/capture?access_key=9b9af7ac099cc1b7109598edc65d40ce&fullpage=1&force=1&viewport=1920x1080&url=https://www.leagueofgraphs.com/champions/stats/kayle';
const opggTrendApiUrl = 'http://api.screenshotlayer.com/api/capture?access_key=9b9af7ac099cc1b7109598edc65d40ce&fullpage=1&force=1&viewport=3840x2160&url=https://op.gg/champion/kayle/statistics/top/trend';

// separate key
const opggStatsApiUrl = 'http://api.screenshotlayer.com/api/capture?access_key=dbdf7ff19a38fce2e0d5bdb97e5c2396&fullpage=1&force=1&viewport=3840x2160&url=https://op.gg/champion/statistics';
const uggApiUrl = 'http://api.screenshotlayer.com/api/capture?access_key=dbdf7ff19a38fce2e0d5bdb97e5c2396&user_agent=Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A356 Safari/604.1&fullpage=1&force=1&viewport=3840x2160&url=https://m.u.gg/lol/champions/kayle/build';

// URL from where patch data is received
const patchUrl = 'https://raw.githubusercontent.com/CommunityDragon/Data/master/patches.json';

let config = JSON.parse(fs.readFileSync('config.json'));

const token = config.token;
const PREFIX = config.prefix;

// channel IDs
const logChannelID = config.channels.leagueofgraphs;
const opggChannelID = config.channels.opgg;
const lolChannelID = config.channels.lolalytics;

var today = new Date();

bot.on('ready', () => {
    console.log('Online!');
    // bot.user.setActivity('with explosions');
});

bot.on('error', console.error);

function printDateAndPatch(patch, channel){
    today = new Date();
    // prints date
    bot.channels
        .get(channel)
        .send(
            '```' +
                today.getDate() +
                '/' +
                (today.getMonth() + 1) +
                '/' +
                today.getFullYear() +
                ', Patch ' +
                patch +
                '```'
        );
}

function callopgg(msg){
    // msg.channel.sendMessage('EXPLOSION!');
    
    /*
     * op.gg
     */

    var opList = [
        'Win Rate',
        'Pick Rate',
        'Ban Rate',
        'Win Rate / Game Length',
        // 'Trends',
        'Leaderboard'
    ];
    
    getPatch(printDateAndPatch, opggChannelID);

    Jimp.read(opggTrendApiUrl, (err, image) => {
        if (err) throw err;
        
        // winrate
        imageCopy = image.clone();
        imageCopy.crop(1381, 687, 2458 - 1381, 1019 - 687);
        //imageCopy.normalize();
        imageCopy.write('op1.png');

        // pickrate
        imageCopy = image.clone();
        imageCopy.crop(1381, 1032, 2458 - 1381, 1364 - 1032);
        //imageCopy.normalize();
        imageCopy.write('op2.png');

        // banrate
        imageCopy = image.clone();
        imageCopy.crop(1381, 1377, 2458 - 1381, 1709 - 1377);
        //imageCopy.normalize();
        imageCopy.write('op3.png');

        // winrate / game length
        imageCopy = image.clone();
        imageCopy.crop(1381, 1722, 2458 - 1381, 2000 - 1722);
        //imageCopy.normalize();
        imageCopy.write('op4.png');
    });

    Jimp.read(opggStatsApiUrl, (err, image) => {    
        if (err) throw err;
        
        // leaderboards
        imageCopy = image.clone();
        imageCopy.crop(1986, 407, 2438 - 1986, 1244 - 407);
        //imageCopy.normalize();
        imageCopy.write('op5.png');
    })

    // post images
    // has a very high timeout to make sure image processing is complete
    // can have weird errors if this value isnt high enough
    setTimeout(function() {
        for (var i = 1; i <= opList.length; i++) {
            var img = new Attachment(
                __dirname + '/op' + i + '.png'
            );
            bot.channels
                .get(opggChannelID)
                .send(opList[i - 1], img);
        }
    }, 100000);  

}

function calllog(msg){
    // msg.channel.sendMessage('EXPLOSION!');
    
    getPatch(printDateAndPatch, logChannelID);

    Jimp.read(logApiUrl, (err, image) => {
        if (err) throw err;
        
        // popularity history
        imageCopy = image.clone();
        imageCopy.crop(629, 482, 1071 - 629, 785 - 482);
        //imageCopy.normalize();
        imageCopy.write('log1.png');

        // winrate history
        imageCopy = image.clone();
        imageCopy.crop(629, 806, 1071 - 629, 1109 - 806);
        //imageCopy.normalize();
        imageCopy.write('log2.png');

        // banrate history
        imageCopy = image.clone();
        imageCopy.crop(629, 1130, 1071 - 629, 1433 - 1130);
        //imageCopy.normalize();
        imageCopy.write('log3.png');

        // winrate / game duration
        imageCopy = image.clone();
        imageCopy.crop(629, 1523, 1070 - 629, 1825 - 1523);
        //imageCopy.normalize();
        imageCopy.write('log4.png');

        // winrate / ranked games played
        imageCopy = image.clone();
        imageCopy.crop(1103, 1524, 1543 - 1103, 1825 - 1524);
        //imageCopy.normalize();
        imageCopy.write('log5.png');

        // kills + assists / game duration
        imageCopy = image.clone();
        imageCopy.crop(630, 1848, 1070 - 630, 2149 - 1848);
        //imageCopy.normalize();
        imageCopy.write('log6.png');

        // deaths / game duration
        imageCopy = image.clone();
        imageCopy.crop(1103, 1848, 1543 - 1103, 2149 - 1848);
        //imageCopy.normalize();
        imageCopy.write('log7.png');

        // winrate / (kills - deaths) @10 min
        imageCopy = image.clone();
        imageCopy.crop(630, 2172, 1070 - 630, 2473 - 2172);
        //imageCopy.normalize();
        imageCopy.write('log8.png');

        // winrate / (kills - deaths) @20 min
        imageCopy = image.clone();
        imageCopy.crop(1103, 2172, 1543 - 1103, 2473 - 2172);
        //imageCopy.normalize();
        imageCopy.write('log9.png');

        // stats
        imageCopy = image.clone();
        imageCopy.crop(629, 290, 1544 - 629, 461 - 290);
        //imageCopy.normalize();
        imageCopy.write('log10.png');

        // Roles
        imageCopy = image.clone();
        imageCopy.crop(1102, 482, 1544 - 1102, 751 - 482);
        //imageCopy.normalize();
        imageCopy.write('log11.png');
        
        // Damage
        imageCopy = image.clone();
        imageCopy.crop(1102, 890, 1544 - 1102, 1007 - 890);
        //imageCopy.normalize();
        imageCopy.write('log12.png');

        // KDA
        imageCopy = image.clone();
        imageCopy.crop(1102, 1028, 1544 - 1102, 1125 - 1028);
        // imageCopy.normalize();
        imageCopy.write('log13.png');
        
    });                

    // post images
    // has a very high timeout to make sure image processing is complete
    // can have weird errors if this value isnt high enough
    setTimeout(function() {
        for (var i = 1; i <= 13; i++) {
            var img = new Attachment(
                __dirname + '/log' + i + '.png'
            );
            bot.channels.get(logChannelID).send(img);
        }
    }, 100000);



}

function calllol(msg){
    // msg.channel.sendMessage('EXPLOSION!');
    getPatch(printDateAndPatch, lolChannelID);

    Jimp.read(lolApiUrl, (err, image2) => {
        if (err) throw err;
        image2.contrast(+0.1);
        
        
        imageCopy = image2.clone();
        imageCopy.crop(1976, 49, 2439 - 1976, 194 - 49);
        imageCopy.write('lol1.png');
        
        imageCopy = image2.clone();
        imageCopy.crop(1401, 735, 2438 - 1401, 1058 - 735);
        imageCopy.write('lol2.png');
        
        imageCopy = image2.clone();
        imageCopy.crop(2137, 1065, 2438 - 2137, 1538 - 1065);
        imageCopy.write('lol3.png');
    })

    // post images
    // has a very high timeout to make sure image processing is complete
    // can have weird errors if this value isnt high enough
    
    setTimeout(function() {
        for (var i = 1; i <= 3; i++) {
            var img = new Attachment(
                __dirname + '/lol' + i + '.png'
            );
            bot.channels.get(lolChannelID).send(img);
        }
    }, 100000);
       
}

function callugg(msg){

}



function getPatch(callback, channel){
    
    request.get(patchUrl, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var data = JSON.parse(body)
            return callback(parseFloat(data.patches.slice(-1)[0].name), channel);
        }
    });
    
}

bot.on('message', msg => {
    let args = msg.content.substring(PREFIX.length).split(' ');
    if (msg.member.hasPermission(0x00000008)) {
        switch (args[0]) {
            case 'opgg':
                callopgg(msg);
                // clean up bootstrapping evidence
                msg.delete();
                break;

            case 'log':
                calllog(msg);
                // clean up bootstrapping evidence
                msg.delete();
                break;

            case 'lol':
                calllol(msg);
                // clean up bootstrapping evidence
                msg.delete();
                break;
            
            // works but throws errors. Can probably ignore errors but idk
            // probably best to not use
            case 'megu':
                today = new Date();
                calllog(msg);
                calllol(msg);
                callopgg(msg);
                msg.delete();
                break;
            
            // immediately exits without waiting for async operations to complete
            case 'stop':
                process.exit(0);
                break;
            
            case 'test':
                // msg.channel.send(parseFloat(getPatch()));
                getPatch(printDateAndPatch, msg.channel.id);
                break;

            
        }
    
        switch (args[0]) {
            case 'time':
                let date_ob = new Date();

                // current date
                // adjust 0 before single digit date
                let date = ('0' + date_ob.getDate()).slice(-2);

                // current month
                let month = ('0' + (date_ob.getMonth() + 1)).slice(-2);

                // current year
                let year = date_ob.getFullYear();

                // current hours
                let hours = date_ob.getHours();

                // current minutes
                let minutes = date_ob.getMinutes();

                // current seconds
                let seconds = ('0' + date_ob.getSeconds()).slice(-2);
                msg.channel.send(
                    'Server Time: ' +
                        date +
                        '/' +
                        month +
                        '/' +
                        year +
                        ' ' +
                        hours +
                        ':' +
                        minutes +
                        ':' +
                        seconds
                );
                break;
        }
    }

});

bot.login(token);
