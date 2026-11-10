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

text = json.dumps(trip)
for secret in ('@', 'passport no', 'booking ref'):
    assert secret not in text.lower(), secret

print('OK', sum(len(d['items']) for d in trip['days']), 'items')
