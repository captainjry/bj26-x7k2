"""Check site/trip.json. Run: python -I test_build.py (after build.py)."""
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

HERE = Path(__file__).resolve().parent
CJK = re.compile(r'[　-〿㐀-鿿豈-﫿＀-￯]')
trip = json.loads((HERE / 'site' / 'trip.json').read_text(encoding='utf-8'))

dates = [d['date'] for d in trip['days']]
assert dates == [f'2026-12-{n:02d}' for n in range(7, 15)], dates
assert set(trip['tags']) == {'book', 'food', 'cafe', 'free', 'travel'}
for tag in trip['tags'].values():
    assert re.fullmatch(r'#[0-9A-F]{6}', tag['color']), tag

for day in trip['days']:
    assert day['items'], day['date']
    for item in day['items']:
        assert re.fullmatch(r'\d\d:00', item['time']), item
        assert item.get('tag', 'book') in trip['tags'], item
        assert item.get('place', 'crystal-orange') in trip['places'], item
        assert not CJK.search(item.get('note', '')), item

for place_id, place in trip['places'].items():
    assert place['name'] and place['name_zh'] and place['address_zh'], place_id
    assert place['city_zh'] in ('北京', '张家口'), place_id
    assert not CJK.search(place['name']), place_id
    assert 'match' not in place and 'note_en' not in place, place_id

assert [h['place'] for h in trip['hotels']] == ['crystal-orange', 'thaiwoo-nanshanli', 'crystal-orange']
for hotel in trip['hotels']:
    assert trip['places'][hotel['place']]['phone'], hotel

# Every referenced image ships in site/ and carries the credit CC BY / BY-SA require.
photos = [p['photo'] for p in trip['places'].values() if 'photo' in p] + [d['cover'] for d in trip['days']]
assert len(photos) == len(trip['places']) + len(trip['days']), 'a place or day has no photo'
for photo in photos:
    for key in ('file', 'thumb'):
        if key in photo:
            assert (HERE / 'site' / photo[key]).is_file(), photo[key]
    assert photo['w'] > 0 and photo['h'] > 0, photo['file']
    assert photo['author'] and photo['license'] and photo['license_url'], photo['file']
    assert photo['source'].startswith('https://commons.wikimedia.org/wiki/File:'), photo['file']
    assert re.match(r'(CC0|Public domain|CC BY(-SA)? [\d.]+)', photo['license']), photo['license']
for day in trip['days']:
    assert day['cover']['alt'], day['date']
precached = set(re.findall(r"'(img/[^']+)'", (HERE / 'site' / 'sw.js').read_text(encoding='utf-8')))
referenced = {photo[k] for photo in photos for k in ('file', 'thumb') if k in photo}
assert precached == referenced, ('sw.js IMAGES out of sync', sorted(precached ^ referenced))

text = json.dumps(trip)
for secret in ('@', 'passport no', 'booking ref'):
    assert secret not in text.lower(), secret

print('OK', sum(len(d['items']) for d in trip['days']), 'items')

# Content for phrases / sunset / checklist: content/ is the source, site/content/ the published copy.
for name in ('phrases.json', 'sunset.json', 'checklist.json'):
    src = (HERE / 'content' / name).read_bytes()
    assert src == (HERE / 'site' / 'content' / name).read_bytes(), f'site/content/{name} differs from content/{name}: copy it'
    assert f"'content/{name}'" in (HERE / 'site' / 'sw.js').read_text(encoding='utf-8'), f'{name} not precached'
phrases = json.loads((HERE / 'content' / 'phrases.json').read_text(encoding='utf-8'))
for group in phrases['groups']:
    for phrase in group['phrases']:
        assert phrase['en'] and phrase['th'] and phrase['zh'], phrase['id']
        assert phrase.get('check') in ('ok', 'review'), ('phrase not back-translated', phrase['id'])
        assert ('{size}' in phrase['zh']) == ('{size}' in phrase['en']), phrase['id']
checklist = json.loads((HERE / 'content' / 'checklist.json').read_text(encoding='utf-8'))
assert all(it['who'] in ('both', 'her', 'him') for it in checklist['items'])
sunset = json.loads((HERE / 'content' / 'sunset.json').read_text(encoding='utf-8'))
assert [d['date'] for d in sunset['places']['chongli']['days']] == dates
print('OK content')
