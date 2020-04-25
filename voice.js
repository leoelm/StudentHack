const Discord = require('discord.js');
const fs = require("fs");
const { Readable } = require('stream');
const client = new Discord.Client();

const SILENCE_FRAME = Buffer.from([0xf8, 0xff, 0xfe]);

class SingleSilence extends Readable {
  _read() {
    this.push(SILENCE_FRAME);
    this.push(null);
  }
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
})

client.on("message", async (msg) => {
    if(msg.content.startsWith("/join")) {
        if(msg.member.voice.channel) {
            const connection = await msg.member.voice.channel.join();
            connection.play(new SingleSilence(), { type: 'opus' });
        } else {
            msg.channel.send("get in a voice channel first you fucking twat")
        }
    }
})

client.on("guildMemberSpeaking", (member, speaking) => {
    console.log(member.id);
})

client.login("NzAzNjUyNDM1ODcyMTg2Mzc5.XqRttw.dMnxPb2RY6R004osddRMm7ptG60");