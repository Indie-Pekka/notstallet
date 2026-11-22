# Notstället

Hugos notvisningsapp för iPad: pdf-noter med anteckningar (Apple Pencil), låtlistor i mappar, bläddringspunkter, zoom och metronom.
Allt sparas lokalt på iPaden. Appen fungerar helt offline när den väl är installerad.

**Installera:** öppna https://indie-pekka.github.io/notstallet/ i Safari på iPaden → dela-knappen → *Lägg till på hemskärmen*.

Version 2026.11.22a. Byggd av samma källkod som Claude-artefakten "Notstället". pdf.js (Apache 2.0) ingår, se LICENSE-pdfjs.txt.

## Medlemsläget (medlem/)

Mappen `medlem/` är samma app i medlemsläge (`APP_MODE = 'wix'`). Den visas i en helskärmsruta på popkörernas låtsida
(Enstöring produktion) och får noter, konserternas låtlistor och medlemmens egna anteckningar från hemsidan.
Medlemmen läser och antecknar men kan inte ladda upp, ändra eller ta bort något.

## Bygga

Källan är `bygg/notstallet.html` (artefaktläget). Allt annat byggs från den:

```
node bygg/build-pwa.mjs . <version>             # hemskärmsappen i roten
node bygg/build-pwa.mjs medlem <version> wix    # medlemsläget
```
