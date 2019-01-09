Translate long text from one language to another (via "Amazon Translate").
> Do you want to:
> - Share your ideas to people in their local language?
> - Translate YouTube video subtitles to another language?
> - Or, [Upload Wikipedia TTS videos on YouTube]?

Sample: ["I want to order a stuffed crust pizza"](https://pastebin.com/Ln9L05Bi).
<br>


## setup

### install

1. Run `npm install -g extra-amazontranslate` in console.
2. To install this as a package use `npm install extra-amazontts`.
<br>


## console

```bash
amazontranslate "I want to order a stuffed crust pizza" --target "spanish"
# get text in spanish

amazontranslate -t input.txt -o output.txt --target "japanese"
# output.txt created from japanese translation of input.txt

amazontranslate "Hello 911, my husband is in danger!" -ot "fr"
# get text in french

echo "Dead man walking." | amazontranslate --log -ot "pt"
# get text (from stdin) in portugese (log enabled)
```
> Supported [language pairs]?


### reference

```bash
amazontranslate [options] <text>
# text: input text

# Options:
# --help:        show this help
# -l, --log:     enable log
# -o, --output:  set output text file
# -t, --text:    set input text file
# -r, --retries: set translate retries (8)
# -os, --source: set source language (auto)
# -ot, --target: set target language (en)
# -bs, --block_separator: set translate block separator (.)
# -bl, --block_length:    set translate block length (2500)
# -c*, --config_*: set amazon config options (see Extra AWS Config options below)

# Environment variables:
$TRANSLATE_LOG     # enable log (0)
$TRANSLATE_OUTPUT  # set output text file
$TRANSLATE_TEXT    # set input text file
$TRANSLATE_RETRIES # set translate retries (8)
$TRANSLATE_SOURCE  # set source language (auto)
$TRANSLATE_TARGET  # set target language (en)
$TRANSLATE_BLOCK_SEPARATOR # set translate block separator (.)
$TRANSLATE_BLOCK_LENGTH    # set translate block length (2500)
... # see Extra AWS Config options below
```
> See [Extra AWS Config] options.
<br>


## package

```javascript
const amazontranslate = require('extra-amazontranslate');

await amazontranslate('out.mp3', 'I want to order a stuffed crust pizza');
// out.mp3 created (yay!)

const fs = require('fs');
var speech = fs.readFileSync('speech.txt', 'utf8');
await amazontranslate('speech.mp3', speech)
// speech.mp3 created from text in speech.txt

await amazontranslate('out.mp3', 'Hello 911, my husband is in danger!', {
  voice: {gender: 'female'}
});
// out.mp3 created with female voice

await amazontranslate('out.mp3', 'Dead man walking.', {
  voice: {name: 'Matthew'}, quiet: true
});
// out.mp3 created with different male voice (quiet mode)
```

### reference

```javascript
const amazontts = require('extra-amazontts');

amazontts(output, text, options={})
// output:  output audio file
// text:    input text
// options: given below
// -> Promise <table of contents>

// Default options:
options = {
  stdio: [0, 1, 2], // set child process stdio
  quiet: false,     // enable quiet mode
  retries: 8,       // set speech synthesis retries
  acodec: 'copy',   // set audio acodec
  service: {
    region: 'us-east-1', // set region to send service requests to
    endpoint: ''         // set endpoint to send requests to
  },
  credentials: {
    id: '',   // set AWS access key id
    key: '',  // set AWS secret access key
    path: ''  // set AWS config (json/ini) path
  }, 
  audio: {
    encoding: '',  // set audio encoding format
    frequency: 0,  // set audio frequency/sample rate in Hz
  },
  language: {
    code: '',      // set language code
    lexicons: [],  // set pronounciation lexicon names
  },
  voice: {
    name: '',         // set voice name
    gender: 'neutral' // set voice gender
  },
  quote: {
    break: 250,          // set quoted text break time
    emphasis: 'moderate' // set quoted text emphasis level
  },
  heading: {
    break: 4000,        // set heading text break time
    difference: 250,    // set heading text break difference
    emphasis: 'strong', // set heading text emphasis level
  },
  ellipsis: {
    break: 1500         // set ellipsis break time
  },
  dash: {
    break: 500          // set dash break time
  },
  newline: {
    break: 1000         // set newline break time
  },
  block: {
    length: 5000,       // set SSML block length
    separator: '.'      // set SSML block separator
  }
  config: {         // set AWS config options "directly"
    /* AWS config options */
  },
  params: {         // set Polly synthesizeSpeech params "directly"
    /* Polly synthesizeSpeech params */
  }
}
```
<br>


## similar

Do you need anything similar?
- [extra-youtubeuploader] can upload videos with caption to YouTube.
- [extra-stillvideo] can generate video from audio and image.

Suggestions are welcome. Please [create an issue].
<br><br>


[![nodef](https://i.imgur.com/Ui0cS8T.jpg)](https://nodef.github.io)
> References: [SSML], [TTS voices], [TTS client docs].

["Amazon Polly"]: https://aws.amazon.com/polly/
["ffmpeg"]: https://ffmpeg.org
[Upload Wikipedia TTS videos on YouTube]: https://www.youtube.com/results?search_query=wikipedia+audio+article

[Node.js]: https://nodejs.org/en/download/
[console]: https://en.wikipedia.org/wiki/Shell_(computing)#Text_(CLI)_shells

[extra-stillvideo]: https://www.npmjs.com/package/extra-stillvideo
[extra-youtubeuploader]: https://www.npmjs.com/package/extra-youtubeuploader
[create an issue]: https://github.com/nodef/extra-amazontts/issues

[SSML]: https://docs.aws.amazon.com/polly/latest/dg/supported-ssml.html
[TTS voices]: https://docs.aws.amazon.com/polly/latest/dg/voicelist.html
[TTS client docs]: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Polly.html

