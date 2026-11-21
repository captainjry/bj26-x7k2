# Features proposal: Beijing trip site

Written 2026-11-21, 16 days before the trip. Pick from the table, then hand the picks to a build session.
Every feature below works offline, needs no backend, keeps the sheet as master, and asks the couple to read no Chinese. Chinese only appears on cards shown to other people, the same way "Show to driver" works now.

## Ranked features

| # | Feature | What it does on the phone | Why it matters on this trip | Effort | Data |
|---|---------|---------------------------|-----------------------------|--------|------|
| 1 | **Show-to-staff phrase cards** | A "Phrases" screen with about 20 one-tap cards. Each has a Thai + English label for them and big Chinese text for the staff. Groups: Food (not spicy, no coriander, "do you have pickled-cabbage fish?"), Toilet, Tickets ("we booked with this passport"), Ski rental (beginner, boot size, snowboard), Help ("please write the price", "photo please"). | They can't read or speak Chinese. Apple Translate works offline but means typing with cold hands and gloves. One tap on a ready card is faster. It reuses the full-screen card the driver feature already has. | 3 h (1 h to code, 2 h to write and check each phrase both ways in Apple Translate) | bundled (`phrases.json`) |
| 2 | **Copy for DiDi / Amap / WeChat** | A "Copy Chinese name" button on every driver card. It copies the place's Chinese name and address, ready to paste into a DiDi destination, an Amap search or a WeChat mini-program search. | Taxis come up 3 to 5 times a day. Showing a card only works with a street taxi. A DiDi or Amap search wants text they can't type, so pasting the bundled Chinese closes that gap. | 0.5 h | bundled (`places.json`, already there) |
| 3 | **"Take me to the next stop"** | On Today, next to "Take me to the hotel", one button opens the driver card for the *Next* stop's place. The Now and Next stops show their note already open. | Notes hold what to do on the day, for example "16:30 take the Peking Chamber queue in WeChat" or "taxis refuse one-way from the Great Wall". Right now they hide behind a tap on a small "Note". This puts the next move one gloved tap away. | 1 h | sheet (existing items and notes) |
| 4 | **SOS screen** | Tap-to-call buttons for police 110, ambulance 120 and fire 119, the Royal Thai Embassy (+86-10-8531-8700, consular 8531-8768) and both hotels' phones. It also has driver cards for "Take me to the nearest hospital" and the embassy address. | They're on a ski trip as beginners, in -10 to -20 °C. Nothing on the site covers "something went wrong" today. China has no 911. Each service has its own number. | 1.5 h | bundled |
| 5 | **"Today: bring & watch" strip** | The top of Today lists what today needs. It shows "Passports" when any of today's notes says passport, a Monday closure warning, the last entry time and today's sunset. | Passports are needed at Tiananmen, Universal, Mutianyu, the Forbidden City and ShuiGuo, and for trains. 7 Dec and 14 Dec are Mondays, so Forbidden City is closed and the Temple of Heaven halls are shut. Sunset is about 16:50, which limits outdoor plans. | 2 h | sheet notes (keyword match) + a bundled 8-day sunset table |
| 6 | **Offline-ready check** | A small status line, "Ready offline ✓", or "Not ready: 12 of 60 photos missing, open with Wi-Fi". It checks the service-worker cache against the precache list. | The whole site depends on being cached before Google and everything else gets blocked. Today the couple has no way to tell whether the cache worked. Check it once at the hotel in Bangkok and they're sure. | 1 h | none |
| 7 | **Before-you-fly setup checklist** | A tick list kept on each phone in localStorage, shown until 7 Dec. It covers: Alipay with a foreign card, DiDi installed, Amap on the S24, Apple Translate Thai⇄Chinese downloaded, eSIM, site opened online, tissue packs, a power bank. | Each of these has to happen *before* landing, while app stores and Google still work. These are app setup steps, not bookings, so the "To book" list stays in the sheet. | 1.5 h | bundled |

There's no #8. The other candidates are in the dropped list below.

## Recommended first 3

