#!/usr/bin/env node
const awsconfig = require('extra-awsconfig');
const getStdin = require('get-stdin');
const iso6391 = require('iso-639-1').default;
const boolean = require('boolean');
const AWS = require('aws-sdk');
const got = require('got');
const _ = require('lodash');
const cp = require('child_process');
const fs = require('fs');


// Global variables
const E = process.env;
const STDIO = [0, 1, 2];
const OPTIONS = {
  log: boolean(E['TRANSLATE_LOG']||'0'),
  retries: parseInt(E['TRANSLATE_RETRIES']||'8', 10),
  service: E['TRANSLATE_SERVICE']||null,
  from: E['TRANSLATE_FROM']||'auto',
  to: E['TRANSLATE_TO']||'en',
  separator: E['TRANSLATE_SEPARATOR']||'.'
};
const RTOPIC = /(=+)([\w\s]+)\1\r?\n/;


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
  if(o.service) {
    var res = await got(o.service, {body: JSON.stringify({method: 'translateText', params})});
    return JSON.parse(res.body).data.TranslatedText;
  }
  return new Promise((fres, frej) => aws.translateText(params, (err, data) => {
    return err? frej(err):fres(data.TranslatedText);
  }));
};

// Translate text with retries.
async function translateRetry(aws, txt, o) {
  for(var i=0, I=o.retries||8, err=null; i<I; i++) {
    try { return translate(aws, txt, o); }
    catch(e) { err = e; }
  }
  throw err;
};


/**
 * Translate long text from one language to another (via "Amazon Translate").
 * @param {string} text Input text to be translated.
 * @param {object} [options] Translation and config options.
 * @returns {Promise<string>} Translated text.
 */
async function amazontranslate(text, options) {
  var o = Object.assign({}, OPTIONS, options);
  var aws = new AWS.Translate(o.config), z = '';
  for(var i=0, I=txt.length; i<I; i=e) {

  }
  for(var blk of blocks(text))
    z += (await translate(aws, blk, o));
  return z;
};

// Get options from arguments.
function options(o, k, a, i) {
  o.config = o.config||{};
  if(k==='--help') o.help = true;
  else if(k==='-l' || k==='--log') o.log = true;
  else if(k==='-o' || k==='--output') o.output= a[++i];
  else if(k==='-t' || k==='--text') o.text = a[++i];
  else if(k==='-r' || k==='--retries') o.retries = parseInt(a[++i], 10);
  else if(k==='-s' || k==='--service') o.service = a[++i];
  else if(k==='-tf' || k==='--from') o.from = a[++i];
  else if(k==='-tt' || k==='--to') o.to = a[++i];
  else if(k==='-ts' || k==='--separator') o.separator = a[++i];
  else if(k.startsWith('-c')) return awsconfig.options(o.config, '-'+k.substring(2), a, i);
  else if(k.startsWith('--config_')) return awsconfig.options(o.config, '--'+k.substring(9), a, i);
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
  if(o.from!=='auto' && !iso6391.validate(o.from)) o.from = iso6391.getCode(o.from);
  if(!iso6391.validate(o.to)) o.to = iso6391.getCode(o.to);
  var txt = o.text? fs.readFileSync(o.text, 'utf8'):o.input||'';
  var out = await amazontranslate(txt, o);
  if(o.output) fs.writeFileSync(o.output, out);
  else console.log(out);
};
if(require.main===module) shell(process.argv);
