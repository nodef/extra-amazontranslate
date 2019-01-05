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
  log: boolean(E['TRANSLATE_LOG']||'0'),
  from: E['TRANSLATE_FROM']||'auto',
  to: E['TRANSLATE_TO']||'en',
  config: {
    endpoint: E['AWS_TRANSLATE_ENDPOINT']||E['AWS_ENDPOINT'],
    accessKeyId: E['AWS_TRANSLATE_ACCESSKEYID']||E['AWS_ACCESSKEYID'],
    secretAccessKey: E['AWS_TRANSLATE_SECRETACCESSKEY']||E['AWS_SECRETACCESSKEY'],
    region: E['AWS_TRANSLATE_REGION']||E['AWS_REGION'],
    maxRetries: parseInt(E['AWS_TRANSLATE_MAXRETRIES']||E['AWS_MAXRETRIES']||'0', 10),
    maxRedirects: parseInt(E['AWS_TRANSLATE_MAXREDIRECTS']||E['AWS_MAXREDIRECTS'])
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

// Get text blocks.
function blocks(txt, siz=2500, sep=' ') {
  for(var i=0, I=txt.length, z=[]; i<I; i=e) {
    var e = txt.lastIndexOf(sep, i+siz);
    z.push(txt.substring(i, e=e>i? e:i+siz));
  }
  return z;
};

// Translate text.
function translate(aws, txt, o) {
  var params = {Text: txt, SourceLanguageCode: o.from||'auto', TargetLanguageCode: o.to||'en'};
  return new Promise((fres, frej) => aws.translateText(params, (err, data) => {
    return err? frej(err):fres(data.TranslatedText);
  }));
};

/**
 * Translate long text from one language to another (via "Amazon Translate").
 * @param {string} text Input text to be translated.
 * @param {object} [options] Translation and config options.
 * @returns {Promise<string>} Translated text.
 */
async function amazontranslate(text, options) {
  var o = Object.assign({}, OPTIONS, options);
  var aws = new Translate();
  return (await Promise.all(blocks(text).map(b => translate(aws, b, o)))).join('');
};


// Get options from arguments.
function options(o, k, a, i) {
  if(k==='--help') o.help = true;
  else if(k==='-l' || k==='--log') o.log = true;
  else if(k==='-o' || k==='--output') o.output= a[++i];
  else if(k==='-t' || k==='--text') o.text = a[++i];
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
