# Discord Audio bot
This bot was created for StudentHack 2020. Its purpose it to moderate chat & audio channels on discord, and also transcribe messages from voice channels to text.

The bot makes use of the Google Cloud Speech-To-Text API for converting voice messages to text, and also the discord.js library for interacting with Discord.

The following commands are available to be used:
- /help - get a list of all available commands
- /join-voice - get the bot to join the voice channel you are currently in
- /moderate - toggle moderation mode (swear detection) of the bot in both audio & text channels
- /record - toggle recording mode (logging spoken messages to text) of the bot

Please be careful if you plan to use this bot - make sure there are sensible limits put in place for how much credit on Google Cloud the bot can use for speech-to text conversion.