1. **Phrase cards (#1).** The site's biggest gap is any talk that isn't a taxi ride: food orders, toilets, ticket gates, ski rental. They will hit one of these many times every day.
2. **Copy for DiDi (#2).** It takes half an hour, and it turns the existing Chinese address data into something DiDi and Amap can use, not only something a driver can read.
3. **Take me to the next stop (#3).** It brings the useful notes forward and means the most common action of the day takes one tap.

These three take about 4.5 hours. SOS (#4, 1.5 h) is the best next one if there's time left.

## Considered and dropped

- **Timed reminders / push notifications.** iPhone home-screen apps can only get notifications pushed from a server. There's no local or scheduled kind, and the site has no backend. #3 and #5 cover it while the app is open.
- **Live weather / air quality.** Needs live data at runtime. Use the phone's weather app. #5 shows sunset from a bundled table.
- **Offline map tiles or a day route map.** Big download, map licensing problems, and Apple Maps and Amap already do this better.
- **Currency converter.** Close to the budget feature that was dropped on purpose, and the phone calculator does it.
- **Toilet finder.** Needs map data that can't be bundled reliably. The "Toilet" phrase card covers asking, and big malls, hotels and sights have seated toilets.
- **Shared notes or live location between the two phones.** Needs a backend. Both phones show the same plan already.
- **Booking countdown (Forbidden City drop on 6 Dec, train sale dates).** Bookings stay in the sheet, by the owner's rule.
- **Thai-language interface.** They read English, and the 2026-11-11 decision keeps labels in English.
- **Tab "B - swap" as a bad-weather plan B.** Possible, since the sheet already has it, but it doubles the data the build reads. Only worth it if she plans to switch days on the trip. Ask her.
- **Android home-screen shortcuts ("Hotel" icon).** Works on the S24 only, not on the iPhone. Low value next to #3.

## Notes for the builder

- Phrase translations: write each one in English, translate it to Chinese, then check it back to Thai in Apple Translate (offline mode) before shipping. Mark any phrase that doesn't come back cleanly.
- The site is public (`noindex`). The SOS screen holds only public numbers: no passport numbers, insurance policy numbers or booking refs.
- Copy uses `navigator.clipboard.writeText`. It needs HTTPS and a tap, and GitHub Pages gives both. It works offline.
- The passport keyword in #5 reads note text, so the train items need "passport" added in her sheet notes to show up.
- No build session opened the live site in a browser. This proposal is based on `site/app.js`, `site/logic.js`, `site/trip.json` and the sheet.

## Sources

- iPhone works between 0 and 35 °C, and cold can shut it down: [Apple Support](https://support.apple.com/118431)
- Royal Thai Embassy Beijing address and numbers: [Thai MFA contact list (PDF)](https://image.mfa.go.th/mfa/0/GH2PYnujXi/เอกสาร/List_of_Royal_Thai_Embassy-contact_point.pdf), [Beijing government embassy list](https://english.beijing.gov.cn/beijinginfo/facts/embassies/202005/t20200513_1895977.html)
- China emergency numbers 110 / 119 / 120: [Beijing government travel tips](https://english.beijing.gov.cn/travellinginbeijing/quickguideontravelservices/traveltips/202108/t20210811_2466839.html), [GOV.UK China getting help](https://gov.uk/foreign-travel-advice/china/getting-help)
- Toilets (squat toilets, carry tissue, seated toilets in hotels and big sights): [Beijing government FAQ](https://english.beijing.gov.cn/contactus/faqs/list/202006/t20200627_1932963.html), [China Educational Tours](https://www.chinaeducationaltours.com/guide/toilets-in-china-travel-tips.htm)
- Web push on iOS needs a server, with no local notifications: [Apple developer docs](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers), [Apple developer forums](https://developer.apple.com/forums/thread/735402)
- Beijing December sunset around 16:50: [timeanddate](https://timeanddate.com/sun/china/beijing?month=12), [WeatherSpark](https://weatherspark.com/m/131055/12/Average-Weather-in-December-in-Beijing-China)
- Apple Translate works offline with downloaded Thai and Chinese: [Wikipedia](https://en.wikipedia.org/wiki/Translate_(Apple)), [App Store](https://apps.apple.com/th/app/translate/id1514844618)
- Comparable apps (offline access, packing checklists, check-in reminders): [Wanderlog](https://wanderlog.com/trip-planner-mobile-app), [Airalo roundup](https://www.airalo.com/blog/best-apps-for-planning-travel)
- Passport, Monday closure and queue facts come from her sheet notes (`site/trip.json`).
