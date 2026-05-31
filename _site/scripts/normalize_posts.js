#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');
const POSTS_DIR = path.join(process.cwd(), '_posts');

const PT_WORDS = [' o ', ' a ', ' de ', ' que ', ' não ', 'é ', ' com ', ' por ', ' para ', 'um ', 'uma '];
const EN_WORDS = [' the ', ' and ', ' of ', ' to ', ' is ', ' in ', ' that ', ' a ', ' an '];
const ACCENTS_RE = /[áàãâéèêíìîóòõôúùûçÁÀÃÂÉÈÊÍÌÎÓÒÕÔÚÙÛÇ]/;

const FRONT_MATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*\n/;
const KEY_VALUE_RE = /^([A-Za-z0-9_\-]+):\s*(.*)$/;

function slugify(text){
  if(!text) return 'post';
  const normalized = text.normalize('NFKD').replace(/\p{Diacritic}/gu, '');
  return normalized
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function detectLang(sample){
  const t = (' ' + (sample || '').toLowerCase() + ' ');
  if(ACCENTS_RE.test(sample)) return 'pt';
  const ptScore = PT_WORDS.reduce((s,w)=>s + (t.split(w).length -1), 0);
  const enScore = EN_WORDS.reduce((s,w)=>s + (t.split(w).length -1), 0);
  return ptScore >= enScore ? 'pt' : 'en';
}

function parseFrontMatter(text){
  const m = FRONT_MATTER_RE.exec(text);
  if(!m) return {fm: null, rawLines: [], body: text};
  const fmBlock = m[1];
  const rest = text.slice(m[0].length);
  const lines = fmBlock.split(/\r?\n/);
  const data = {};
  for(const line of lines){
    const kv = KEY_VALUE_RE.exec(line);
    if(kv){
      let k = kv[1].trim();
      let v = kv[2].trim();
      if((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))){
        v = v.slice(1,-1);
      }
      data[k] = v;
    }
  }
  return {fm: data, rawLines: lines, body: rest};
}

function buildFrontMatter(data, originalRawLines){
  const keysInOrder = [];
  for(const line of originalRawLines){
    const idx = line.indexOf(':');
    if(idx !== -1){
      keysInOrder.push(line.slice(0, idx).trim());
    }
  }
  const used = new Set();
  const out = [];
  for(const k of keysInOrder){
    if(k in data){
      out.push(`${k}: ${data[k]}`);
      used.add(k);
    } else {
      // keep original raw line
      for(const line of originalRawLines){
        if(line.startsWith(k + ':')){ out.push(line); break; }
      }
    }
  }
  for(const k of Object.keys(data)){
    if(!used.has(k)) out.push(`${k}: ${data[k]}`);
  }
  return '---\n' + out.join('\n') + '\n---\n\n';
}

async function processPost(filePath){
  const filename = path.basename(filePath);
  let text = await fs.readFile(filePath, 'utf8');
  const {fm, rawLines, body} = parseFrontMatter(text);
  if(!fm){
    console.log(`Skipping (no front matter): ${filePath}`);
    return false;
  }
  let changed = false;

  const title = fm.title || '';

  if(!fm.lang || !fm.lang.trim()){
    const sample = (title + '\n' + body.slice(0,2000));
    const detected = detectLang(sample);
    fm.lang = detected;
    console.log(`Added lang: ${detected} -> ${filePath}`);
    changed = true;
  }

  if(!fm.ref || !fm.ref.trim()){
    const base = title || filename.replace(/^\d{4}-\d{2}-\d{2}-/, '');
    const r = slugify(base);
    fm.ref = r;
    console.log(`Added ref: ${r} -> ${filePath}`);
    changed = true;
  }

  if(!fm.permalink || !fm.permalink.trim()){
    let year, month, day;
    const dateStr = fm.date || filename.slice(0,10);
    const d = new Date(dateStr);
    if(!isNaN(d.getTime())){
      year = d.getFullYear();
      month = String(d.getMonth()+1).padStart(2,'0');
      day = String(d.getDate()).padStart(2,'0');
    } else {
      const m = filename.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if(m){ year = m[1]; month = m[2]; day = m[3]; }
    }
    const slug = fm.slug || slugify(title || filename.replace(/^\d{4}-\d{2}-\d{2}-/, ''));
    let permalink;
    if(fm.lang === 'en'){
      if(year && month && day) permalink = `/en/${year}/${month}/${day}/${slug}/`;
      else permalink = `/en/${slug}/`;
    } else {
      if(year && month && day) permalink = `/${year}/${month}/${day}/${slug}/`;
      else permalink = `/${slug}/`;
    }
    fm.permalink = permalink;
    console.log(`Added permalink: ${permalink} -> ${filePath}`);
    changed = true;
  }

  if(changed){
    const newFm = buildFrontMatter(fm, rawLines);
    const newText = newFm + body;
    await fs.writeFile(filePath, newText, 'utf8');
  }
  return changed;
}

async function main(){
  try{
    const stat = await fs.stat(POSTS_DIR);
    if(!stat.isDirectory()){
      console.error(`_posts is not a directory: ${POSTS_DIR}`);
      return;
    }
  }catch(e){
    console.error(`_posts directory not found at ${POSTS_DIR}`);
    return;
  }
  const entries = await fs.readdir(POSTS_DIR);
  const files = entries.filter(f => f.endsWith('.md') || f.endsWith('.markdown'));
  if(files.length === 0){ console.log('No posts found'); return; }
  let changedAny = false;
  for(const fn of files){
    const p = path.join(POSTS_DIR, fn);
    try{
      const changed = await processPost(p);
      if(changed) changedAny = true;
    }catch(err){
      console.error(`Error processing ${p}: ${err}`);
    }
  }
  if(changedAny) console.log('Normalization complete: some files were modified.');
  else console.log('All posts already normalized.');
}

if(require.main === module){
  main();
}
