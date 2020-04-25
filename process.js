const Discord = require('discord.js');
const client = new Discord.Client();
const speech = require('@google-cloud/speech');
const fs = require('fs');
const { Readable } = require('stream');
var stringSimilarity = require('string-similarity');

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

client.login('NzAzNjUyNDM1ODcyMTg2Mzc5.XqRttw.dMnxPb2RY6R004osddRMm7ptG60');

client.on("message", async (msg) => {
    if (msg.content.startsWith("/moderate")) {
        if (msg.member.voice.channel) {
            connection = await msg.member.voice.channel.join();
            connection.play(new SingleSilence(), { type: 'opus' });
            channel = msg.channel;
        }
    }
});

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
      const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');
        transcription = transcription.split(" ")
        for(word in transcription) {
          let ratings = stringSimilarity.findBestMatch(word, swearWords)
          if(ratings[ratings.bestMatchIndex].rating >= 0.8) {
            channel.send(member.displayName + " please stop swearing!" + 
            "\nWE DO NOT TOLERATE THIS KIND OF FUCKING LANGUAGE ON THIS GODDAMN SERVER.")
            break;
          }
        }
      console.log(`Transcription: ${transcription}`);
      channel.send(`I heard someone say ${transcription}`);
    });
  });
});

