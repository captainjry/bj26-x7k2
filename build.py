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
# Cover photo per day (Wikimedia Commons; credit fields shown on the Credits screen).
COVERS = {
    "2026-12-07": {"file": "img/cover-2026-12-07.webp", "w": 960, "h": 1200, "thumb": "img/cover-2026-12-07-sq.webp", "alt": "Tiananmen Gate at dusk", "title": "File:天安门夜景.jpg", "author": "Charlie fong冯成", "license": "Public domain", "license_url": "https://commons.wikimedia.org/wiki/File:%E5%A4%A9%E5%AE%89%E9%97%A8%E5%A4%9C%E6%99%AF.jpg", "source": "https://commons.wikimedia.org/wiki/File:%E5%A4%A9%E5%AE%89%E9%97%A8%E5%A4%9C%E6%99%AF.jpg"},
    "2026-12-08": {"file": "img/cover-2026-12-08.webp", "w": 960, "h": 1200, "thumb": "img/cover-2026-12-08-sq.webp", "alt": "Universal globe at Universal Beijing Resort", "title": "File:Universal Studios Beijing globe square (20210907121340).jpg", "author": "N509FZ", "license": "CC BY-SA 4.0", "license_url": "https://creativecommons.org/licenses/by-sa/4.0", "source": "https://commons.wikimedia.org/wiki/File:Universal_Studios_Beijing_globe_square_(20210907121340).jpg"},
    "2026-12-09": {"file": "img/cover-2026-12-09.webp", "w": 960, "h": 1200, "thumb": "img/cover-2026-12-09-sq.webp", "alt": "Fuxing high-speed train on the Beijing-Zhangjiakou line in winter", "title": "File:CR400BF-G-5172 at Chengjiayao (20220110134038).jpg", "author": "N509FZ", "license": "CC BY-SA 4.0", "license_url": "https://creativecommons.org/licenses/by-sa/4.0", "source": "https://commons.wikimedia.org/wiki/File:CR400BF-G-5172_at_Chengjiayao_(20220110134038).jpg"},
    "2026-12-10": {"file": "img/cover-2026-12-10.webp", "w": 960, "h": 1200, "thumb": "img/cover-2026-12-10-sq.webp", "alt": "Chairlift over snowy slopes at Wanlong ski resort, Chongli", "title": "File:万龙雪场 - panoramio.jpg", "author": "黑夜有灯", "license": "CC BY 3.0", "license_url": "https://creativecommons.org/licenses/by/3.0", "source": "https://commons.wikimedia.org/wiki/File:%E4%B8%87%E9%BE%99%E9%9B%AA%E5%9C%BA_-_panoramio.jpg"},
    "2026-12-11": {"file": "img/cover-2026-12-11.webp", "w": 960, "h": 1200, "thumb": "img/cover-2026-12-11-sq.webp", "alt": "Snowboarder in deep powder", "title": "File:Ebbetts Pass Scenic Byway - Carving through Powder - NARA - 7718123.jpg", "author": "Unknown author (US National Archives)", "license": "Public domain", "license_url": "https://commons.wikimedia.org/wiki/File:Ebbetts_Pass_Scenic_Byway_-_Carving_through_Powder_-_NARA_-_7718123.jpg", "source": "https://commons.wikimedia.org/wiki/File:Ebbetts_Pass_Scenic_Byway_-_Carving_through_Powder_-_NARA_-_7718123.jpg", "standin": "Ebbetts Pass, USA, not Chongli"},
    "2026-12-12": {"file": "img/cover-2026-12-12.webp", "w": 960, "h": 1200, "thumb": "img/cover-2026-12-12-sq.webp", "alt": "The Great Wall under snow", "title": "File:Badaling Great Wall (South) in snow 20261108 02.jpg", "author": "Steven Sun", "license": "CC BY-SA 4.0", "license_url": "https://creativecommons.org/licenses/by-sa/4.0", "source": "https://commons.wikimedia.org/wiki/File:Badaling_Great_Wall_(South)_in_snow_20261108_02.jpg", "standin": "Badaling section, not Mutianyu"},
    "2026-12-13": {"file": "img/cover-2026-12-13.webp", "w": 960, "h": 1200, "thumb": "img/cover-2026-12-13-sq.webp", "alt": "The Forbidden City under snow, seen from Jingshan", "title": "File:Forbidden City after snow (20200106114634).jpg", "author": "N509FZ", "license": "CC BY-SA 4.0", "license_url": "https://creativecommons.org/licenses/by-sa/4.0", "source": "https://commons.wikimedia.org/wiki/File:Forbidden_City_after_snow_(20200106114634).jpg"},
    "2026-12-14": {"file": "img/cover-2026-12-14.webp", "w": 960, "h": 1200, "thumb": "img/cover-2026-12-14-sq.webp", "alt": "Hall of Prayer at the Temple of Heaven after snow", "title": "File:·˙·ChinaUli2010·.· Beijing - Snow at the Temple of Heaven - panoramio.jpg", "author": "·˙·ChinaUli2010·.·", "license": "CC BY 3.0", "license_url": "https://creativecommons.org/licenses/by/3.0", "source": "https://commons.wikimedia.org/wiki/File:%C2%B7%CB%99%C2%B7ChinaUli2010%C2%B7.%C2%B7_Beijing_-_Snow_at_the_Temple_of_Heaven_-_panoramio.jpg"},
}
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
        day = {'date': date, 'label': label, 'items': items}
        if date in COVERS:
            day['cover'] = COVERS[date]
        else:
            print(f'WARN {date}: no cover photo in COVERS')
        days.append(day)

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
