"""Build site/trip.json from tab 'A - as planned' of the trip workbook.

Usage: python -I build.py "C:\\Users\\capta\\Desktop\\Beijing Trip Dec26.xlsx"
"""
import json
import re
import sys
from datetime import datetime
from pathlib import Path

import openpyxl

sys.stdout.reconfigure(encoding='utf-8')

HERE = Path(__file__).resolve().parent
SHEET = 'A - as planned'
YEAR = 2026
TRIP = {'title': 'Beijing & Chongli', 'start': '2026-12-07', 'end': '2026-12-14', 'tz': 'Asia/Shanghai'}
HOTELS = [
    {'place': 'crystal-orange', 'from': '2026-12-07', 'to': '2026-12-09'},
    {'place': 'thaiwoo-nanshanli', 'from': '2026-12-09', 'to': '2026-12-11'},
    {'place': 'crystal-orange', 'from': '2026-12-11', 'to': '2026-12-14'},
]
LEGEND_TAGS = {'จอง': 'book', 'อาหาร': 'food', 'Cafe': 'cafe', 'ไม่ต้องจอง': 'free', 'เดินทาง': 'travel'}
NO_LOCATION = {'ski day', 'check out'}
CJK = re.compile(r'[\u3000-\u303f\u3400-\u9fff\uf900-\ufaff\uff00-\uffef]')


def fill_hex(cell):
    """'#RRGGBB' of a solid rgb fill, else None (theme/indexed fills are not used in this sheet)."""
    if cell.fill.fill_type != 'solid':
        return None
    fg = cell.fill.fgColor
    if fg.type != 'rgb' or not isinstance(fg.rgb, str):
        print(f'WARN {cell.coordinate}: non-rgb fill ({fg.type}), ignored')
        return None
    return '#' + fg.rgb[-6:].upper()


def normalise(text):
    return ' '.join(text.split()).lower()


def clean_text(value):
    lines = str(value).split('\n')
    stripped = [line.rstrip() for line in lines]
    return '\n'.join(stripped).rstrip()


def clean_note(comment):
    text = comment.text
    author = comment.author or ''
    if author and text.startswith(author + ':'):
        text = text[len(author) + 1:]
    return text.strip()


def find_place(text, places):
    """Place id whose longest match substring occurs in text, else None."""
    haystack = normalise(text)
    best_id = None
    best_len = 0
    for place_id, place in places.items():
        for needle in place['match']:
            n = normalise(needle)
            if n in haystack and len(n) > best_len:
                best_id = place_id
                best_len = len(n)
    return best_id


def read_tags(ws):
    tags = {}
    colour_to_tag = {}
    for row in ws.iter_rows(max_col=2):
        swatch, label_cell = row[0], row[1]
        label = label_cell.value
        if label not in LEGEND_TAGS:
            continue
        tag = LEGEND_TAGS[label]
        colour = fill_hex(swatch)
        tags[tag] = {'label': label, 'color': colour}
        colour_to_tag[colour] = tag
    missing = set(LEGEND_TAGS.values()) - set(tags)
    if missing:
        sys.exit(f'ERROR legend tags not found: {sorted(missing)}')
    return tags, colour_to_tag


def build(xlsx_path):
    places = json.loads((HERE / 'places.json').read_text(encoding='utf-8'))
    wb = openpyxl.load_workbook(xlsx_path)
    ws = wb[SHEET]
    tags, colour_to_tag = read_tags(ws)

    day_cols = [c for c in range(2, ws.max_column + 1) if ws.cell(1, c).value]
    hour_rows = [r for r in range(3, ws.max_row + 1) if isinstance(ws.cell(r, 1).value, (int, float))]

    unknown_empty = 0
    days = []
    for col in day_cols:
        date = datetime.strptime(f'{ws.cell(1, col).value} {YEAR}', '%d %B %Y').strftime('%Y-%m-%d')
        label = ws.cell(2, col).value
        items = []
        for row in hour_rows:
            cell = ws.cell(row, col)
            colour = fill_hex(cell)
            if cell.value is None:
                if colour and colour not in colour_to_tag:
                    unknown_empty += 1
                continue
            text = clean_text(cell.value)
            time = f'{int(ws.cell(row, 1).value):02d}:00'
            item = {'time': time, 'text': text}

            if colour:
                tag = colour_to_tag.get(colour)
                if tag:
                    item['tag'] = tag
                else:
                    print(f'WARN {cell.coordinate} {text!r}: fill {colour} matches no legend colour')

            place_id = find_place(text, places)
            if place_id:
                item['place'] = place_id
            elif normalise(text) not in NO_LOCATION:
                print(f'WARN {cell.coordinate} {text!r}: no place in places.json')

            note = None
            if place_id and 'note_en' in places[place_id]:
                note = places[place_id]['note_en']
            elif cell.comment:
                note = clean_note(cell.comment)
            if note and CJK.search(note):
                print(f'WARN {cell.coordinate}: note has Chinese, add note_en to its place; stripped for now')
                note = ' '.join(CJK.sub('', note).split())
            if note:
                item['note'] = note

            items.append(item)
        days.append({'date': date, 'label': label, 'items': items})

    if unknown_empty:
        print(f'INFO {unknown_empty} empty grid cells have a fill matching no legend colour (ignored)')

    used = {item['place'] for day in days for item in day['items'] if 'place' in item}
    used |= {h['place'] for h in HOTELS}
    out_places = {}
    for place_id in places:
        if place_id not in used:
            print(f'INFO place {place_id!r} not used by any cell, left out')
            continue
        entry = {k: v for k, v in places[place_id].items() if k not in ('match', 'note_en')}
        out_places[place_id] = entry

    trip = {'trip': TRIP, 'tags': tags, 'places': out_places, 'hotels': HOTELS, 'days': days}
    out_path = HERE / 'site' / 'trip.json'
    out_path.parent.mkdir(exist_ok=True)
    out_path.write_text(json.dumps(trip, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    counts = ', '.join(f"{d['date'][-2:]}:{len(d['items'])}" for d in days)
    print(f'Wrote {out_path} - {len(days)} days, items per day {counts}')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    build(sys.argv[1])
