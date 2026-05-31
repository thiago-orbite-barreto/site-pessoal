#!/usr/bin/env python3
"""
Normalize posts in _posts/: ensure `lang`, `ref`, and `permalink` are present.
Usage: python scripts/normalize_posts.py

Behavior:
- Parses each Markdown file in `_posts/` with YAML front matter.
- If missing `lang`, attempts a heuristic language detection (accents + stopwords).
- If missing `ref`, generates one from `title` or filename (slugified).
- If missing `permalink`, generates a permalink:
  - English posts: `/en/YYYY/MM/DD/slug/`
  - Portuguese posts: `/YYYY/MM/DD/slug/`
- Writes updated front matter back to file, preserving existing content.

This script is conservative: it only adds missing keys and avoids reformatting complex YAML values.
"""

import os
import re
import sys
import unicodedata
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSTS_DIR = os.path.join(ROOT, '_posts')

PT_WORDS = [' o ', ' a ', ' de ', ' que ', ' não ', 'é ', ' com ', ' por ', ' para ', 'um ', 'uma ']
EN_WORDS = [' the ', ' and ', ' of ', ' to ', ' is ', ' in ', ' that ', ' a ', ' an ']
ACCENTS = 'áàãâéèêíìîóòõôúùûç'

FRONT_MATTER_RE = re.compile(r'^---\s*\n(.*?)\n---\s*\n', re.S)
KEY_VALUE_RE = re.compile(r'^([A-Za-z0-9_\-]+):\s*(.*)$')


def slugify(text):
    text = str(text)
    text = unicodedata.normalize('NFKD', text)
    text = text.encode('ascii', 'ignore').decode('ascii')
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    text = re.sub(r'\s+', '-', text).strip('-')
    return text or 'post'


def detect_lang(text):
    t = ' ' + text.lower() + ' '
    # quick accent check
    if any(ch in t for ch in ACCENTS):
        return 'pt'
    pt_score = sum(t.count(w) for w in PT_WORDS)
    en_score = sum(t.count(w) for w in EN_WORDS)
    return 'pt' if pt_score >= en_score else 'en'


def parse_front_matter(text):
    m = FRONT_MATTER_RE.match(text)
    if not m:
        return None, text
    fm = m.group(1)
    rest = text[m.end():]
    lines = fm.splitlines()
    data = {}
    raw_lines = []
    for line in lines:
        raw_lines.append(line)
        kv = KEY_VALUE_RE.match(line)
        if kv:
            k = kv.group(1).strip()
            v = kv.group(2).strip()
            # remove surrounding quotes
            if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
                v = v[1:-1]
            data[k] = v
    return data, rest


def build_front_matter(data, original_raw_lines):
    # preserve original order where possible; insert new keys after existing ones
    keys = [line.split(':',1)[0] for line in original_raw_lines if ':' in line]
    used = set()
    out_lines = []
    for k in keys:
        k = k.strip()
        if k in data:
            out_lines.append(f"{k}: {data[k]}")
            used.add(k)
        else:
            # keep original raw line if unknown
            for line in original_raw_lines:
                if line.startswith(k + ':'):
                    out_lines.append(line)
                    break
    # append any remaining keys
    for k, v in data.items():
        if k not in used:
            out_lines.append(f"{k}: {v}")
    return '---\n' + '\n'.join(out_lines) + '\n---\n\n'


def process_post(path):
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()
    fm, body = parse_front_matter(text)
    if fm is None:
        print(f"Skipping (no front matter): {path}")
        return False

    original_fm_block = FRONT_MATTER_RE.match(text).group(1).splitlines()

    changed = False

    title = fm.get('title') or ''
    filename = os.path.basename(path)

    # ensure lang
    if 'lang' not in fm or not fm['lang'].strip():
        # detect from title + body
        sample = (title + '\n' + body[:2000])
        detected = detect_lang(sample)
        fm['lang'] = detected
        print(f"Added lang: {detected} -> {path}")
        changed = True

    # ensure ref
    if 'ref' not in fm or not fm['ref'].strip():
        # prefer explicit slug from title or filename
        base = title or re.sub(r'^\d{4}-\d{2}-\d{2}-', '', filename)
        r = slugify(base)
        fm['ref'] = r
        print(f"Added ref: {r} -> {path}")
        changed = True

    # ensure permalink
    if 'permalink' not in fm or not fm['permalink'].strip():
        # determine date parts
        date_str = fm.get('date') or filename[0:10]
        year = month = day = None
        try:
            dt = datetime.fromisoformat(date_str.strip())
            year = dt.year
            month = f"{dt.month:02d}"
            day = f"{dt.day:02d}"
        except Exception:
            # try parse common Jekyll format
            m = re.match(r'^(\d{4})-(\d{2})-(\d{2})', filename)
            if m:
                year, month, day = m.group(1), m.group(2), m.group(3)
        slug = fm.get('slug') or slugify(title or re.sub(r'^\d{4}-\d{2}-\d{2}-', '', filename))
        if fm.get('lang') == 'en':
            if year and month and day:
                permalink = f"/en/{year}/{month}/{day}/{slug}/"
            else:
                permalink = f"/en/{slug}/"
        else:
            if year and month and day:
                permalink = f"/{year}/{month}/{day}/{slug}/"
            else:
                permalink = f"/{slug}/"
        fm['permalink'] = permalink
        print(f"Added permalink: {permalink} -> {path}")
        changed = True

    if changed:
        new_fm_block = build_front_matter(fm, original_fm_block)
        new_text = new_fm_block + body
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_text)
    return changed


def main():
    if not os.path.isdir(POSTS_DIR):
        print(f"_posts directory not found at {POSTS_DIR}")
        return
    files = [f for f in os.listdir(POSTS_DIR) if f.endswith('.md') or f.endswith('.markdown')]
    if not files:
        print("No posts found")
        return
    changed_any = False
    for fn in files:
        path = os.path.join(POSTS_DIR, fn)
        try:
            changed = process_post(path)
            if changed:
                changed_any = True
        except Exception as e:
            print(f"Error processing {path}: {e}")
    if changed_any:
        print("Normalization complete: some files were modified.")
    else:
        print("All posts already normalized.")


if __name__ == '__main__':
    main()
