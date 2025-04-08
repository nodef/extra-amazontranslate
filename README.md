Translate long text from one language to another, via [Amazon Translate].
> Do you want to:
> - Share your ideas to people in their local language?
> - Translate YouTube video subtitles to another language?
> - Or, [Upload Wikipedia TTS videos on YouTube]?

Sample: ["I want to order a stuffed crust pizza"](https://pastebin.com/Ln9L05Bi).

<br>
<br>


## Setup

1. Run `npm install -g extra-amazontranslate` in console.
2. To install this as a package use `npm install extra-amazontranslate`.

<br>
<br>


## Console

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


### Reference

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
<br>


## Package

```javascript
const amazontranslate = require('extra-amazontranslate');

await amazontranslate('I want to order a stuffed crust pizza', {target: 'es'});
// get text in spanish

await amazontranslate('Dead man walking.', {log: true, target: 'pt'});
// get text in portugese (log enabled)
```


### Reference

```javascript
const amazontranslate = require('extra-amazontranslate');

amazontranslate(text, options={})
// text:    input text to be translated
// options: translation and config options
// -> Promise <table of contents>

# -r, --retries:
# -os, --source:
# -ot, --target: set target language (en)
# -bs, --block_separator: set translate block separator (.)
# -bl, --block_length:    set translate block length (2500)
# -c*, --config_*: set amazon config options (see Extra AWS Config options below)

// Default options:
options = {
  stdio: [0, 1, 2], // set child process stdio
  log: false,       // enable log
  retries: 8,       // set translate retries
  source: 'auto',   // set source language
  target: 'en',     // set target language
  block: {
    separator: '.', // set translate block separator
    length: 2500    // set translate block length
  },
  config: null      // set amazon config options (see Extra AWS Config options below)
}
```
> See [Extra AWS Config] options.

<br>
<br>


## Similar

Do you need anything similar?
- [extra-awsconfig] can get AWS config from arguments and environment variables.
- [extra-amazontts] can synthesize speech from text for multiple languages.

Suggestions are welcome. Please [create an issue].

<br>
<br>


[![nodef](https://i.imgur.com/1ELgVHI.jpg)](https://nodef.github.io)
> References: [Extra AWS Config], [AWS Translate API], [language codes], [language pairs].

[Amazon Translate]: https://aws.amazon.com/translate/
[Upload Wikipedia TTS videos on YouTube]: https://www.youtube.com/results?search_query=wikipedia+audio+article

[extra-awsconfig]: https://www.npmjs.com/package/extra-awsconfig
[extra-amazontts]: https://www.npmjs.com/package/extra-amazontts
[create an issue]: https://github.com/nodef/extra-amazontranslate/issues

![](https://ga-beacon.deno.dev/G-RC63DPBH3P:SH3Eq-NoQ9mwgYeHWxu7cw/github.com/nodef/extra-amazontranslate)

[Extra AWS Config]: https://www.npmjs.com/package/extra-awsconfig
[AWS Translate API]: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Translate.html
[language codes]: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Translate.html#translateText-property
[language pairs]: https://docs.aws.amazon.com/translate/latest/dg/pairs.html
