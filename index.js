#!/usr/bin/env node
const Translate = require('aws-sdk/clients/translate');
const randomItem = require('random-item');
const getStdin = require('get-stdin');
const boolean = require('boolean');
const ini = require('ini');
const _ = require('lodash');
const cp = require('child_process');
const fs = require('fs');


// Global variables
const E = process.env;
const STDIO = [0, 1, 2];
const OPTIONS = {
  help: false,
  log: boolean(E['TRANSLATE_LOG']||'0'),
  output: E['TRANSLATE_OUTPUT']||null,
  text: E['TRANSLATE_TEXT']||null,
  retries: parseInt(E['TRANSLATE_RETRIES']||'8', 10),
  service: {
    region: E['TRANSLATE_SERVICE_REGION']||null,
    endpoint: E['TRANSLATE_SERVICE_ENDPOINT']||null
  },
  credentials: {
    id: E['TRANSLATE_CREDENTIALS_ID']||null,
    key: E['TRANSLATE_CREDENTIALS_KEY']||null,
    path: E['TRANSLATE_CREDENTIALS_PATH']||null
  },
  language: {
    source: E['TRANSLATE_LANGUAGE_SOURCE']||null,
    target: E['TRANSLATE_LANGUAGE_TARGET']||null
  },
  block: {
    length: parseInt(E['TRANSLATE_BLOCK_LENGTH']||'3000', 10),
    separator: E['TRANSLATE_BLOCK_SEPARATOR']||'.'
  }
};


// Read file, return promise.
function fsReadFile(pth, o) {
  return new Promise((fres, frej) => fs.readFile(pth, o, (err, data) => {
    return err? frej(err):fres(data);
  }));
};

// Write file, return promise.
function fsWriteFile(pth, dat, o) {
  return new Promise((fres, frej) => fs.writeFile(pth, dat, o, (err) => {
    return err? frej(err):fres();
  }));
};

// Load Translate config from path.
function translateConfigLoad(pth) {
  var dat = fs.readFileSync(pth, 'utf8');
  if(pth.endsWith('.json')) return JSON.parse(dat);
  var cfg = ini.parse(dat), z = {};
  cfg = cfg.default||cfg;
  for(var k in cfg)
    z[_.camelCase(k.replace(/^aws_/, ''))] = cfg[k];
  return z;
};

// Get Translate config.
function translateConfig(o) {
  var s = o.service, c = o.credentials;
  var z = c.path? translateConfigLoad(randomItem(c.path.split(';'))):{};
  z.endpoint = s.endpoint||z.endpoint;
  z.accessKeyId = c.id||z.accessKeyId;
  z.secretAccessKey = c.key||z.secretAccessKey;
  z.region = s.region||z.region||'us-east-1';
  return z;
};

// Get Translate translate text params.
function translateTranslateTextParams(txt, o) {
  return {Text: txt, SourceLanguageCode: o.language.source||'auto', TargetLanguageCode: o.language.target};
};

// Get translate block from long text.
function textTranslateBlock(txt, o) {
  var b = o.block;
  for(var end=b.length;;) {
    end = Math.floor(0.75*end);
    var i = txt.lastIndexOf(b.separator, end)+1;
    i = i>0? i:Math.min(txt.length, end);
    var blk = txt.substring(0, i);
    if(blk.length<b.length) break;
  }
  return [blk, txt.substring(i)];
};

// Translate text block.
function textTranslate(txt, obj, o) {
  var l = o.log, req = o.params; req.Text = txt;
  return new Promise((fres, frej) => {
    obj.translateText(req, (err, res) => {
      if(err) return frej(err);
      if(l) console.log('-textTranslate:', res.TranslatedText.length);
      return fres(res.TranslatedText);
    });
  });
};

// Translate text block, with retries.
async function textsRetryTranslate(txt, obj, o) {
  var err = null;
  for(var i=0; i<o.retries; i++) {
    try { return await textTranslate(txt, obj, o); }
    catch(e) { err = e; }
  }
  throw err;
};

// Generate output text block parts.
function outputBlocks(txt, o) {
  for(var i=0, z=[]; txt; i++) {
    var [blk, txt] = textTranslateBlock(txt, o);
    z[i] = blk;
  }
  return z;
};

