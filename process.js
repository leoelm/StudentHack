
const Discord = require('discord.js');
const client = new Discord.Client();
const speech = require('@google-cloud/speech');
const fs = require('fs');

client.once('ready', () => {
        console.log('Ready!');
});

client.login('NzAzNjUwOTM2NjA5ODMzMDAx.XqRsjA.-jSQD1XXXyAECNMl7uqTnIGC6pY');


client.on('message', async message => {
  // Join the same voice channel of the author of the message
  if (message.member.voice.channel) {
    console.log('listening');
    const connection = await message.member.voice.channel.join();
    // Create a ReadableStream of s16le PCM audio
    const audio = connection.receiver.createStream(message.member.id, { mode: 'pcm' });
    var ws = fs.createWriteStream('user_audio');
    await audio.pipe(ws);
    ws.on('finish', function() {
      var SoxCommand = require('sox-audio');
      var command = SoxCommand();
      command.input('user_audio')
        .inputSampleRate(48000)
        .inputEncoding('signed')
        .inputBits(16)
        .inputChannels(2)
        .inputFileType('raw');
      command.output('jsout.wav')
        .outputChannels(1)
        .outputSampleRate(48000)
        .outputFileType('wav');
      command.run();
      command.on('end', async function() {
        console.log('detection done');
        // Google recognition
        const client = new speech.SpeechClient();

        // The name of the audio file to transcribe
        const fileName = 'jsout.wav';

        // Reads a local audio file and converts it to base64
        const file = fs.readFileSync(fileName);
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
        console.log(`Transcription: ${transcription}`);
        message.channel.send(`I heard someone say ${transcription}`);
      });
    });
  }
});

