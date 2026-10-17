# Mückenscout Beta 2

Experimentelle, lokal laufende Web-App zur **Suche nach kleinen bewegten Flugobjekten**, nicht zur zuverlässigen Bestimmung einer Mücken- oder Insektenart.

**App:** https://cola968.github.io/Mueckenscout/

## Funktionen
- Smartphone-Kamera über HTTPS mit Berechtigungsabfrage
- Auswahl von Browser-verfügbaren Videoquellen (auch echter IR-/Nachtsichtkameras, **nur wenn** sie vom Betriebssystem und Browser angeboten werden)
- Dunkle und helle kleine Bewegungsobjekte, Mehrbild-Tracking und Filter für großflächige Bewegung
- Hinweis auf zu dunkle Aufnahmen, zuschaltbare Bildschirmaufhellung (keine echte IR-Funktion)
- Sensitivität, manuelles Foto, Testmodus, optionaler Signalton
- Videoanalyse ausschließlich im Browser; kein Upload

## Wichtige Grenzen
Die App **kann keine Infrarotstrahlung messen**, keine echte IR- oder Wärmebildkamera simulieren und nicht ohne passende Hardware durch Wände oder völlige Dunkelheit sehen. Software-Aufhellung erhöht keine Sensordetails. Die Erkennung basiert auf Bewegung, Helligkeitskontrast und Größe, **nicht** auf einem mit Insektenbildern trainierten/neben realen Mücken validierten neuronalen Netz. Staub, Sensorrauschen und Reflexionen können falsch erkannt werden; unbewegte Mücken können übersehen werden. Treffer sind Hinweise, keine sichere Identifizierung.

Eine zusätzliche IR-Kamera funktioniert nur, falls Android sie Brave als Videoeingang bereitstellt. Kameraquelle wechseln ist kein garantierter USB-IR-Support.

## Lokal testen
```bash
python3 -m http.server 8000
# im Browser: http://localhost:8000/?demo=1
npm test
```
`localhost` funktioniert als sicherer Kontext; auf dem Smartphone HTTPS nutzen.

## Tests
Zehn synthetische Regressionstests prüfen dunkle/helle Flugobjekte, stehende Flecken, Lichtwechsel, große Objekte, einmaliges Rauschen, unterbelichtete Bilder und Reset. **Kein** statistisch belegter Erkennungswert für echte Insekten.
