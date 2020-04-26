const Discord = require('discord.js');
const client = new Discord.Client();
const speech = require('@google-cloud/speech');
const fs = require('fs');
const { Readable } = require('stream');
var stringSimilarity = require('string-similarity');

var MODERATE = false;
var RECORD = false;

var channel;
var connection;

const swearWords = ["fuck", "shit", "bitch", "retard", "whore", "asshole", "bullshit"];

const SILENCE_FRAME = Buffer.from([0xf8, 0xff, 0xfe]);

class SingleSilence extends Readable {
  _read() {
    this.push(SILENCE_FRAME);
    this.push(null);
  }
}

client.once('ready', () => {
  console.log('Ready!');
});

client.login('NzAzNjUwOTM2NjA5ODMzMDAx.XqS75w.qynrkBG9Jp7fLNOVmApf5IXiPGQ');

client.on("message", async (msg) => {
  if (msg.content.startsWith("/help")) {
    msg.reply("Here are the command options for this bot: \n/join-voice: join the voice channel\n/moderate: toggle moderation mode of chat & voice channel\n/record: toggle transcription of voice channel")
  } else if (msg.content.startsWith("/join-voice")) {
        if (msg.member.voice.channel) {
            connection = await msg.member.voice.channel.join();
            connection.play(new SingleSilence(), { type: 'opus' });
            channel = msg.channel;
        }
    } else if (msg.content.startsWith("/moderate")) {
      MODERATE = !MODERATE;
      msg.channel.send("Voice & chat moderation is now " + (MODERATE ? 'enabled' : 'disabled'));
    } else if (msg.content.startsWith("/record")) {
      RECORD = !RECORD;
      msg.channel.send("Voice transcription is now " + (RECORD ? 'enabled' : 'disabled'));
    }
    if (MODERATE) {
      for (word of swearWords) {
        let message = msg.content.split(' ');
        let _ratings = stringSimilarity.findBestMatch(word, message);
        if(_ratings.bestMatch.rating>0.8) {
          msg.reply("please stop swearing");
          msg.delete();
        }
      }
    }
});

var isReady = true;


client.on("guildMemberSpeaking", async (member, speaking) => {
  console.log('listening');
  const fileName = 'user_audio_' + member.id + '_' + Date.now();
  // Create a ReadableStream of s16le PCM audio
  const audio = connection.receiver.createStream(member.id, { mode: 'pcm' });
  var ws = fs.createWriteStream(fileName);
  await audio.pipe(ws);
  ws.on('finish', function() {
    var SoxCommand = require('sox-audio');
    var command = SoxCommand();
    command.input(fileName)
      .inputSampleRate(48000)
      .inputEncoding('signed')
      .inputBits(16)
      .inputChannels(2)
      .inputFileType('raw');
    command.output(fileName + '.wav')
      .outputChannels(1)
      .outputSampleRate(48000)
      .outputFileType('wav');
    command.run();
    command.on('end', async function() {
      console.log('detection done');
      // Google recognition
      const client = new speech.SpeechClient();

      // Reads a local audio file and converts it to base64
      const file = fs.readFileSync(fileName + '.wav');
      const audioBytes = file.toString('base64');
      if (audioBytes.length < 100000) {
        // File size small, extremely likely nothing was said, so don't process
        return;
      }
      // The audio file's encoding, sample rate in hertz, and BCP-47 language code
      const audio = {
        content: audioBytes,
      };
      const config = {
        encoding: 'WAV',
        sampleRateHertz: 48000,
        languageCode: 'en-US',
      };
      const request = {
        audio: audio,
        config: config,
      };

      // Detects speech in the audio file
      const [response] = await client.recognize(request);
      var transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');
        let transParts = transcription.split(" ");
        for (word of swearWords) {
          let _ratings = stringSimilarity.findBestMatch(word, transParts);
          if (_ratings.bestMatch.rating >= 0.8 && MODERATE) {
            channel.send("<@" + member.id + "> please stop swearing!")
            connection.play('./no-swearing.mp3');
            if(member.voice.mute == false) {
              member.voice.setMute(true, "muted")
              connectDM = await member.createDM();
              connectDM.send("Hi,\n\nYou used offensive language which is not acceptable. As a reminder, the MLH Code of Conduct says that harassment and abuse are never tolerated. What can be interpreted as joking around by one person can be interpreted as hurtful and offensive by another.\n\nThis message serves as a formal warning not to violate the MLH Code of Conduct again. Please be considerate of others.\n\nIf you have any questions or concerns, reach out to me directly on a DM, or email incidents@mlh.io.");
            }
            return;
          }
        }
      if (transcription.length > 0 && RECORD) {
        channel.send(member.displayName + ": " + transcription);
        console.log(`Transcription: ${transcription}`);
      }
    });
  });
});
