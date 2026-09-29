# SkyFreedom — kierunek interfejsu

## Zasada

Obraz prowadzi do działania. Operator najpierw widzi kamerę i przyciski lotu/zgłoszenia. Dowódca widzi trzy kamery oraz odczyty wybranego drona. Jednostka otrzymuje konkretny alert i mapę. Krótkie etykiety służą decyzji, a dłuższe wyjaśnienia pozostają w formularzu i historii.

## Wizualność

- Jasne tło `#ECF1EF`, białe powierzchnie, atrament `#152D33`, morski `#0F665F` dla działań, ceglasty `#BA492A` dla zagrożeń.
- DM Sans dla interfejsu, Manrope dla nagłówków i pomiarów.
- Realistyczne, wygenerowane obrazy fikcyjnego sektora są głównym nośnikiem treści. Mapa satelitarna ma proste warstwy: drony, jednostkę, trasę i zdarzenie. Bez widoku 3D.
- Podgląd kamery ma skromny HUD, zoom i symulowaną paletę termiczną. Dowódca widzi wszystkie trzy kamery jednocześnie; wybór podglądu aktualizuje czujniki i znacznik na mapie.
- Statusy mają słowa, liczby i kolor. Wartości demonstracyjne są oznaczone jako symulowane.

## Ruch i dostępność

- Lot przesuwa znacznik i animuje trasę oraz kamerę; zgłoszenie i zmiana stanu otrzymują krótkie potwierdzenie. `prefers-reduced-motion` wyłącza ruch ozdobny.
- Każde główne działanie ma co najmniej 44 px wysokości. Mapa reaguje na mysz i dotyk, lecz ma też przyciski przybliżania dostępne z klawiatury.
- Widok roli, zgłoszenie, dowódca, jednostka, historia i reset zachowują czytelną kolejność przy 375, 768, 1024 i 1440 px.

## Kontekst

Kierunek rozwija wybraną wcześniej „Kartę przekazania”: ten sam przepływ decyzji i jasny system, z mocniejszym pierwszeństwem obrazu oraz kamer. Fikcyjny sektor i obrazy nie przedstawiają prawdziwej operacji.
