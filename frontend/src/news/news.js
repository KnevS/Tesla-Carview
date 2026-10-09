// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
/**
 * Neuigkeiten — was ist neu in DIESER Version.
 *
 * Die Liste wird mit dem Frontend ausgeliefert: Jede Installation zeigt
 * genau die Neuerungen, die sie selbst enthaelt (keine Abfrage bei einem
 * zentralen Server, keine Ankuendigung von Funktionen, die noch nicht
 * installiert sind).
 *
 * Pflege: Jedes Release mit sichtbarer Neuerung bekommt hier einen Eintrag
 * (neueste zuerst) — in allen sieben Sprachen, gleichlautend mit dem
 * Neuigkeiten-Abschnitt der Marketing-Seite (teslaview-web, i18n.js
 * `news*`). `id` = Version, bleibt stabil: an ihr haengt „gelesen".
 * Reine Bugfix-Releases ohne sichtbare Wirkung brauchen keinen Eintrag.
 */
export const NEWS = [
  {
    id: 'v3.61.0', date: '2026-10-09', icon: '📣', path: '/news',
    de: { title: 'Neuigkeiten direkt in der App', body: 'Was mit einem Update neu dazukommt, erscheint jetzt hier und als kurzer Hinweis oben in der App. Ein Klick führt direkt zur neuen Funktion.' },
    en: { title: "What's new, right in the app", body: 'Whatever an update adds now shows up here and as a short notice at the top of the app. One click takes you straight to the new feature.' },
    es: { title: 'Novedades directamente en la app', body: 'Lo que añade cada actualización aparece ahora aquí y como aviso breve en la parte superior de la app. Un clic te lleva directamente a la nueva función.' },
    fr: { title: "Les nouveautés directement dans l'app", body: "Ce qu'apporte une mise à jour s'affiche désormais ici et sous forme de bref message en haut de l'app. Un clic mène directement à la nouvelle fonction." },
    tr: { title: 'Yenilikler doğrudan uygulamada', body: 'Bir güncellemeyle gelen yenilikler artık burada ve uygulamanın üstünde kısa bir bildirim olarak görünür. Tek tıkla yeni işleve gidersin.' },
    el: { title: 'Τα νέα απευθείας στην εφαρμογή', body: 'Ό,τι προσθέτει μια ενημέρωση εμφανίζεται πλέον εδώ και ως σύντομη ειδοποίηση στο πάνω μέρος της εφαρμογής. Με ένα κλικ πας κατευθείαν στη νέα λειτουργία.' },
    uk: { title: 'Новини прямо в застосунку', body: 'Усе, що додає оновлення, тепер з’являється тут і як коротке повідомлення вгорі застосунку. Один клік — і ви одразу в новій функції.' },
  },
  {
    id: 'v3.60.0', date: '2026-10-09', icon: '🏆', path: '/rueckblick',
    de: { title: 'Jahresrückblick', body: 'Dein Fahrzeugjahr in Zahlen: Kilometer, Fahrten, eingespartes CO₂, Laden und Höhepunkte wie die längste und die kälteste Fahrt. Die Jahreskarte lässt sich als Bild speichern oder teilen, sie zeigt nur Zahlen, keine Orte.' },
    en: { title: 'Year in review', body: 'Your driving year in numbers: kilometres, trips, CO₂ saved, charging and highlights such as the longest and the coldest trip. The year card can be saved or shared as an image and shows only numbers, no locations.' },
    es: { title: 'Resumen del año', body: 'Tu año al volante en cifras: kilómetros, trayectos, CO₂ ahorrado, carga y lo más destacado como el trayecto más largo y el más frío. La tarjeta del año se guarda o comparte como imagen y solo muestra cifras, ningún lugar.' },
    fr: { title: "Bilan de l'année", body: "Ton année au volant en chiffres : kilomètres, trajets, CO₂ économisé, recharge et temps forts comme le trajet le plus long et le plus froid. La carte de l'année s'enregistre ou se partage en image et ne montre que des chiffres, aucun lieu." },
    tr: { title: 'Yıl özeti', body: 'Sürüş yılın rakamlarla: kilometre, sürüş, tasarruf edilen CO₂, şarj ve en uzun ve en soğuk sürüş gibi öne çıkanlar. Yıl kartı resim olarak kaydedilip paylaşılabilir; yalnızca rakam gösterir, konum göstermez.' },
    el: { title: 'Ανασκόπηση έτους', body: 'Η οδηγική σου χρονιά σε αριθμούς: χιλιόμετρα, διαδρομές, CO₂ που εξοικονομήθηκε, φόρτιση και κορυφαίες στιγμές όπως η μεγαλύτερη και η πιο κρύα διαδρομή. Η κάρτα του έτους αποθηκεύεται ή κοινοποιείται ως εικόνα και δείχνει μόνο αριθμούς.' },
    uk: { title: 'Підсумки року', body: 'Ваш рік за кермом у цифрах: кілометри, поїздки, заощаджений CO₂, заряджання та найяскравіше, як-от найдовша й найхолодніша поїздка. Картку року можна зберегти або поширити як зображення — лише цифри, без місць.' },
  },
  {
    id: 'v3.59.0', date: '2026-10-09', icon: '🥶', path: '/winter',
    de: { title: 'Winter: was Kälte wirklich kostet', body: 'Verbrauch nach Temperatur gegenüber deinem Wert bei 15–25 °C, Kälte-Aufschlag je Fahrt und die Reichweite der nächsten sieben Tage aus der Wettervorhersage. Bei Frost erinnert die App am Vorabend daran, am Ladekabel vorzuklimatisieren.' },
    en: { title: 'Winter: what cold really costs', body: 'Consumption by temperature compared with your value at 15–25 °C, the cold surcharge per trip and the range for the next seven days from the weather forecast. When it freezes, the app reminds you the evening before to precondition while plugged in.' },
    es: { title: 'Invierno: lo que cuesta el frío', body: 'Consumo según temperatura frente a tu valor a 15–25 °C, recargo por frío en cada trayecto y autonomía de los próximos siete días según la previsión. Con helada, la app te recuerda la víspera preacondicionar con el cable conectado.' },
    fr: { title: 'Hiver : ce que coûte vraiment le froid', body: "Consommation selon la température par rapport à ta valeur à 15–25 °C, surcoût par trajet et autonomie des sept prochains jours d'après la prévision. En cas de gel, l'app te rappelle la veille de préconditionner branché." },
    tr: { title: 'Kış: soğuğun gerçek maliyeti', body: '15–25 °C’deki değerine göre sıcaklığa bağlı tüketim, sürüş başına soğuk ek tüketimi ve hava tahmininden önümüzdeki yedi günün menzili. Ayazda uygulama akşamdan şarj kablosu takılıyken ön klimatizasyonu hatırlatır.' },
    el: { title: 'Χειμώνας: τι κοστίζει πραγματικά το κρύο', body: 'Κατανάλωση ανά θερμοκρασία σε σύγκριση με την τιμή σου στους 15–25 °C, επιβάρυνση ψύχους ανά διαδρομή και αυτονομία των επόμενων επτά ημερών από την πρόγνωση. Σε παγετό η εφαρμογή σού θυμίζει το προηγούμενο βράδυ να κάνεις προετοιμασία με το καλώδιο συνδεδεμένο.' },
    uk: { title: 'Зима: скільки насправді коштує холод', body: 'Споживання за температурою порівняно з вашим значенням при 15–25 °C, надбавка за холод для кожної поїздки та запас ходу на сім днів за прогнозом. У мороз застосунок напередодні нагадає прогріти авто з підключеним кабелем.' },
  },
  {
    id: 'v3.58.0', date: '2026-10-09', icon: '🕵️', path: '/sleep',
    de: { title: 'Schlaf-Detektiv', body: 'Warum schläft mein Auto nicht? Der Schlaf-Monitor zeigt jetzt, wie lange dein Auto im Stand wach war, was das an Akku und Geld kostet, und gibt Hinweise auf die Ursache, etwa Wächter-Modus oder eine App, die das Auto immer wieder weckt.' },
    en: { title: 'Sleep detective', body: "Why won't my car sleep? The sleep monitor now shows how long your car was awake while parked, what that costs in battery and money, and hints at the cause, such as Sentry Mode or an app that keeps waking the car." },
    es: { title: 'Detective del sueño', body: '¿Por qué no duerme mi coche? El monitor de sueño muestra ahora cuánto tiempo estuvo despierto tu coche aparcado, cuánto cuesta en batería y dinero, y da pistas sobre la causa, como el modo Centinela o una app que lo despierta una y otra vez.' },
    fr: { title: 'Détective du sommeil', body: "Pourquoi ma voiture ne dort-elle pas ? Le moniteur de sommeil montre désormais combien de temps ta voiture est restée éveillée à l'arrêt, ce que cela coûte en batterie et en argent, et donne des pistes sur la cause, comme le mode Sentinelle ou une app qui la réveille sans cesse." },
    tr: { title: 'Uyku dedektifi', body: 'Arabam neden uyumuyor? Uyku monitörü artık aracın park hâlinde ne kadar uyanık kaldığını, bunun batarya ve para olarak maliyetini gösterir ve Nöbetçi Modu ya da aracı sürekli uyandıran bir uygulama gibi nedenlere dair ipuçları verir.' },
    el: { title: 'Ντετέκτιβ ύπνου', body: 'Γιατί δεν κοιμάται το αυτοκίνητό μου; Η παρακολούθηση ύπνου δείχνει πλέον πόσο ήταν ξύπνιο το αυτοκίνητο σε στάθμευση, τι κοστίζει σε μπαταρία και χρήματα, και δίνει ενδείξεις για την αιτία, όπως η λειτουργία Sentry ή μια εφαρμογή που το ξυπνά ξανά και ξανά.' },
    uk: { title: 'Детектив сну', body: 'Чому моє авто не спить? Монітор сну тепер показує, скільки часу авто не спало на стоянці, скільки це коштує в заряді й грошах, і підказує причину — наприклад, режим «Вартовий» або застосунок, що раз у раз будить авто.' },
  },
  {
    id: 'v3.57.4', date: '2026-10-08', icon: '⚡', path: '/trips',
    de: { title: 'Verbrauch auch für kurze Fahrten', body: 'Kurze Fahrten von wenigen Kilometern bekommen jetzt einen Verbrauchswert, weil der Ladestand genauer gespeichert wird. Außerdem öffnet sich eine Ansicht nach einem Update sofort, ohne die Seite neu laden zu müssen.' },
    en: { title: 'Consumption for short trips too', body: 'Short trips of a few kilometres now get a consumption value because the state of charge is stored more precisely. Also, a view opens right away after an update without reloading the page.' },
    es: { title: 'Consumo también en trayectos cortos', body: 'Los trayectos cortos de pocos kilómetros reciben ahora un valor de consumo porque el nivel de carga se guarda con más precisión. Además, tras una actualización las vistas se abren al momento, sin recargar la página.' },
    fr: { title: 'La consommation aussi pour les petits trajets', body: "Les trajets de quelques kilomètres reçoivent désormais une consommation, car le niveau de charge est enregistré plus précisément. De plus, après une mise à jour, une vue s'ouvre aussitôt sans recharger la page." },
    tr: { title: 'Kısa sürüşlerde de tüketim', body: 'Şarj seviyesi daha hassas kaydedildiği için birkaç kilometrelik kısa sürüşler artık bir tüketim değeri alıyor. Ayrıca bir güncellemeden sonra görünümler sayfayı yenilemeden hemen açılıyor.' },
    el: { title: 'Κατανάλωση και για σύντομες διαδρομές', body: 'Οι σύντομες διαδρομές λίγων χιλιομέτρων λαμβάνουν πλέον τιμή κατανάλωσης, επειδή η στάθμη φόρτισης αποθηκεύεται με μεγαλύτερη ακρίβεια. Επιπλέον, μετά από ενημέρωση οι προβολές ανοίγουν αμέσως χωρίς ανανέωση της σελίδας.' },
    uk: { title: 'Споживання й для коротких поїздок', body: 'Короткі поїздки на кілька кілометрів тепер отримують значення споживання, бо рівень заряду зберігається точніше. Також після оновлення розділи відкриваються одразу, без перезавантаження сторінки.' },
  },
];

/** Eintrag in der Sprache `lang`, Rueckfall Englisch, dann Deutsch. */
export function localizedNews(lang) {
  return NEWS.map(n => ({ ...n, ...(n[lang] ?? n.en ?? n.de) }));
}

/**
 * Ungelesene Eintraege seit `seenId`. Ohne gespeicherten Stand (neuer
 * Nutzer oder erstes Update mit News) zaehlt nur der neueste Eintrag —
 * sonst begruesst die App mit einer Liste alter Neuerungen.
 */
export function unreadNews(seenId) {
  if (!seenId) return NEWS.slice(0, 1);
  const i = NEWS.findIndex(n => n.id === seenId);
  return i === -1 ? NEWS.slice(0, 1) : NEWS.slice(0, i);
}
