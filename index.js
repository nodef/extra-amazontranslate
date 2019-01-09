#!/usr/bin/env node
const iso6391 = require('iso-639-1').default;
const awsconfig = require('extra-awsconfig');
const AWS = require('aws-sdk');
const got = require('got');
const getStdin = require('get-stdin');
const boolean = require('boolean');
const _ = require('lodash');
const cp = require('child_process');
const fs = require('fs');


// Global variables
const E = process.env;
const STDIO = [0, 1, 2];
const OPTIONS = {
  log: boolean(E['TRANSLATE_LOG']||'0'),
  retries: parseInt(E['TRANSLATE_RETRIES']||'8', 10),
  source: E['TRANSLATE_SOURCE']||'auto',
  target: E['TRANSLATE_TARGET']||'en',
  service: {
    url: E['TRANSLATE_SERVICE_URL']||null
  },
  block: {
    separator: E['TRANSLATE_BLOCK_SEPARATOR']||'.',
    length: parseInt(E['TRANSLATE_BLOCK_LENGTH']||'2500', 10)
  },
  config: null
};


// Get text blocks.
function blocks(txt, siz=2500, sep='.') {
  for(var i=0, I=txt.length, z=[]; i<I; i=e) {
    var e = txt.lastIndexOf(sep, i+siz);
    z.push(txt.substring(i, e=e>i? e:i+siz));
  }
  return z;
};

// Get text split by topics.
function splitTopic(txt, z=[]) {
  var re = /(\s*)(=+)([\w\s]+)\2(\s*\r?\n)/g;
  for(var m=null, mi=0; (m=re.exec(txt))!=null;) {
    z.push(txt.substring(mi, m.index), m[1]+m[2], m[3], m[2]+m[4]);
    mi = m.index+m[0].length;
  }
  if(mi<txt.length) a.push(txt.substring(mi));
  return z;
};

// Get text split by blocks.
function splitBlock(txt, siz, sep, z=[]) {
  for(;txt;) {
    var i = txt.lastIndexOf(sep, siz);
    if(i<0) z.push(txt.substring(0, siz), '');
    else z.push(txt.substring(0, i), sep);
  }
  if(z.length&1===0) z.push('');
  return z;
};

// Get text split.
function split(txt, siz=2500, sep='.', z=[]) {
  var tops = splitTopic(txt);
  for(var i=0, I=tops.length; i<I; i+=2) {
    splitBlock(tops[i], siz, sep, z);
    z.push(tops[i+1]||'');
  }
  return z;
};

// Translate text.
async function translate(aws, txt, o) {
  var params = {Text: txt, SourceLanguageCode: o.source||'auto', TargetLanguageCode: o.target||'en'};
  if(o.service.url) {
    var res = await got(o.service.url, {body: JSON.stringify({method: 'translateText', params})});
    return JSON.parse(res.body).data.TranslatedText;
  }
  return new Promise((fres, frej) => aws.translateText(params, (err, data) => {
    return err? frej(err):fres(data.TranslatedText);
  }));
};

// Translate text with retries.
async function translateRetry(aws, txt, o) {
  for(var i=0, I=o.retries||8, err=null; i<I; i++) {
    try { return await translate(aws, txt, o); }
    catch(e) { err = e; }
  }
  throw err;
};

// Get language code from name.
function langCode(nam) {
  return nam!=='auto' && !iso6391.validate(nam)? iso6391.getCode(nam):nam;
};

/**
 * Translate long text from one language to another (via "Amazon Translate").
 * @param {string} txt Input text to be translated.
 * @param {object} [o] Translation and config options.
 * @returns {Promise<string>} Translated text.
 */
async function amazontranslate(txt, o) {
  var o = _.merge({}, OPTIONS, o), z='';
  var aws = new AWS.Translate(o.config), txts=[];
  o.source = langCode(o.source); o.target = langCode(o.target);
  split(txt, o.block.length, o.block.separator, txts);
  for(var i=0, I=txts.length; i<I; i+=2) {
    z += txts[i]? await translateRetry(aws, txts[i], o):z;
    z += txts[i+1]||'';
  }
  return z;
};

// Get options from arguments.
function options(o, k, a, i) {
  o.config = o.config||{};
  var e = k.indexOf('='), v = null, bool = () => true, str = () => a[++i];
  if(e>=0) { v = k.substring(e+1); bool = () => boolean(v); str = () => v; k = k.substring(o, e); }
  if(k==='--help') o.help = bool();
  else if(k==='-l' || k==='--log') o.log = bool();
  else if(k==='-o' || k==='--output') o.output= str();
  else if(k==='-t' || k==='--text') o.text = str();
  else if(k==='-r' || k==='--retries') o.retries = parseInt(str(), 10);
  else if(k==='-os' || k==='--source') o.source = str();
  else if(k==='-ot' || k==='--to') o.target = str();
  else if(k==='-bs' || k==='--block_separator') _.set(o, 'block.separator', str());
  else if(k==='-bl' || k==='--block_length') _.set(o, 'block.length', parseInt(str(), 10));
  else if(k==='-su' || k==='--service_url') _.set(o, 'service.url', str());
  else if(k.startsWith('-c')) return awsconfig.options(o.config, '-'+k.substring(2), a, i);
  else if(k.startsWith('--config_')) return awsconfig.options(o.config, '--'+k.substring(9), a, i);
  else o.argv = a[i];
  return i+1;
};
amazontranslate.options = options;
module.exports = amazontranslate;


// Run on shell.
async function shell(a) {
  var o = {argv: await getStdin()};
  for(var i=2, I=a.length; i<I;)
    i = options(o, a[i], a, i);
  if(o.help) return cp.execSync('less README.md', {cwd: __dirname, stdio: STDIO});
  var txt = o.text? fs.readFileSync(o.text, 'utf8'):o.argv||'';
  var out = await amazontranslate(txt, o);
  if(o.output) fs.writeFileSync(o.output, out);
  else console.log(out);
};
if(require.main===module) shell(process.argv);
