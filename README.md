# SkyFreedom

Lokalny demonstrator: obraz z drona → zgłoszenie → decyzja dowódcy → alert dla jednostki terenowej.

## Uruchomienie

W folderze projektu uruchom `python -m http.server 8766` i otwórz `http://127.0.0.1:8766/`. To statyczny HTML, CSS i JavaScript. Nie potrzeba konta, backendu ani klucza do mapy. Obrazy i mapa są zapisane lokalnie w `assets/`. Fonty Google mają systemowe zamienniki.

## Pokaz

1. Wybierz operatora. Uruchom lot, wypróbuj RGB i symulowany tryb termiczny, przybliż obraz, a następnie zgłoś zdarzenie.
2. Dowódca widzi trzy obrazy z dronów. Wybór obrazu zmienia zestaw odczytów: temperatura, wilgotność, dym, hałas i bateria. Potwierdź zdarzenie i przekaż alert.
3. Jednostka terenowa widzi alert, obraz przeszkody i wskazówkę objazdu na mapie.
4. Wróć do dowódcy, zamknij zdarzenie i wybierz Reset.

Mapa satelitarna ma przybliżanie, przesuwanie i filtry warstw. Można też zasymulować ograniczenie przestrzeni oraz rozwinąć historię operacji.

## Granice demonstratora

Wszystkie obrazy są wygenerowanymi ilustracjami fikcyjnego miejsca. Obraz kamery, tryb termiczny, odczyty, pozycje i alarmy są symulowane. Aplikacja nie pobiera kafli mapowych, nie łączy się z dronem ani służbami i nie zastępuje procedur lotniczych.

`PRODUCT.md` opisuje założenia produktu, `DESIGN.md` reguły interfejsu, `UX_RESEARCH.md` hipotezy UX, `COPY.md` język komunikatów, a `ASSETS.md` pochodzenie obrazów. Kopia poprzedniej wersji: `backups/skyfreedom-before-camera-ui.zip`.
