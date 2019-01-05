#!/usr/bin/env node
const Translate = require('aws-sdk/clients/translate');
const randomItem = require('random-item');
const getStdin = require('get-stdin');
const iso6391 = require('iso-639-1');
const boolean = require('boolean');
const got = require('got');
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
  lambda: boolean(E['TRANSLATE_LAMBDA']||'1'),
  block: {
    separator: E['TRANSLATE_BLOCK_SEPARATOR']||'.',
    length: parseInt(E['TRANSLATE_BLOCK_LENGTH']||'2000', 10)
  }
};
const LAMBDA_URL = 'https://wp2fp09iva.execute-api.us-east-1.amazonaws.com/default/api-amazontranslate';


// Load config from path.
function configLoad(pth) {
  var dat = fs.readFileSync(pth, 'utf8');
  if(pth.endsWith('.json')) return JSON.parse(dat);
  var cfg = ini.parse(dat), z = {};
  cfg = cfg.default||cfg;
  for(var k in cfg)
    z[_.camelCase(k.replace(/^aws_/, ''))] = cfg[k];
  return z;
};

// Get text blocks.
function blocks(txt, siz=2500, sep='.') {
  for(var i=0, I=txt.length, z=[]; i<I; i=e) {
    var e = txt.lastIndexOf(sep, i+siz);
    z.push(txt.substring(i, e=e>i? e:i+siz));
  }
  return z;
};

// Translate text.
async function translate(aws, txt, o) {
  var params = {Text: txt, SourceLanguageCode: o.from||'auto', TargetLanguageCode: o.to||'en'};
  if(o.lambda) {
    var res = await got(LAMBDA_URL, {body: JSON.stringify({method: 'translateText', params})});
    return JSON.parse(res.body).data.TranslatedText;
  }
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
  var aws = new Translate(), z = '';
  for(var blk of blocks(text))
    z += (await translate(aws, blk, o));
  return z;
};


// Get options from arguments.
function options(o, k, a, i) {
  if(k==='--help') o.help = true;
  else if(k==='-l' || k==='--log') o.log = true;
  else if(k==='-o' || k==='--output') o.output= a[++i];
  else if(k==='-t' || k==='--text') o.text = a[++i];
  else if(k==='--from') o.from = a[++i];
  else if(k==='--to') o.to = a[++i];
  else if(k.startsWith('--block_')) _.set(o, 'block.'+k.substring(8), a[++i]);
  else if(k.startsWith('--config_')) _.set(o, 'config.'+_.camelCase(k.substring(9)), a[++i]);
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
  if(o.config && o.config.file) o.config = Object.assign({}, configLoad(o.config.file), o.config);
  var txt = o.text? fs.readFileSync(o.text, 'utf8'):o.input||'';
  var out = await amazontranslate(txt, o);
  if(o.output) fs.writeFileSync(o.output, out);
  else console.log(out);
};
if(require.main===module) shell(process.argv);