// Generate text block parts.
function outputAudios(out, ssmls, tts, o) {
  if(o.log) console.log('-outputAudios:', out, ssmls.length);
  var pth = pathFilename(out), ext = path.extname(out);
  for(var i=0, I=ssmls.length, z=[]; i<I; i++)
    z[i] = textsRetryTranslate(`${pth}.${i}${ext}`, ssmls[i], tts, o);
  return Promise.all(z);
};

// Generate output audio file.
async function outputAudio(out, auds, o) {
  if(o.log) console.log('-outputAudio:', out, auds.length);
  var lst = tempy.file({extension: 'txt'}), dat = '';
  for(var aud of auds)
    dat += `file '${aud}'\n`;
  await fsWriteFile(lst, dat);
  var z = await cpExec(`ffmpeg -y -safe 0 -f concat -i "${lst}" -acodec ${o.acodec} "${out}"`, o);
  fs.unlink(lst, FN_NOP);
  return z;
};

/**
 * Translate long text from one language to another (via "Amazon Translate").
 * @param {string} txt input text.
 * @param {object} o options.
 * @returns promise <translated text>.
 */
async function amazontranslate(txt, o) {
  var o = _.merge({}, OPTIONS, o);
  var out = out||o.output, c = o.credentials;
  var txt = txt||o.input||(o.text? await fsReadFile(o.text, 'utf8'):null);
  if(o.log) console.log('@amazontts:', out, txt);
  o.params = o.params||translateTranslateTextParams(out, null, o);
  var tts = new Polly(o.config||translateConfig(o));
  var ext = path.extname(out);
  var aud = tempy.file({extension: ext.substring(1)});
  var secs = textSections('\n'+txt), prts = [], ssmls = [];
  for(var sec of secs) {
    var secSsmls = outputBlocks(sec.content, o);
    prts.push(secSsmls.length);
    Array.prototype.push.apply(ssmls, secSsmls);
  }
  var auds = await outputAudios(aud, ssmls, tts, o);
  out = await outputAudio(out, auds, o);
  var durs = await outputDurations(auds);
  for(var i=0, j=0, t=0, toc=[], I=secs.length; i<I; i++) {
    toc[i] = {title: secs[i].title, time: timeFormat(t)};
    for(var p=0; p<prts[i]; p++)
      t += durs[j++];
  }
  for(var f of auds) fs.unlink(f, FN_NOP);
  if(o.log) console.log(' .toc:', toc);
  return toc;
};

// Get options from arguments.
function options(o, k, a, i) {
  if(k==='--help') o.help = true;
  else if(k==='-l' || k==='--log') o.log = true;
  else if(k==='-o' || k==='--output') o.output= a[++i];
  else if(k==='-t' || k==='--text') o.text = a[++i];
  else if(k==='-r' || k==='--retries') o.retries = parseInt(a[++i], 10);
  else if(k==='-sr' || k==='--service_region') _.set(o, 'service.region', a[++i]);
  else if(k==='-se' || k==='--service_endpoint') _.set(o, 'service.endpoint', a[++i]);
  else if(k==='-ci' || k==='--credentials_id') _.set(o, 'credentials.id', a[++i]);
  else if(k==='-ck' || k==='--credentials_key') _.set(o, 'credentials.key', a[++i]);
  else if(k==='-cp' || k==='--credentials_path') _.set(o, 'credentials.path', a[++i]);
  else if(k==='-ls' || k==='--language_source') _.set(o, 'language.source', a[++i]);
  else if(k==='-lt' || k==='--language_target') _.set(o, 'language.target', a[++i]);
  else if(k==='-bl' || k==='--block_length') _.set(o, 'block.length', parseInt(a[++i], 10));
  else if(k==='-bs' || k==='--block_separator') _.set(o, 'block.separator', a[++i]);
  else o.input = a[i];
  return i+1;
};
amazontranslate.options = options;
module.exports = amazontranslate;

// Run on shell.
async function shell(a) {
  var o = {input: await getStdin()};
  for(var i=2, I=a.length; i<I;)
    i = options(o, a[i], a, i);
  if(o.help) return cp.execSync('less README.md', {cwd: __dirname, stdio: STDIO});
  var txt = await amazontranslate(null, null, o);
  console.log(txt);
};
if(require.main===module) shell(process.argv);
