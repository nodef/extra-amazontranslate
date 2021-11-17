#!/usr/bin/env node
const cp = require('child_process');
const fs = require('fs');
const _         = require('lodash');
const boolean   = require('boolean').boolean;
const AWS       = require('aws-sdk');
const awsconfig = require('extra-awsconfig');
var iso6391  = null;
var getStdin = null;
var got      = null;




// Global variables
const E       = process.env;
const STDIO   = [0, 1, 2];
const OPTIONS = {
  log:      boolean(E['TRANSLATE_LOG']     || '0'),
  retries: parseInt(E['TRANSLATE_RETRIES'] || '8', 10),
  source: E['TRANSLATE_SOURCE'] || 'auto',
  target: E['TRANSLATE_TARGET'] || 'en',
  service: {
    url:  E['TRANSLATE_SERVICE_URL'] || null
  },
  block: {
    separator:       E['TRANSLATE_BLOCK_SEPARATOR'] || '.',
    length: parseInt(E['TRANSLATE_BLOCK_LENGTH']    || '2500', 10)
  },
  config: null
};




// ES modules dependency loader :).
async function importDependencies() {
  if (iso6391!=null) return;
  var $ = await Promise.all([
    import('iso-639-1'),
    import('get-stdin'),
    import('got')
  ]);
  iso6391  = $[0].default;
  getStdin = $[1].default;
  got      = $[2].default;
}




// Shorten text.
function shorten(txt, len=50) {
  return txt.length>len? txt.substring(0, len-4)+' ...':txt;
}

// Get text split by topics.
function splitTopic(txt, z=[]) {
  var re = /(\s*)(=+)(\s*)(.*?)\3\2(\s*\r?\n)/g;
  for(var m=null, mi=0; (m=re.exec(txt))!=null;) {
    z.push(txt.substring(mi, m.index), m[1]+m[2]+m[3], m[4], m[3]+m[2]+m[5]);
    mi = m.index+m[0].length;
  }
  if(mi<txt.length) z.push(txt.substring(mi));
  return z;
}

// Get text split by blocks.
function splitBlock(txt, siz, sep, z=[]) {
  if(txt.length<siz) { z.push(txt); return z; }
  for(;txt;) {
    var i = txt.lastIndexOf(sep, siz);
    if(i<0) z.push(txt.substring(0, siz), '');
    else    z.push(txt.substring(0, i), sep);
    txt = txt.substring(i<0? siz:i+1);
  }
  z.push('');
  return z;
}

// Get text split.
function split(txt, siz=2500, sep='.', z=[]) {
  var tops = splitTopic(txt);
  for(var i=0, I=tops.length; i<I; i+=2) {
    splitBlock(tops[i], siz, sep, z);
    z.push(tops[i+1]||'');
  }
  return z;
}




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
}

// Translate text with retries.
async function translateRetry(aws, txt, id, o) {
  for(var i=0, I=o.retries||8, err=null; i<I; i++) {
    try {
      var z = await translate(aws, txt, o);
      if(o.log) console.log('-translateRetry', id, shorten(txt));
      return z;
    }
    catch(e) { err = e; }
  }
  throw err;
}

// Get language code from name.
function langCode(nam) {
  return nam!=='auto' && !iso6391.validate(nam)? iso6391.getCode(nam):nam;
}




/**
 * Translate long text from one language to another (via "Amazon Translate").
 * @param {string} txt Input text to be translated.
 * @param {object} [o] Translation and config options.
 * @returns {Promise<string>} Translated text.
 */
async function amazontranslate(txt, o) {
  await importDependencies();
  var o = _.merge({}, OPTIONS, o), z=[];
  o.source = langCode(o.source); o.target = langCode(o.target);
  var aws  = new AWS.Translate(awsconfig(o.config)), txts=[];
  split(txt, o.block.length, o.block.separator, txts);
  if(o.log) console.log('@amazontranslate:', Math.floor(txts.length/2), shorten(txt));
  for(var i=0, I=txts.length; i<I; i+=2) {
    if(txts[i])   z.push(translateRetry(aws, txts[i], i/2, o));
    if(txts[i+1]) z.push(txts[i+1]);
  }
  return (await Promise.all(z)).join('');
}

// Get options from arguments.
function options(o, k, a, i) {
  o.config = o.config||{};
  var e = k.indexOf('='), v = null, bool = () => true,       str = () => a[++i];
  if(e>=0) { v = k.substring(e+1);  bool = () => boolean(v); str = () => v; k = k.substring(o, e); }
  if(k==='--help') o.help = bool();
  else if(k==='-l'  || k==='--log')     o.log     = bool();
  else if(k==='-o'  || k==='--output')  o.output  = str();
  else if(k==='-t'  || k==='--text')    o.text    = str();
  else if(k==='-r'  || k==='--retries') o.retries = parseInt(str(), 10);
  else if(k==='-os' || k==='--source')  o.source  = str();
  else if(k==='-ot' || k==='--target')  o.target  = str();
  else if(k==='-bs' || k==='--block_separator') _.set(o, 'block.separator', str());
  else if(k==='-bl' || k==='--block_length')    _.set(o, 'block.length',    parseInt(str(), 10));
  else if(k==='-su' || k==='--service_url')     _.set(o, 'service.url',     str());
  else if(k.startsWith('-c'))        return awsconfig.options(o.config,  '-'+k.substring(2), a, i);
  else if(k.startsWith('--config_')) return awsconfig.options(o.config, '--'+k.substring(9), a, i);
  else o.argv = a[i];
  return i+1;
}
amazontranslate.options = options;
module.exports = amazontranslate;


// Run on shell.
async function shell(a) {
  await importDependencies();
  var o = {argv: await getStdin()};
  for(var i=2, I=a.length; i<I;)
    i = options(o, a[i], a, i);
  if(o.help) return cp.execSync('less README.md', {cwd: __dirname, stdio: STDIO});
  try {
    var txt = o.text? fs.readFileSync(o.text, 'utf8'):o.argv||'';
    var out = await amazontranslate(txt, o);
    if(o.output) fs.writeFileSync(o.output, out);
    else console.log(out);
  }
  catch(err) { console.error(err.message); }
}
if(require.main===module) shell(process.argv);
